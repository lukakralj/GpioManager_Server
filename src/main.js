/**
 * This module provides entry and exit point of the application.
 * It takes care of the correct setup and shutdown.
 * 
 * @module main
 * @author Luka Kralj
 * @version 1.0
 */


const ngrok = require('ngrok');
const logger = require('./util/logger');
const config = require('../config/config.json');
const nodeMailer = require('nodemailer');
const cli = require('./cli');

logger.info("Server has started.");
// 'import' already triggers socket initialisation
require('./socket-setup');

logger.info("Connecting ngrok...");
let ngrokUrl = undefined;
(async function () {
    ngrokUrl = await ngrok.connect(config.ngrokOpts);
    logger.info("Ngrok connected: " + ngrokUrl);
    logger.info("Ngrok using port: " + config.ngrokOpts.addr);
    let sent = false;
    logger.info("Sending ngrok info email...");
    do {
        sent = await sendEmail(ngrokUrl);
    }
    while (!sent);
    logger.info("Ngrok info email sent.");
})().catch((err) => {
    logger.error(err);
    logger.error("Ngrok could not start.");
});

let stoppedProperly = false;
cli.registerCommand("stop", onStop);
cli.registerCommand("exit", onExit);

/** Block Ctrl+C plus graceful shutdown. */
process.on('SIGINT', async () => {
    logger.warning("Please use CLI to stop the server! Type 'stop' first and then 'exit'.");
});

/** Graceful shutdown. */
process.on('SIGTERM', async () => {
    logger.warning("Please use CLI to stop the server! Type 'stop' first and then 'exit'.");
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

async function sendEmail(html) {
    const transporter = nodeMailer.createTransport(config.transporter);

    const receiverOptions = {
        from: transporter.options.auth.user,
        to: config.email_to,
        subject: "Server configuration",
        html: html
    };

    let successful = false;
    let finished = false;
    await transporter.sendMail(receiverOptions, (err) => {
        if (err) {
            logger.error(err);
            successful = false;
        } else {
            logger.info("Email sent successfully to: " + receiverOptions.to + ".");
            successful = true;
        }
        transporter.close();
        finished = true;
    });
    while (!finished) {
        await sleep(1);
    }
    return successful;
}
