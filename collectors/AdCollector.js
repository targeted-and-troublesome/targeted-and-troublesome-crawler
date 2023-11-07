const BaseCollector = require('./BaseCollector');
const fs = require('fs');
const path = require('path');
const {createTimer} = require('../helpers/timer');
const puppeteer = require('puppeteer');
const easylist = require('../helpers/easylist_selectors');
const pageUtils = require('../helpers/utils');
const isShownSrc = fs.readFileSync('./helpers/isShown.js', 'utf8');
const dismissDialogSrc = fs.readFileSync('./helpers/dismissDialog.js', 'utf8');
const {scrollPageToBottom, scrollPageToTop} = require('puppeteer-autoscroll-down');
const MAX_ADS_SCRAPED_PER_PAGE = 10;
const MIN_PX_TO_TAKE_SS = 30;
const ENABLE_SCROLLING = true;
const ENABLE_CLICKING_TO_ADS = false;
const AD_DISC_LINKS_TO_COLLECT = ["See more ads by this advertiser", "Report this ad"];
const EXCLUDED_ADSHOTS_SUBDIR = 'excluded_adshots';
const ADSHOTS_SUBDIR = 'adshots';
const AD_DISCLOSURES_SUBDIR = 'ad_disclosures';
const LANDING_ADS_SUBDIR = 'landing_ads';
const COLOR_PURPLE = 'purple';
const COLOR_RED = 'red';

// Ad collector is partly based on https://github.com/UWCSESecurityLab/adscraper
class AdCollector extends BaseCollector {

    id() {
        return 'ads';
    }

    /**
     * @param {import('./BaseCollector').CollectorInitOptions} options
     */
    init({
        log, urlHash, outputPath, emulateMobile
    }) {
        this._ssCounter = 0;
        this._htmlCounter = 0;
        this._errCounter = 0;
        this._finalURL = '';
        this._log = log;
        this._urlHash = urlHash;
        this._outputPath = outputPath;
        this._clickedAd = false;
        this._emulateMobile = emulateMobile;
        this._visitedAdUrls = [];
        this._adDisclosuresContents = [];
        this._clickedAdTexts = [];
        this._adDisclosureLinks = [];
        this._adAttrs = [];
        this._unmatchedAdDiscContents = [];
        this._nClickedAdChoicesLinks = 0;
        this._adChoicesLinkAttrs = [];
        this._timeStampBeforeInteraction = 0;
        // create a folder for ad images
        fs.mkdirSync(path.join(outputPath, 'ad_imgs'), {recursive: true});
        fs.mkdirSync(path.join(outputPath, 'ad_videos'), {recursive: true});
        if (ENABLE_CLICKING_TO_ADS) {
            fs.mkdirSync(path.join(outputPath, LANDING_ADS_SUBDIR), {recursive: true});
        }
        fs.mkdirSync(path.join(outputPath, AD_DISCLOSURES_SUBDIR), {recursive: true});
        fs.mkdirSync(path.join(outputPath, ADSHOTS_SUBDIR), {recursive: true});
        fs.mkdirSync(path.join(outputPath, EXCLUDED_ADSHOTS_SUBDIR), {recursive: true});
    }

    /**
    * @param {{cdpClient: import('puppeteer').CDPSession, page: any, type: import('puppeteer').TargetType}} targetInfo
    */
    async addTarget({page, type}) {
        if (page && type === 'page') {
            try {
                // inject isShown.js and dismissDialog.js to the page
                await page.evaluateOnNewDocument(isShownSrc);
                await page.evaluateOnNewDocument(dismissDialogSrc);
            } catch (error) {
                this._log(`AdCollector: Error while adding target: ${error}`);
            }
        }
    }

    /**
     * @param {number} maxValue
     */
    getRandomUpTo(maxValue) {
        return Math.floor(Math.random() * maxValue);
    }

    printAdAttrs(adAttrs) {
        // return a string of ad attributes, excluding outerHTML, borderStyle
        let {outerHTML, borderStyle, ...rest} = adAttrs;
        return JSON.stringify(rest);
    }

    /**
     * @param {puppeteer.Page} page
     * @param {string} ssSuffix
     * @param {string} outFolder
     * @param {boolean} fullPage
     */
    async takeScreenshot(page, ssSuffix, outFolder="", fullPage=true) {
        const DISABLE_FULL_SCREENSHOT = true;  // fullscreen screenshots substantially slows down the process
        const outPath = path.join(this._outputPath, outFolder);
        if (DISABLE_FULL_SCREENSHOT && fullPage) fullPage = false;
        await pageUtils.takeScreenshot(page, outPath, this._urlHash, ssSuffix, this._ssCounter, this._log, fullPage);
        this._ssCounter++;
    }

    /**
     * @param {puppeteer.Page} page
     * @param {string} ssSuffix
     * @param {string} outFolder
     * @param {boolean} fullPage
     */
    async saveHTML(page, ssSuffix, outFolder="", fullPage=true) {
        const outPath = path.join(this._outputPath, outFolder);
        await pageUtils.saveHTML(page, outPath, this._urlHash, ssSuffix, this._htmlCounter++, this._log);
    }

    /**
     * @param {puppeteer.Page} page
     * @param {puppeteer.JSHandle<unknown>} element
     * @param {string} ssSuffix
     * @param {{ x: number; y: number; width: number; height: number; }} boundingBox
     */
    async takeScreenshotOfElement(page, element, ssSuffix, boundingBox, outFolder="", disableScrollDebug=false) {
        const outPath = path.join(this._outputPath, outFolder);
        return await pageUtils.takeScreenshotOfElement(
            page, element, outPath, this._urlHash, this._ssCounter++, ssSuffix, this._log,
                boundingBox, disableScrollDebug);
    }

    /**
     * @param {any[]} adsAttrs
     */
    matchAdChoiceLink(adsAttrs) {
        // Match the clicked ad choice link with the ad disclosure page
        let adDisclosureUrlFound = false;
        for (const adDisclosureContent of this._adDisclosuresContents) {
            adDisclosureUrlFound = false;
            for (const adAttrs of adsAttrs) {
                if (adAttrs.clickedAdChoiceLink === adDisclosureContent.adDiscUrl) {
                    adDisclosureUrlFound = true;
                    adAttrs.adDisclosureOutLinks = adDisclosureContent.adDisclosureOutLinks;
                    adAttrs.adDisclosureText = adDisclosureContent.pageText;
                    adAttrs.adDisclosurePageUrl = adDisclosureContent.pageUrl;
                    break;
                }
            }
            if (!adDisclosureUrlFound) {
                this._unmatchedAdDiscContents.push(adDisclosureContent);
            }
        }
        const nUnmatched = this._unmatchedAdDiscContents.length;
        const nDisclosures = this._adDisclosuresContents.length;
        const nMatched = nDisclosures - nUnmatched;
        const sign = nUnmatched ? '❌' : '✅';
        if (nDisclosures){
            this._log(`${sign} AdCollector: matched ad disclosures: ${nMatched} of ${nDisclosures}`)
        }
        return {nMatched, nUnmatched};
    }

    /**
     * @param {puppeteer.Page} page
     * @param {URL} url
     * @param {string} outputPath
     * @param {string} urlHash
     * @param {puppeteer.BrowserContext} context
     */
    async addListener(page, url, outputPath, urlHash, context) {
        const AD_DISCLOSURE_LINKS = [
            "adssettings.google.com",
            "privacy.us.criteo.com",
            "privacy.eu.criteo.com"
        ];
        if(page.isClosed()) {
            return;
        }
        await page.waitForTimeout(2000);  // wait for the page body to load
        const pageUrl = page.url();
        let googAdDiscFullUrl;  // full url of the Google ad disclosure link we clicked
        // after we click the Google ad disclosure link, the page url changes to
        // https://adssettings.google.com
        // we use a page variable to extract the full url of the link we clicked
        // get the hostname of the page
        const pageHostname = new URL(pageUrl).hostname;
        this._log('✅ Captured ad disclosure page/ad opened in a new tab:', pageUrl.slice(0, 100));
        try {
            const pageText = await page.evaluate(() => window.document?.body?.innerText);
            // if page hostname contains one of the following, then it is an adchoice page
            if (AD_DISCLOSURE_LINKS.some(link => pageHostname.includes(link))){
                await this.takeScreenshot(page, 'ad_disclosure_page', AD_DISCLOSURES_SUBDIR);
                const adDisclosureOutLinks = await this.getAdDisclosureOutLinks(page);
                if (pageHostname.includes("adssettings.google.com")) {
                    try {
                        // The `AF_dataServiceRequests["ds:0"].request[5]` variable holds
                        // the full url of the ad disclosure link we clicked
                        // variable holds the full url of the ad disclosure link we clicked
                        googAdDiscFullUrl = await page.evaluate(() => AF_dataServiceRequests["ds:0"]?.request[5]);
                    } catch (error) {
                        this._log(`AdCollector: Error while getting AF_dataServiceRequests: ${error}`);
                    }
                }
                const adDiscUrl = googAdDiscFullUrl || pageUrl;
                // this._adDisclosureLinks.push({pageUrl, adDiscUrl, adDisclosureLinks});
                this._adDisclosuresContents.push({pageUrl, pageText, adDiscUrl, adDisclosureOutLinks});

            } else {
                if (this._clickedAd) {
                    this._log(`Clicked ad landing page: ${pageUrl}`);
                    await this.takeScreenshot(page, 'landing_ad_ss', LANDING_ADS_SUBDIR);
                    await this.saveHTML(page, 'landing_ad_html', LANDING_ADS_SUBDIR);
                }
            }
            await pageUtils.bringMainPageFront(context);
        } catch (error) {
            this._log(`AdCollector: Error while scraping the ad (disclosure) page: ${error}`);
        }
    }

    /**
     * @param {puppeteer.Page} page
     */
    async getAdDisclosureOutLinks(page) {
        const adDisclosureLinks =  await page.evaluate((selectors) => {
            /**
             * @type {{text: string, href: string}[]}
             */
            const linksArray = [];
            const links = document.querySelectorAll('a');
            links.forEach(link => {
                const linkText = link.innerText.trim();
                const linkHref = link.getAttribute('href');
                if (selectors.includes(linkText) && linkHref !== null) {
                    linksArray.push({
                        text: linkText,
                        href: linkHref
                    });
                }
            });
            return linksArray;
        }, AD_DISC_LINKS_TO_COLLECT);
        return adDisclosureLinks;
    }

    /**
     * @param {puppeteer.Page} page
     * @param {string[]} selectors
     */
    async applyFilterRules(page, selectors) {
        return await page.evaluateHandle(selectors => {
            // Add visible elements detected by EL to a set.
            let ads = new Set();
            selectors.forEach((/** @type {string} */ selector) => {
                let matches = document.querySelectorAll(selector);
                matches.forEach(match => {
                    if (isShown(match)) {  // we check if the element is visible
                        ads.add(match);
                    }
                });
            });
            // Remove all elements that are children of another element in the set.
            // We just want the top-most element identified as an ad.
            for (let ad of ads) {
                // For each element in the set, traverse up until it hits <body>, or another
                // element in the set.
                let removed = false;
                let current = ad;
                while (current !== document.body && current.parentNode !== null) {
                    current = current.parentNode;
                    for (let otherAd of ads) {
                        if (current === otherAd) {
                            ads.delete(ad);
                            removed = true;
                            break;
                        }
                    }
                    if (removed) {
                        break;
                    }
                }
            }
            return Array.from(ads);
        }, selectors);
    }

    /**
     * @param {puppeteer.Page} page
     * @param {(arg0: string) => void} log
     */
    async getAllAdAttrsWHandles(page, log) {
        /**
         * Based on: https://github.com/UWCSESecurityLab/adscraper
         * Use EasyList (EL) "General hiding rules" to find elements
         * likely to contain ads.
         * EL: https://easylist.to/easylist/easylist.txt
         */
        const easylistCheckerTimer = createTimer();
        const adsAttrWHandle = [];
        const combinedSelectors = easylist.concat([
            '.ob-widget',
            '[id^="rc_widget"]',
        ]);
        try {
            const ads = await this.applyFilterRules(page, combinedSelectors);
            const numAds = await ads.evaluate((/** @type {string | any[]} */ ads) => ads.length);

            for (let i = 0; i < numAds; i++) {
                const ad = await ads.evaluateHandle((/** @type {{ [x: string]: any; }} */ ads, /** @type {string | number} */ idx) => ads[idx], i);
                const attrs = await pageUtils.getElementAttrs(ad, log);
                adsAttrWHandle.push({attrs, handle: ad});
                await ad.evaluateHandle((/** @type {{ style: { border: string; }; }} */ ad) => {
                    ad.style.border = '5px solid red';
                });
            }
            log(`🔥 Detected ${numAds} ads by EasyList (⏱️ took ${easylistCheckerTimer.getElapsedTime()}s)`);
        } catch (error) {
            log(`Error while getting easylist ad elements: ${pageUtils.removeNewLineChars(error.message)}`);
        }
        return adsAttrWHandle;
    }

    /**
     * @param {puppeteer.ElementHandle} ad
     */
    async addBorderToAd(ad, color=COLOR_RED){
        await ad.evaluateHandle((/** @type {{ style: { border: string; }; }} */ ad, color) => {
            ad.style.border = `5px solid ${color}`;
        }, color);
    }

    /**
     * @param {puppeteer.ElementHandle} ad
     * @param {string} origBorderStyle
     */
    async removeBorderFromAd(ad, origBorderStyle){
        // assign the original border style back to the ad
        await ad.evaluateHandle((/** @type {{ style: { border: string; }; }} */ ad, borderStyle) => {
            ad.style.border = borderStyle;
        }, origBorderStyle);
    }

    /**
     * @param {{width: number, height: number}} currAdBBox
     * @param {{width: number, height: number}} prevAdAttrs
     * @param {{ (arg0: string): void; (arg0: string): void; }} log
     */
    async compareAdDimensions(currAdBBox, prevAdAttrs, log) {
        // update ad dimensions if it's resized after scrolling
        const UPDATE_AD_DIMENSIONS_ON_SCROLL = true;
        const currWidth = currAdBBox.width;
        const currHeight = currAdBBox.height;
        if ((currWidth !== prevAdAttrs.width) ||
                (currHeight !== prevAdAttrs.height)) {
            if (UPDATE_AD_DIMENSIONS_ON_SCROLL) {
                // rome-ignore lint/style/useTemplate: <explanation>
                log("Ad dimensions changed after scroll. Will update: " +
                    `(w: ${currWidth} vs ${prevAdAttrs.width},` +
                    ` h: ${currHeight} vs ${prevAdAttrs.height})`);
                // update the initial ad attributes
                prevAdAttrs.width = currWidth;
                prevAdAttrs.height = currHeight;
            }
        }
    }

    /**
     * @param {any} adLinksAndImages
     */
    removeUnneededAttrs(adLinksAndImages) {
        // remove handles and adChoicesLinksHandles from adLinksAndImages
        // they can't be serialized and we don't need them
        for (const adLinksAndImagesPerFrame of adLinksAndImages) {
            adLinksAndImagesPerFrame.frameHandle = undefined;
            adLinksAndImagesPerFrame.adChoicesLinksHandles = undefined;
        }
    }

    /**
     * @param {{}} adLinksAndImages
     * @param {{ (arg0: string): void; (arg0: string): void; }} log
     * @param {puppeteer.Page} page
     */
    async clickAdchoiceLinkInAd(adLinksAndImages, log, page) {
        for (const adLinksAndImagesPerFrame of adLinksAndImages) {  // for each frame in the ad
            // for each adChoices link in the frame
            for (const adChoicesLinksHandle of adLinksAndImagesPerFrame.adChoicesLinksHandles) {
                // get the href from the element handle, also serves as a sanity check
                let href;
                try {
                    href = await adChoicesLinksHandle.evaluate((/** @type {HTMLAnchorElement} */ el) => el.href);
                } catch (error) {
                    log(`Error while getting href from adChoicesLinksHandle: ${pageUtils.removeNewLineChars(error.message)}`);
                    continue;
                }
                if (!href) {
                    continue;
                }
                const elementFrame = adLinksAndImagesPerFrame.frameHandle || page;
                const successfullyClicked = await pageUtils.openAdChoiceLink(href, adChoicesLinksHandle, elementFrame, log);
                if (successfullyClicked) {
                    this._nClickedAdChoicesLinks++;
                    return href;
                }
            }
        }
        return "";
    }

    /**
     * @param {puppeteer.ElementHandle<Element>} adHandle
     * @param {{ (arg0: string): void; (arg0: string): void; (arg0: string): void; }} log
     */
    async scrollToAd(adHandle, log){
        // based on https://github.com/UWCSESecurityLab/adscraper
        await pageUtils.scrollToElement(adHandle, log);
        // log('Will wait for 2 seconds before scrolling to ad again');
        await pageUtils.sleep(2000);
        // log('Scrolling to ad again');
        await pageUtils.scrollToElement(adHandle, log);
        // log('Will wait for 0.4 seconds before scraping ad');
        await pageUtils.sleep(400);
    }

    /**
     * @param {puppeteer.Page} page
     */
    async scrapeAds(page) {
        const adDetails = [];
        const log = this._log;
        let lastAd = null;
        let nSmallAds = 0;
        let nEmptyAds = 0;
        let nRemovedAds = 0;

        const nDetectedAds = this._adsWHandles.length;
        this.takeScreenshot(page, 'before_scraping');
        // pageUtils.takeScreenshot(page, this._outputPath, this._urlHash, 'before_scraping',this._ssCounter++, log, true);
        for(let i = 0; i < nDetectedAds; i++) {
            // ad is an object with `attrs` and `handle` (puppeteer.ElementHandle)
            const ad = this._adsWHandles[i];
            ad.attrs.index = i;
            log(`Will scrape ad: ${this.printAdAttrs(ad.attrs)}`);
            if(ENABLE_SCROLLING) {
                log('Scrolling to ad');
                await this.scrollToAd(ad.handle, log);
                // scroll down 150px more (>> usual sticky footer ad height)
                // to make sure the ad is fully visible
                // Otherwise, the ad may be partially covered by a sticky footer ad
                await page.evaluate(() => window.scrollBy(0, 150));
            }
            // remove the border before taking the screenshot
            await this.removeBorderFromAd(ad.handle, ad.attrs.borderStyle);
            // sleep 1s for page to update
            await page.waitForTimeout(1000);
            const adBBox = await ad.handle?.boundingBox();
            if (!adBBox) {
                log(`❌ Scraper: Ad ${i} boundingBox is null. WILL EXCLUDE. ${this.printAdAttrs(ad.attrs)}`);
                nRemovedAds++;
                continue;
            }
            if ((adBBox.width < MIN_PX_TO_TAKE_SS) || (adBBox.height < MIN_PX_TO_TAKE_SS)) {
                log(`❌ Scraper: Ad ${i} is too small. WILL EXCLUDE (w: ${adBBox.width}, h: ${adBBox.height}).\
                     ${this.printAdAttrs(ad.attrs)}`);
                nSmallAds++;
                continue;
            }
            await this.compareAdDimensions(adBBox, ad.attrs, log);
            log(`Scraper: Will extract links and images from ad ${i}`);
            const adLinksAndImages = await pageUtils.findLinksInElement(
                ad.handle, ad.attrs.index, log, this._outputPath, this._urlHash, this._finalURL, this._emulateMobile)
            // check if any of the frames contain images or links
            if (! adLinksAndImages.some((adLinksAndImagesPerFrame) => adLinksAndImagesPerFrame.containsImgsOrLinks)) {
                log(`❌ Scraper: No links or images found in ad ${i}. WILL EXCLUDE! ${this.printAdAttrs(ad.attrs)}`);
                await this.takeScreenshotOfElement(page, ad.handle, `EXCLUDED_AD_${i}`, adBBox, EXCLUDED_ADSHOTS_SUBDIR, true)
                await this.addBorderToAd(ad.handle, COLOR_PURPLE);
                nEmptyAds++;
                continue;
            }
            lastAd = ad;
            const ssName = await this.takeScreenshotOfElement(page, ad.handle, `adshot_${i}`, adBBox, ADSHOTS_SUBDIR)
            ad.attrs.screenshot = ssName;
            await this.addBorderToAd(ad.handle);

            log('Will detect and click an ad choice icon');
            const clickedAdChoiceLink = await this.clickAdchoiceLinkInAd(adLinksAndImages, log, page);
            ad.attrs.clickedAdChoiceLink = clickedAdChoiceLink;

            this.removeUnneededAttrs(adLinksAndImages);
            adDetails.push({
                ...ad.attrs,
                clickedAdChoiceLink,
                adLinksAndImages,
            });
            if (adDetails.length >= MAX_ADS_SCRAPED_PER_PAGE) {
                log(`Reached max number of ads to scrape: ${adDetails.length} of ${this._adsWHandles.length} ads`);
                break;
            }
        }
        this.takeScreenshot(page, 'after_scraping');
        const scrapeResults = {
            nDetectedAds,
            nAdsScraped: adDetails.length,
            nSmallAds,
            nEmptyAds,
            nRemovedAds,
        };
        return {adDetails, scrapeResults};
    }

    /**
     * @param {{adURLs: any[];adHandles: any[];}} adLinksWHandles
     * @param {any} log
     * @param {any} page
     * @param {any} browser
     */
    async clickAds(adLinksWHandles, log, page, browser) {
        log("Will wait for 5 seconds before clicking on ads");
        page.waitForTimeout(5000);
        log("Will click on ads");
        const visitedHosts = new Set();
        for (const adURL of adLinksWHandles.adURLs) {
            try {
                const adHostname = new URL(adURL).hostname;
                if (visitedHosts.has(adHostname)) {
                    log(`Ad clicker: Ad URL host ${adURL} has already been visited. Skipping...`);
                    continue;
                }
                log(`Will load the ad landing page: ${adURL}...`);
                const page = await browser.newPage();
                await page.setViewport({width: 1920, height: 1080});
                await page.goto(adURL, {waitUntil: 'networkidle2'});
                this._clickedAd = true;
                this._visitedAdUrls.push(adURL);
                // add host to visited hosts
                visitedHosts.add(adHostname);
            } catch (error) {
                log(`❌ Scraper: Error while clicking on ad: ${error}`);
            }
        }

        const ENABLE_CLICKING_TO_ADS_VIA_AD_HANDLES = false;
        if (ENABLE_CLICKING_TO_ADS_VIA_AD_HANDLES) {
            for (const adHandle of adLinksWHandles.adHandles) {
                try {
                    log("Will click on the ad:...");
                    await adHandle.click();
                } catch (error) {
                    log(`❌ Scraper: Error while clicking on ad: ${error}`);
                }
            }
        }
        log('Will wait for 5 second after clicking ads');
        await page.waitForTimeout(5000);
    }

    /**
     * @param {puppeteer.Page} page
     */
    async scrollToBottomAndUp(page) {
        await scrollPageToBottom(page, {
            size: 500 + this.getRandomUpTo(100),
            delay: 500 + this.getRandomUpTo(100),
            stepsLimit: 10
        });
        await page.waitForTimeout(1000);
        await scrollPageToTop(page, {
            size: 500 + this.getRandomUpTo(100),
            delay: 150 + this.getRandomUpTo(100),
            stepsLimit: 10
        });
    }

    /**
     * @param {{ finalUrl: any; urlFilter?: any; page?: any; outputPath?: any; urlHash: string, context: any}} options
     */
    async getData(options) {
        this._timeStampBeforeInteraction = Date.now();
        const page = options.page;
        await this.takeScreenshot(page, 'before_dismiss_dialog', '', false);
        const nDismissedDialogs = await pageUtils.dismissDialogs(page);
        this._log(`Dismissed ${nDismissedDialogs} dialogs.`);
        await page.waitForTimeout(1000);
        await this.takeScreenshot(page, 'after_dismiss_dialog', '', false);
        await this.scrollToBottomAndUp(page);
        await this.takeScreenshot(page, 'after_scroll');

        // run the ad detection script
        this._adsWHandles = await this.getAllAdAttrsWHandles(page, this._log);

        if (this._adsWHandles.length === 0) {
            this._log('No ads found on the page');
            return {adAttrs: [], unmatchedAdDisclosureContents: []};
        }

        // Sort the ads by their Y position on the page in ascending order
        // log before and after sorting. Print attrs.boundingBox.y
        this._adsWHandles.sort((a, b) => a.attrs.y - b.attrs.y);
        // Scrape the ads
        const {adDetails, scrapeResults} = await this.scrapeAds(page);
        if(ENABLE_CLICKING_TO_ADS) {
            const adURLs = pageUtils.getAdLinksFromAdDetails(adDetails);
            const adHandles = this._adsWHandles.map(ad => ad.handle);
            this._log(`Will click on ${adURLs.length} ads and ${adHandles.length} ad handles.`);
            await this.clickAds({adURLs, adHandles}, this._log, page, options.context);
        }
        // we capture the ad disclosure new tabs in the background
        // we should wait to avoid missing slow disclosure pages
        this._log('Waiting for 5 seconds after interacting with ads');
        await page.waitForTimeout(5000);

        const {nMatched, nUnmatched} = this.matchAdChoiceLink(adDetails);
        scrapeResults.nAdDisclosureMatched = nMatched;
        scrapeResults.nAdDisclosureUnmatched = nUnmatched;
        scrapeResults.nClickedAdChoices = this._nClickedAdChoicesLinks;

        if (adDetails.length > 0) {
            this._log(`✅✅ Detected ${this._adsWHandles.length} ads. Scraped: ${adDetails.length}. ` +
                        `Clicked: ${this._nClickedAdChoicesLinks} ad disclosure links. `+
                        `Matched ${nMatched} of ${nMatched + nUnmatched} ad disclosures.`
            );
            this._log(`Ad scrape results: ${JSON.stringify(scrapeResults)}`);
        }
        return {
            scrapeResults,
            adAttrs: adDetails,
            visitedAdUrls: this._visitedAdUrls,
            unmatchedAdDisclosureContents: this._unmatchedAdDiscContents};
    }
}

module.exports = AdCollector;
