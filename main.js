const crawlerConductor = require('./crawlerConductor');
const crawler = require('./crawler');

const FingerprintCollector = require('./collectors/FingerprintCollector');
const RequestCollector = require('./collectors/RequestCollector');
const APICallCollector = require('./collectors/APICallCollector');
const CookieCollector = require('./collectors/CookieCollector');
const TargetCollector = require('./collectors/TargetCollector');
const TraceCollector = require('./collectors/TraceCollector');
const ScreenshotCollector = require('./collectors/ScreenshotCollector');
const CMPCollector = require('./collectors/CMPCollector');
const AdCollector = require('./collectors/AdCollector');
const VideoCollector = require('./collectors/VideoCollector');
const LinkCollector = require('./collectors/LinkCollector');

// reexport main pieces of code so that they can be easily imported when this project is used as a dependency
// e.g. `const {crawlerConductor} = require('3p-crawler');`
module.exports = {
    crawler,
    crawlerConductor,
    // collectors ↓
    FingerprintCollector,
    RequestCollector,
    APICallCollector,
    CookieCollector,
    TargetCollector,
    TraceCollector,
    ScreenshotCollector,
    CMPCollector,
    AdCollector,
    VideoCollector,
    LinkCollector,
};