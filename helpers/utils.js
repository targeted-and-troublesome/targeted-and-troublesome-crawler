const puppeteer = require('puppeteer');
const request = require('request');
const fs = require('fs');
const crypto = require("crypto");
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36';
const MOBILE_USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; Pixel 2 XL) AppleWebKit/537.36 (KHTML, like Gecko)  Chrome/112.0.0.0 Mobile Safari/537.36';
const DISABLE_ADCHOICES_CLICKING = false;
const CLICK_METHODS = ['JS_CLICK', 'NATIVE_CLICK'];
const ADCHOICES_REGEX_SRC = 'adchoice|whythisad|(privacy/adinfo)';
const ADCHOICES_REGEX = new RegExp(ADCHOICES_REGEX_SRC, 'i');
const path = require('path');

/**
 * @param {string} str
 */
function removeNewLineChars(str) {
    return str.replace(/[\n\r]+/g, ' ');
}

// @ts-ignore
async function getElementAttrs(elementHandle, log) {
    let boundingBox;
    let intersectsViewPort;
    let elAttrs;
    if (!elementHandle) {return undefined;}
    try {
        boundingBox = await elementHandle.boundingBox();
        intersectsViewPort = await elementHandle.isIntersectingViewport();
        elAttrs = await elementHandle.evaluate(el => ({
            id: el.id,
            type: el.getAttribute('type'),
            nodeType: el.nodeName,
            name: el.getAttribute('name'),
            href: el.href,
            class: el.className,
            innerText: el.innerText.slice(0, 2000),
            src: el.getAttribute('src'),
            ariaLabel: el.ariaLabel,
            placeholder: el.getAttribute('placeholder'),
            xpath: getXPathTo ? getXPathTo(el) : "",
            borderStyle: el.style.borderStyle,
            outerHTML: el.outerHTML.slice(0, 2000),
        }), elementHandle);
        elAttrs.x = boundingBox.x;
        elAttrs.y = boundingBox.y;
        elAttrs.width = boundingBox.width;
        elAttrs.height = boundingBox.height;
        elAttrs.intersectsViewPort = intersectsViewPort;
        return elAttrs;
    } catch (error) {
        log(`Error while getting attributes: ${removeNewLineChars(error.message)}`);
    }
    return undefined;
}

/**
 * @param {number} time
 */
function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

/**
 * @param {{click: () => any;}} elHandle
 * @param {{evaluate: (arg0: (el: any) => any, arg1: any) => any;}} pageOrFrame
 */
async function clickToElement(elHandle, method = "JS_CLICK", pageOrFrame) {
    try {
        if (method === 'NATIVE_CLICK') {
            await elHandle.click();
        } else {
            await pageOrFrame.evaluate((el) => el.click(), elHandle);
        }
    } catch (error) {
        return { 'result': false, 'message': error.message };
    }
    return { 'result': true };
}

/**
 * @param {{ slice: (arg0: number, arg1: number) => any; }} href
 * @param {{ click: () => any; }} linkHandle
 * @param {{ evaluate: (arg0: (el: any) => any, arg1: any) => any; }} pageOrFrame
 * @param {(arg0: string) => void} log
 */
async function openAdChoiceLink(href, linkHandle, pageOrFrame, log) {
    if (DISABLE_ADCHOICES_CLICKING) {
        return false;
    }

    for (const method of CLICK_METHODS) {
        // log(`Will click on the adchoice link using ${method} ${href}`);
        const clickRes = await clickToElement(linkHandle, method, pageOrFrame);
        if (clickRes.result) {
            log(`✅ Clicked the adchoice link using ${method} ${href.slice(0, 100)}`);
            return true;
        } else {
            log(`❌ Failed to click the adchoice link using ${method}, ERR_MESSAGE: ${clickRes.message}, URL: ${href}`);
        }
    }
    return false;
}

/**
 * @param {string} url
 * @param {fs.PathLike} outPath
 * @param {any} referer
 * @param {(arg0: string) => void} log
 * @param {boolean} emulateMobile
 */
async function downloadFile(url, outPath, referer, log, emulateMobile) {
    const userAgent = emulateMobile ? MOBILE_USER_AGENT : DEFAULT_USER_AGENT;
    log(`Downloading file: ${url} to ${outPath} with user-agent: ${userAgent}`);
    const options = {
        headers: {
            'accept': '*/*',
            'accept-encoding': 'identity;q=1, *;q=0',
            'accept-language': 'en-US,en;q=0.9',
            'range': 'bytes=0-',
            'referer': referer,
            'sec-fetch-dest': 'video',
            'sec-fetch-mode': 'no-cors',
            'sec-fetch-site': 'cross-site',
            'user-agent': userAgent,
        },
    };

    request
        .get(url, options)
        .on('error', function(err) {
            log(`ERROR: Failed to download ad file: ${url} to ${outPath} with error: ${err}`);
        })
        .pipe(fs.createWriteStream(outPath))
}


// https://stackoverflow.com/a/67073856
/**
 * @param {string | Buffer | NodeJS.TypedArray | DataView} data
 * @param {number} len
 */
function getHash(data, len) {
    return crypto.createHash("shake256", { outputLength: len })
      .update(data)
      .digest("hex");
}

/**
 * @param {{ src: any; width: number; height: number; }[]} mediaFiles
 * @param {string} outputFolder
 * @param {string} suffix
 * @param {string} urlHash
 * @param {string} pageUrl
 * @param {(arg0: string) => void} log
 * @param {boolean} emulateMobile
 */
async function downloadVideoOrImg(mediaFiles, outputFolder, suffix, urlHash, pageUrl, log, emulateMobile) {
    /**
     * @type {string[]}
     */
    const alreadyDownloaded = [];
    if (!mediaFiles) {
        return;
    }
    for (const mediaFile of mediaFiles) {
        const url = mediaFile.src;
        // check if the mediaFile.src is an http link and we don't have spaces in it
        // there
        if (!url || !url.startsWith('http') || url.includes(' ')) {
            continue;
        }
        const hostname = new URL(url)?.hostname;
        // check if the matches this pattern: mts[0-9].google.com
        if (hostname?.match(/mts[0-9]\.google\.com/)) {
            // skip google's mts map tile servers
            continue;
        }

        const MIN_PX_TO_DOWNLOAD = 30;
        // skip files smaller than 30px width or height
        if (mediaFile.width < MIN_PX_TO_DOWNLOAD || mediaFile.height < MIN_PX_TO_DOWNLOAD) {
            continue;
        }

        if (alreadyDownloaded.includes(url)) {
            continue;
        }

        const uniqueStr = getHash(url, 2);
        const fileName = url.replace(/\/$/, '').split('/').pop().slice(0, 32);
        const filePath = path.join(outputFolder, `${urlHash}_${suffix}_${hostname}_${uniqueStr}_${fileName}`);
        await downloadFile(url, filePath, pageUrl, log, emulateMobile);
        alreadyDownloaded.push(url);
    }
}

/**
 * @param {any} adDetails
 */
function getAdLinksFromAdDetails(adDetails){
    const linksToClick = [];
    for (const mainAdDetail of adDetails) {
        for (const links of mainAdDetail.adLinksAndImages) {
            const gwdLinks = links.gwdLinks;
            for (const gwdLink of gwdLinks) {
                const gwdURLs = gwdLink.map(el=>el.googAdUrl).filter(el=>el);
                linksToClick.push(...gwdURLs);
            }
            const normalLinks = links.links;
            for (const normalLink of normalLinks) {
                const normalLinkUrls = normalLink.map(el=>el.googAdUrl).filter(el=>el);
                linksToClick.push(...normalLinkUrls);
            }
        }
    }
    return [...(new Set(linksToClick))];
}

/**
 * @param {puppeteer.ElementHandle | puppeteer.Frame} elementHandle
 * @param {number} adIndex
 * @param {(arg0: string) => void} log
 * @param {string} outputPath
 * @param {string} urlHash
 * @param {string} pageUrl
 * @param {boolean} emulateMobile
*/
async function findLinksInElement(elementHandle, adIndex, log, outputPath,
        urlHash, pageUrl, emulateMobile=false) {

    const adLinksAndImages = [];
    let links;
    let gwdLinks;
    let scripts;
    let videos;
    let iframes;
    let imgs;

    // Get all frames inside the element
    const frames = await elementHandle.$$('iframe');

    for (const frame of frames) {
        // Switch to the frame
        const frameSrc = frame.src;
        const frameHandle = await frame.contentFrame();
        if (!frameHandle) {
            log(`Cannot get frame handle for frame: ${frameSrc}`);
            continue;
        }
        // Recursively find links inside the frame
        // log(`Will switch to frame: ${frameSrc}: ${frameUrl}`);
        try {
            // @ts-ignore
            const frameLinksAndImages = await findLinksInElement(
                frameHandle, adIndex, log, outputPath, urlHash, pageUrl, emulateMobile
                );
            adLinksAndImages.push(...frameLinksAndImages);
        } catch (error) {
            log(`❌ Failed to get ad links from frame: ${error.message}`);
        }
    }

    try {
        // Find all links inside the current frame (or element)
        links = await getAdLinks(elementHandle);
    } catch (error) {
        log(`❌ Failed to get ad links from element: ${error.message}`);
    }

    try {
        // gwd-taparea is used by some google ads
        gwdLinks = await getAdGwdLinks(elementHandle);
    } catch (error) {
        log(`❌ Failed to get ad gwd links from element: ${error.message}`);
    }

    try {
        // get src attributes of the script elements
        scripts = await getAdScripts(elementHandle);
    } catch (error) {
        log(`❌ Failed to get ad scripts from element: ${error.message}`);
    }

    try {
        // get src attributes of the script elements
        iframes = await elementHandle.$$eval('iframe',
          (elements) => elements.map((el) => el.src).filter((elSrc) => elSrc));
    } catch (error) {
        log(`❌ Failed to get ad iframes from element: ${error.message}`);
    }

    const frameUrl = elementHandle.url?.() || pageUrl;  // either frame or page url
    const frameId = elementHandle?._id;
    // get the immediate parent frame's url
    const parentFrameUrl = elementHandle.parentFrame?.().url?.() || "unknown";

    try {
        // get src attributes of the video elements
        videos = await getAdVideos(elementHandle);
        // download the detected videos
        const VIDEOS_DIR = path.join(outputPath, 'ad_videos');
        const ENABLE_AD_VIDEO_DOWNLOADS = true;
        if (ENABLE_AD_VIDEO_DOWNLOADS  && videos.length > 0) {
            await downloadVideoOrImg(videos, VIDEOS_DIR, `AD_VIDEO_${adIndex}`, urlHash, pageUrl, log, emulateMobile);
        }
    } catch (error) {
        log(`❌ Failed to get ad videos from element: ${error.message}`);
    }


    // Find all adchoice links inside the element
    const adChoicesLinksHandles = await elementHandle.$$(
        ':is(a[href*="whythisad"], a[href*="adchoice"], a[href*="privacy/adinfo"])');

    try {
        // Find all (ad) images inside the element
        imgs = await getAdImgs(elementHandle);
    } catch (error) {
        log(`❌ Failed to get ad images from element: ${error.message}`);
    }
    const ENABLE_AD_IMG_DOWNLOADS = true;
    const AD_IMGS_DIR = path.join(outputPath, 'ad_imgs');
    if (ENABLE_AD_IMG_DOWNLOADS) {
        await downloadVideoOrImg(imgs, AD_IMGS_DIR, `AD_IMG_${adIndex}`, urlHash, frameUrl, log, emulateMobile);
    }

    // Find all elements with background images
    const bgImgs = await elementHandle.$$eval('*',
        (elements) => elements.map((el) => {
            const bgImg = el.currentStyle?.backgroundImage || window.getComputedStyle(el).backgroundImage;
            if (bgImg && bgImg !== 'none') {
                const bgImgUrl = bgImg.replace('url(', '').replace(')', '').replace(/["']/g, "");
                const boundingBox = el.getBoundingClientRect();
                return ({x: boundingBox.x, y: boundingBox.y, width: boundingBox.width,
                         height: boundingBox.height, src: bgImgUrl,
                         outerHTML: el.outerHTML.slice(0, 2000)});
            }
        }).filter((el) => el));
    const ENABLE_AD_BG_IMG_DOWNLOADS = true;
    if (ENABLE_AD_BG_IMG_DOWNLOADS) {
        await downloadVideoOrImg(bgImgs, AD_IMGS_DIR, `AD_BG_IMG_${adIndex}`, urlHash, frameUrl, log, emulateMobile);
    }

    // check if the frame is the top level browsing context (i.e. main document)
    const isMainDocument = await elementHandle.evaluate(() => self === top);
    const parentFrameId = elementHandle.parentFrame?._id;

    let containsImgsOrLinks = false;  // we store frame details even if it doesn't contain any links or images
    if (links.length || gwdLinks.length ||imgs.length || bgImgs.length || videos.length) {
        containsImgsOrLinks = true;
    }

    // adLinksAndImages are saved in as JSON, after removing the handles that are not serializable
    // we use the handles to click on adchoice links
    adLinksAndImages.push({
        frameUrl, containsImgsOrLinks, isMainDocument, parentFrameUrl, frameId,
        parentFrameId, links, frameHandle: elementHandle,
        adChoicesLinksHandles, gwdLinks, imgs, bgImgs, videos, scripts, iframes});
    return adLinksAndImages;
}


/**
 * @param {puppeteer.ElementHandle<Element> | puppeteer.Frame} elementHandle
 */
async function getAdImgs(elementHandle) {
    return await elementHandle.$$eval('img',
        // get the x and y coordinates of the element
        (imgs) => imgs.map((img) => {
            const boundingBox = img.getBoundingClientRect();
            return ({
                x: boundingBox.x, y: boundingBox.y, width: boundingBox.width,
                height: boundingBox.height, src: img.src,
                outerHTML: img.outerHTML.slice(0, 2000)
            });
        }));
}

/**
 * @param {puppeteer.ElementHandle<Element> | puppeteer.Frame} elementHandle
 */
async function getAdVideos(elementHandle) {
    return await elementHandle.$$eval('video',
        (elements) => elements.map((el) => (
            { src: el.src, width: el.width, height: el.height })).filter((el) => el.src));
}

/**
 * @param {puppeteer.ElementHandle<Element> | puppeteer.Frame} elementHandle
 */
async function getAdScripts(elementHandle) {
    return await elementHandle.$$eval('script',
        (elements) => elements.map((el) => el.src).filter((elSrc) => elSrc));
}

/**
 * @param {puppeteer.ElementHandle<Element> | puppeteer.Frame} elementHandle
 */
async function getAdGwdLinks(elementHandle) {
    return await elementHandle.$$eval(
        'gwd-taparea', (gwds) => gwds.map((gwd) => [{
            googAdUrl: new URLSearchParams(gwd.getAttribute('exit-override-url'))?.get('adurl'),
            href: gwd.getAttribute('exit-override-url'), outerHTML: gwd.outerHTML.slice(0, 2000)
        }]));
}

/**
 * @param {puppeteer.ElementHandle<Element> | puppeteer.Frame} elementHandle
 */
async function getAdLinks(elementHandle) {
    return await elementHandle.$$eval('a',
        (links) => links.map((link) => [
            {
                googAdUrl: new URLSearchParams(link.href).get('adurl'),
                href: link.href,
                outerHTML: link.outerHTML.slice(0, 2000)
            }
        ]));
}

/**
 * @param {puppeteer.ElementHandle} elementHandle
 * @param {(arg0: string) => void} log
 */
async function scrollToElement(elementHandle, log) {
    try {
        await elementHandle.evaluate(el => {
            el.scrollIntoView({behavior: 'smooth', block: 'end', inline: 'end'});
        });
    } catch (error) {
        log(`Error scrolling to element: ${error}`);
    }
}


/**
 * @param {puppeteer.Page} page
 * @param {puppeteer.ElementHandle} elementHandle
 * @param {string} outputPath
 * @param {string} urlHash
 * @param {number} ssCounter
 * @param {string} ssSuffix
 * @param {(arg0: string) => void} log
 * @param {{ x: number; y: number; width: number; height: number; }} boundingBox
 * @param {boolean} disableScrollDebug
 */
async function takeScreenshotOfElement(
        page, elementHandle, outputPath, urlHash, ssCounter,
            ssSuffix, log, boundingBox, disableScrollDebug=false) {

    const ssName = `${urlHash}_${ssCounter}_${ssSuffix}.png`;
    const ssPath = `${path.join(outputPath, ssName)}`;

    const DEBUG_SCROLLING = false;  // set to true to take an alternate
    // screenshot without scrollY offset. This doesn't help much and the issue is
    // largely fixed.

    try {
        const scrollY = await page.evaluate('window.scrollY');
        log(`📷 Taking screenshot of element: ${ssName} ${JSON.stringify(boundingBox)}`);
        await elementHandle.screenshot({
            path: ssPath,
            clip: {
                x: boundingBox.x,
                y: boundingBox.y + scrollY,
                width: Math.min(boundingBox.width, page.viewport().width),
                height: Math.min(boundingBox.height, page.viewport().height),
            },
        });

        if (DEBUG_SCROLLING && !disableScrollDebug) {
            const ssAltName = `${urlHash}_${ssSuffix}_${ssCounter}_NO_SCROLL.png`;
            const ssAltPath = `${path.join(outputPath, ssAltName)}`;
            await elementHandle.screenshot({
                path: ssAltPath,
                clip: {
                    x: boundingBox.x,
                    y: boundingBox.y,
                    width: Math.min(boundingBox.width, page.viewport().width),
                    height: Math.min(boundingBox.height, page.viewport().height),
                },
            });
        }
    } catch (error) {
        log(`Error taking screenshot of element: ${error} filename: ${ssName}`);
        return ""
    }
    return ssName;
}


/**
 * @param {puppeteer.Page} page
 */
async function dismissDialogs(page) {
    // call injected function to dismiss dialogs
    return await page.evaluate(() => dismissDialog());
}

/**
 * @param {{pages: () => any;}} browser
 */
async function bringMainPageFront(browser) {
    const pages = await browser.pages();
    const originalPage = pages[0];
    await originalPage.bringToFront();
}

/**
 * @param {puppeteer.Page} page
 * @param {(arg0: string) => void} log
 * @param {string} outputPath
 * @param {string} urlHash
 * @param {string} ssSuffix
 * @param {number | string} ssCounter
 * @param {boolean} fullPage
 */
async function takeScreenshot(page, outputPath, urlHash, ssSuffix, ssCounter, log, fullPage = true) {
    const ssName = `${urlHash}_${ssCounter}_${ssSuffix}.png`;
    await page.screenshot({path: `${path.join(outputPath, ssName)}`,
        fullPage: fullPage,
        captureBeyondViewport: false});
    log(`📷 Saved screenshot to ${ssName}, fullPage: ${fullPage}`);
}

/**
 * @param {any} page
 * @param {string} outputPath
 * @param {any} urlHash
 * @param {any} htmlSuffix
 * @param {any} adHTMLCounter
 * @param {(arg0: string) => void} log
 */
async function saveHTML(page, outputPath, urlHash, htmlSuffix, adHTMLCounter, log) {
    const htmlName = `${urlHash}_${adHTMLCounter}_${htmlSuffix}.html`;
    const mHtmlName = `${urlHash}_${adHTMLCounter}_${htmlSuffix}.mhtml`;
    const htmlPath = `${path.join(outputPath, htmlName)}`
    const mhtmlPath = `${path.join(outputPath, mHtmlName)}`

    const htmlSrc = await page.evaluate(() => document.documentElement.outerHTML);
    const cdp = await page.target().createCDPSession();
    const { mHtmlSrc } = await cdp.send('Page.captureSnapshot', { format: 'mhtml' });
    fs.writeFileSync(mhtmlPath, mHtmlSrc);
    fs.writeFileSync(htmlPath, htmlSrc);
    log(`📜 Saved HTML and MHTML to ${htmlName} ${mHtmlName}`);
}



module.exports = {
    takeScreenshot,
    sleep,
    // scrapeAds,
    getElementAttrs,
    dismissDialogs,
    bringMainPageFront,
    removeNewLineChars,
    scrollToElement,
    openAdChoiceLink,
    findLinksInElement,
    takeScreenshotOfElement,
    ADCHOICES_REGEX,
    saveHTML,
    getAdLinksFromAdDetails
};