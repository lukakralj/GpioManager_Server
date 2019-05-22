/**
 * This module handles an LED. Server must be executed as sudo user
 * otherwise some of these commands won't run.
 * 
 * @module 
 * @author Luka Kralj
 * @version 1.0
 */

module.exports = {
    turnOn,
    turnOff,
    isOn
}

const logger = require("../../util/logger");
const cli = require('../../cli');
const gpio = require('../Gpio');
const Gpio = gpio.Gpio;
const config = require('../../../config/config.json');
const ledPin = config.led.physicalPin; // must be physical pin number

logger.info("Initialising LED module...")

cli.registerCommand("stop", onStop);

let led = undefined;
init().then((ok) => {
    if (ok) {
        logger.info("LED module initialised correctly.");
    }
    else {
        logger.warning("LED module could not be initialised.")
    }
});

/**
 * Initialise the LED pin.
 */
async function init() {
    try {
        led = new Gpio(ledPin, gpio.DIR_OUT);
        await led.init();
    }
    catch (err) {
        logger.error(err);
        return false;
    }
    // set value
    if (await led.turnOff()) return true;
    return false;
}

async function onStop() {
    if (await led.turnOff()) {
        logger.info("LED turned off.");
    }
    else {
        logger.warning("Problem turning off LED.");
    }

    if (await led.unexport()) {
        logger.info("LED pin unexported.");
    }
    else {
        logger.warning("Problem unexporting LED pin.");
    }
}

/** @returns True or false. */
async function turnOn() {
    return await led.turnOn();
}

/** @returns True or false. */
async function turnOff() {
    return await led.turnOff();
}

/** @returns True or false. */
async function isOn() {
    return await led.isOn();
}

//==============
// for testing only

cli.registerCommand("led", async (params) => {
    if (params.length == 0) {
        console.log("Missing parameter. One of: ison, turnon, turnoff");
        return;
    }
    switch (params[0]) {
        case "ison": console.log(await isOn()); break;
        case "turnon": console.log(await turnOn()); break;
        case "turnoff": console.log(await turnOff()); break;
        default: console.log("Invalid parameter. Must be one of: ison, turnon, turnoff");

    }
});
