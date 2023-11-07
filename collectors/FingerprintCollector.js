const BaseCollector = require('./BaseCollector');

class FingerprintCollector extends BaseCollector {

    id() {
        return 'fingerprints';
    }

    /**
     * @param {import('./BaseCollector').CollectorInitOptions} options 
     */
    init({
        log,
    }) {
        /**
         * @type {Map<string, Map<string, number>>}
         */
        this._stats = new Map();
        /**
         * @type {{ source: any; description: String; arguments: any; returnValue: any; accessType: String}[]}
         */
        this._calls = [];
        this._callStats = {};
        this._log = log;
    }

    /**
     * @param {{ exposeFunction: (arg0: string, arg1: (apiCall: any) => void) => any; url: () => any; }} page
     */

    async addListener(page) {
        await page.exposeFunction('calledAPIEvent', apiCall => {
            if (!(apiCall && apiCall.source && apiCall.description)) {
                // call details are missing
                this._log('Missing call details', apiCall);
                return;
            }
            let sourceStats = null;
            if (this._stats.has(apiCall.source)) {
                sourceStats = this._stats.get(apiCall.source);
            } else {
                sourceStats = new Map();
                this._stats.set(apiCall.source, sourceStats);
            }

            let count = 0;

            if (sourceStats.has(apiCall.description)) {
                count = sourceStats.get(apiCall.description);
            }

            sourceStats.set(apiCall.description, count + 1);

            this._calls.push({
                source: apiCall.source,
                description: apiCall.description,
                arguments: apiCall.args,
                returnValue: apiCall.retVal,
                accessType: apiCall.accessType
            });
        });
    }

    /**
     * @param {string} urlString
     * @param {function(string):boolean} urlFilter
     */
    isAcceptableUrl(urlString, urlFilter) {
        let url;

        try {
            url = new URL(urlString);
        } catch (e) {
            // ignore requests with invalid URL
            return false;
        }

        // ignore inlined resources
        if (url.protocol === 'data:') {
            return false;
        }

        return urlFilter ? urlFilter(urlString) : true;
    }

    /**
     * @param {{finalUrl: string, urlFilter?: function(string):boolean}} options
     * @returns {{callStats: Object<string, APICallData>, savedCalls: SavedCall[]}}
     */
    getData({urlFilter}) {
        /**
         * @type {Object<string, APICallData>}
         */
        const callStats = {};

        this._stats
             .forEach((calls, source) => {
                 if (!this.isAcceptableUrl(source, urlFilter)) {
                     return;
                 }
                 callStats[source] = Array.from(calls)
                     .reduce((/** @type {Object<string, number>} */result, [script, number]) => {
                         result[script] = number;
                         return result;
                     }, {});
             });
        return {
            callStats,
            savedCalls: this._calls.filter(call => this.isAcceptableUrl(call.source, urlFilter))
        };
    }
}

module.exports = FingerprintCollector;

/**
 * @typedef TargetData
 * @property {string} url
 * @property {TargetType} type
 */

/**
 * @typedef {'page'|'background_page'|'service_worker'|'shared_worker'|'other'|'browser'|'webview'} TargetType
 */

/**
 * @typedef Options
 * @property {string} finalUrl
 * @property {function(string):boolean} urlFilter?
 * @property {any} page
 * @property {number} homepageLoadTime
 * @property {string} outputPath
 */