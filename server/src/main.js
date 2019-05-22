/**
 * This module provides entry and exit point of the application.
 * It takes care of the correct setup and shutdown.
 * 
 * @module 
 * @author Luka Kralj
 * @version 1.0
 */


const ngrok = require('ngrok');
const logger = require('./util/logger');
const config = require('../config/config.json');
const cli = require('./cli');

logger.info("Server has started.");
// 'import' should already trigger socket initialisation
require('./socket-setup');

logger.info("Connecting ngrok...");
let ngrokUrl = undefined;
(async function () {
    ngrokUrl = await ngrok.connect(config.ngrokOpts);
    logger.info("Ngrok connected: " + ngrokUrl);
    logger.info("Ngrok using port: " + config.ngrokOpts.addr);
})().catch((err) => {
    logger.error(err);
    logger.error("Ngrok could not start.");
});

let stoppedProperly = false;
cli.registerCommand("stop", onStop);
cli.registerCommand("exit", onExit);

/** Block Ctrl+C plus graceful shutdown. */
process.on('SIGINT', async () => {
    await onStop();
    onExit();
});

/** Graceful shutdown. */
process.on('SIGTERM', async () => {
    await onStop();
    onExit();
});


/**
 * Clean up.
 */
async function onStop() {
    if (stoppedProperly) {
        return;
    }
    logger.info("Stopping...");
    try {
        await ngrok.disconnect();
        await ngrok.kill();
        logger.info("Disconnected ngrok.");
    }
    catch (err) {
        logger.error(err);
    }

    logger.info("Allowing other modules to finish...(2 seconds)");
    await sleep(2000);
    logger.info("Stopped.");
    stoppedProperly = true;
}

/**
 * Exit application.
 */
async function onExit() {
    logger.info("Exiting...");
    await sleep(1000);
    if (stoppedProperly) {
        process.exit(0);
    }
    else {
        logger.error("Server was not stopped properly.")
        process.exit(1);
    }
}

/**
 * Await for this function to pause execution for a certain time.
 *
 * @param {number} ms Time in milliseconds
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}
