/* eslint-disable no-await-in-loop */
const BaseCollector = require('./BaseCollector');
const puppeteer = require('puppeteer');
const path = require('path');
const {createTimer} = require('../helpers/timer');
const {PuppeteerScreenRecorder} = require('puppeteer-screen-recorder');
const VIDEO_RECORDER_CONFIG = {
    followNewTab: false,
    fps: 25,
    aspectRatio: '16:9',
    recordDurationLimit: 120,
    videoBitrate: 300,
    videoFrame: {
        width: 640,
        height: 360,
    },
};

const VIDEO_RECORDER_CONFIG_MOBILE = {
    followNewTab: false,
    fps: 25,
    recordDurationLimit: 120,
    videoBitrate: 300,
    autopad: {color: 'black'},
    videoFrame: {
        width: 360,
        height: 640,
    },
};


class VideoCollector extends BaseCollector {

    id() {
        return 'videos';
    }

    /**
     * @param {import('./BaseCollector').CollectorInitOptions} options
     */
    init({
        log, emulateMobile
    }) {
        this._visitedURLs = new Set();
        this._finalURL = '';
        this._log = log;
        this._recorder = null;
        this._emulateMobile = emulateMobile;
    }

    /**
    * @param {{page: puppeteer.Page, type: import('./TargetCollector').TargetType, outputPath: string, urlHash: string}} targetInfo
    */
    async addTarget({page, type, outputPath, urlHash}) {
        if (page && type === 'page') {
            try {
                const config = this._emulateMobile ? VIDEO_RECORDER_CONFIG_MOBILE : VIDEO_RECORDER_CONFIG;
                this._log(`Will start video recording with config: ${JSON.stringify(config)}`);
                this._recorder = new PuppeteerScreenRecorder(page, config);
                const videoName = `${urlHash}.mp4`;
                const startResult = await this._recorder.start(`${path.join(outputPath, 'videos', videoName)}`);
                this._log(`Video recording started: ${startResult}`);
            } catch (error) {
                this._log("Error while starting video recording", error.message);
            }
        }
    }

    async getData() {
        try {
            this._log('Will stop video recording');
            // start a timer to measure how long it takes to stop the recording
            const stopTimer = createTimer();
            const stopRes = await this._recorder.stop();
            this._log(`Video recording stopped in ${stopTimer.getElapsedTime()} ms. Stopped: ${stopRes}`);
        }catch (error) {
            this._log("Error while stopping video recording", error.message);
        }
    }
}

module.exports = VideoCollector;
