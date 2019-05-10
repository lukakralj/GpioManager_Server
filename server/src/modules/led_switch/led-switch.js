/**
 * This module handles an LED. Server must be executed as sudo user
 * otherwise some of these commands won't run.
 * 
 * @module 
 * @author Luka Kralj
 * @version 1.0
 */

module.exports = {
    turnON,
    turnOFF,
    isON,
    isOFF
}

const logger = require("../../util/logger");
const exec = require('child_process').exec;
const cli = require('../../cli');

const gpioPath = "/sys/class/gpio";
const exportPath = gpioPath + "/export";
const unexportPath = gpioPath + "/unexport";
const ledPin = 27; // must be physical pin number

logger.info("Initialising LED module...")

cli.registerCommand("exit", onExit);

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
    // export pin
    let ok = await exportPin(ledPin);
    if (!ok) return false;
    // set direction
    ok = await cmdOutput(`echo out > ${getPinDirectionPath(ledPin)}`);
    if (!ok) return false;
    // set value
    ok = await cmdOutput(`echo 0 > ${getPinValuePath(ledPin)}`);
    if (!ok) return false;
    return true;
}

async function onExit() {
    await turnOFF();
    await unexportPin(ledPin);
}

async function turnON() {
    const ok = await cmdOutput(`echo 1 > ${getPinValuePath(ledPin)}`);
    if (!ok) return false;
    return ok;
}

async function turnOFF() {
    const ok = await cmdOutput(`echo 0 > ${getPinValuePath(ledPin)}`);
    if (!ok) return false;
    return ok;
}

async function isON() {
    const val = await cmdOutput(`cat ${getPinValuePath(ledPin)}`);
    return val == 1;
}

async function isOFF() {
    const val = await cmdOutput(`cat ${getPinValuePath(ledPin)}`);
    return val == 0;
}


function convertPhysicalPin(pin) {
    switch (pin) {
        case 24: return 12; // B
        case 25: return 13; // C
        case 26: return 69; // D 
        case 27: return 115; // E
        case 28: return 4; // F
        case 29: return 24; // G 
        case 30: return 25; // H 
        case 31: return 35; // I
        case 32: return 34; // J
        case 33: return 28; // K
        case 34: return 33; // L
        default: throw new Error("Invalid physical pin number: " + pin);
    }
}

async function exportPin(pin) {
    return await cmdOutput(`echo ${convertPhysicalPin(pin)} > ${exportPath}`);
}

async function unexportPin(pin) {
    return await cmdOutput(`echo ${convertPhysicalPin(pin)} > ${unexportPath}`);
}

function getPinValuePath(pin) {
    return `${gpioPath}/gpio${convertPhysicalPin(pin)}/value`;
}

function getPinDirectionPath(pin) {
    return `${gpioPath}/gpio${convertPhysicalPin(pin)}/direction`;
}

/**
 * Executes the given command and returns the response of the command.
 * 
 * @param {string} cmd One of the constants above.
 * @param {number} timeout Number of milliseconds.
 * @returns {string} Comand output or undefined if an error occurred.
 */
async function cmdOutput(cmd, timeout = 10000) {
    let output = undefined;
    let finished = false;
    const proc = exec(cmd, (err, stdout, stderr) => {
        if (err) {
            logger.error(err)
            logger.error(stderr);
        }
        else {
            if (stdout === undefined || stdout.trim().length == 0) {
                // some commands might have empty output
                stdout = true;
            }
            output = stdout;
        }
        finished = true;
    });
   
    let time = 0;
    while(!finished && time < timeout) {
        time ++;
        await sleep(1);
    }
    return output;
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


//==============
// for testing only

cli.registerCommand("led", async (params) => {
    if (params.length == 0) {
        console.log("Missing parameter. One of: ison, isoff, turnon, turnoff");
        return;
    }
    switch (params[0]) {
        case "ison": console.log(await isON()); break;
        case "isoff": console.log(await isOFF()); break;
        case "turnon": console.log(await turnON()); break;
        case "turnoff": console.log(await turnOFF()); break;
        default: console.log("Invalid parameter. Must be one of: ison, isoff, turnon, turnoff");

    }
});
