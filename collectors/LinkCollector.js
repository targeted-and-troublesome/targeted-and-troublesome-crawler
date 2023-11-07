/* eslint-disable no-await-in-loop */
const BaseCollector = require('./BaseCollector');
const puppeteer = require('puppeteer');
const chalk = require('chalk').default;
const tld = require('tldts');
const { URL } = require('url');
const wait = require('../helpers/wait');

const ENABLE_CHALK = true;
chalk.enabled = ENABLE_CHALK;

const LINKS_QUERY = `
(function getLinks() {
    const links = window.document.querySelectorAll('a, button');
    const getXPathOfElement = (element) => {
        if (element.id !== '')
            return 'id("' + element.id + '")';
        if (element === document.body)
            return element.tagName;

        let ix = 0;
        const siblings = element.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling === element)
                return getXPathOfElement(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']';
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName)
                ix++;
        }
    };

    const center = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
    };
    let linkAttrs = [];
    for (const link of links) {
        if (link.tagName.toLowerCase() === 'button' && !link.onclick && !link.type === 'submit') {
            continue; // Skip non-clickable buttons
        }
        const rect = link.getBoundingClientRect();
        const linkCenter = {
            x: rect.left + (rect.width / 2),
            y: rect.top + (rect.height / 2)
        };
        const distance = Math.hypot(center.x - linkCenter.x, center.y - linkCenter.y);
        const href = link.getAttribute('href');
        const title = link.getAttribute('title');
        const text = link.innerText;
        const xpath = getXPathOfElement(link);
        if (href || link.tagName.toLowerCase() === 'button') {
            linkAttrs.push({
                distance,
                href,
                title,
                text,
                xpath
            });
        }
    }
    linkAttrs.sort((a, b) => a.distance - b.distance);
    return linkAttrs;
})();
`;

const EXCLUDED_EXTS = [".jpg", ".jpeg", ".pdf", ".png"];

class LinkCollector extends BaseCollector {

    id() {
        return 'links';
    }

    /**
     * @param {import('./BaseCollector').CollectorInitOptions} options
     */
    init({
        log,
    }) {
        this._log = log;
        // @ts-ignore
        this._links = [];
        // @ts-ignore
        this._internalLinks = [];
    }

    // add link param to the function
    /**
     * @param {string} linkUrlStripped
     * @param {string} pageDomain
     * @param {string} pageUrl
     * @returns {boolean}
     */
    shouldIncludeLink(linkUrlStripped, pageDomain, pageUrl) {
        // TODO: no pdf, png etc, links
        // TODO: no links to external domains
        // TODO: no links without path and param: abc.com/, abc.com/#
        // TODO: don't collect variants of the same link such as /about and /about/
        if (tld.getDomain(linkUrlStripped) !== pageDomain) {
            // external link
            this._log(`Will skip the external link: ${linkUrlStripped}`);
            return false;
        }
        if (EXCLUDED_EXTS.some(fileExt => linkUrlStripped.includes(fileExt))) {
            this._log(`Bad file extension, will skip: ${linkUrlStripped}`);
            return false;
        }
        // remove trailing slash and # from the page url
        const pageUrlStripped = pageUrl.replace(/#$/, '').replace(/\/$/, '');
        if (linkUrlStripped === pageUrlStripped) {  // same page link
            this._log(`Skipping same page link: ${linkUrlStripped} (pageUrl: ${pageUrl}) `);
            return false;
        }

        return true;
    }

    /**
     * Navigate to the provided link and take a screenshot of the page.
     *
     * @param {Object} page - Puppeteer's page object.
     * @param {Object} link - Link object containing href and possibly other attributes.
     * @return {Promise<void>}
     */
    async openLink(page, link) {
        this._log(`Attempting to navigate to: ${link.href}`);
        await page.goto(link.href, { timeout: 60000 }); // 60 seconds timeout
        await page.waitForTimeout(5000);

        // Define the path for the screenshot
        const screenshotPath = `./data/${Date.now()}.png`;

        // Take a screenshot of the current page
        await page.screenshot({ path: screenshotPath, fullPage: true });

        this._log(`Screenshot saved at: ${screenshotPath}`);
    }

    /**
     * Click on the link element to open it in a new tab, take a screenshot, and switch back to the original tab.
     *
     * @param {Object} page - Puppeteer's page object.
     * @param {Object} link - Link object containing href and possibly other attributes.
     * @param {Object} options - Options object containing related configurations.
     * @return {Promise<void>}
     */
    async clickLinkElement(page, link, options) {
        this._log(chalk.red(`Attempting to navigate to: ${link.href}`));
        const [linkElement] = await page.$x(link.xpath);
        if (linkElement) {
            this._log(chalk.yellow(`Found link element for: ${link.href}. Opening in a new tab...`));

            // Middle click to open link in a new tab
            await linkElement.click({ button : 'middle' });
            await page.waitForTimeout(5000);  // wait for new tab to be opened

            // Switch to the new tab
            const pages = await options.page.browser().pages();
            const newPage = pages[pages.length - 1];
            await newPage.bringToFront();
            this._log(chalk.red(`Switched to the new tab: ${newPage.url()}`));
            await newPage.waitForTimeout(7000);

            // Define the path for the screenshot
            const screenshotPath = `./data/${Date.now()}.png`;
            // Take a screenshot of the current page
            await newPage.screenshot({ path: screenshotPath, fullPage: true });
            this._log(`Screenshot saved at: ${screenshotPath}`);

            await page.bringToFront();
            this._log(chalk.bgYellow(`Switched back to the original tab: ${page.url()}`));
        } else {
            this._log(chalk.gray(`Could not find link element for: ${link.href}`));
        }
    }

    /**
     * @param {{ finalUrl?: string; urlFilter?: any; url?: any; evaluate?: ((arg0: () => any[]) => any) | ((arg0: () => any[]) => any); page:any, outputPath: string, context: any}} options
     */

    async getData(options) {
        await options.page.waitForTimeout(7500);
        // scroll to the top of the page
        await options.page.evaluate(() => {
            window.scrollTo(0, 0);
        });
        const MAX_LINKS_TO_COLLECT = 10;
        const page = options.page;
        const pageUrl = page.url().toLowerCase();
        this._log(`pageUrl: ${pageUrl}`);
        const pageDomain = tld.getDomain(pageUrl);
        this._links = await page.evaluate(LINKS_QUERY);
        this._log(`Found ${this._links.length} links`);
        this._log(chalk.bgCyan(`Page url 0 : ${page.url()}`));

        // iterate over the links
        for (const link of this._links) {
            // convert relative links to absolute
            link.href = new URL(link.href, pageUrl).href.toLowerCase();
            const linkUrlStripped = link.href.replace(/#$/, '').replace(/\/$/, '');
            if (!this.shouldIncludeLink(linkUrlStripped, pageDomain, pageUrl)) {
                continue;
            }
            if (this._internalLinks.includes(linkUrlStripped)) {
                continue;
            }

            // Uncomment one of the following as needed:
            // await this.openLink(page, link);
            await this.clickLinkElement(page, link, options);
            this._internalLinks.push(linkUrlStripped);
            if (this._internalLinks.length >= MAX_LINKS_TO_COLLECT) {
                break;
            }
            }

        return this._internalLinks;
    }

}

module.exports = LinkCollector;
