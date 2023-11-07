class BaseCollector {

    id() {
        return 'base';
    }

    /**
     * Called before the crawl begins. Can be async, can throw errors.
     *
     * @param {CollectorInitOptions} options
     */
    // eslint-disable-next-line no-unused-vars
    init(options) {
    }

    /**
     * @param {import("puppeteer").Page} pageInfo
     * @param {URL} [url]
     * @param {string} [outputPath]
     * @param {undefined} [urlHash]
     */
    addListener(pageInfo, url, outputPath, urlHash, context) {
    }

    /**
     * Called whenever new target becomes available (e.g. main page, iframe, web worker). Can be async, can throw errors.
     *
     * @param {{cdpClient: import('puppeteer').CDPSession, url: string, type: import('./TargetCollector').TargetType, page: any, outputPath: string, urlHash: string}} targetInfo
     */
    // eslint-disable-next-line no-unused-vars
    addTarget(targetInfo) {
    }

    /**
     * Called after the page has loaded. Can be async, can throw errors.
     *
     * @returns {Promise<void>|Object}
     */
    postLoad() {
        return Promise.resolve();
    }

    /**
     * Called after the crawl to retrieve the data. Can be async, can throw errors.
     *
     * @param {{finalUrl: string, urlFilter?: function(string):boolean, page: any, outputPath: string, urlHash: string}} options
     * @returns {Promise<Object>|Object}
     */
    // eslint-disable-next-line no-unused-vars
    getData(options) {
        return Promise.resolve();
    }
}

/**
 * @typedef CollectorInitOptions
 * @property {import('puppeteer').BrowserContext} context
 * @property {URL} url
 * @property {function(...any):void} log
 * @property {Object.<string, string>} collectorFlags
 * @property {string} outputPath
 * @property {string} urlHash
 * @property {boolean} emulateMobile
 */

module.exports = BaseCollector;