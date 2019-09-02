/**
 * Listens to changes in IN components and notifies about the change.
 */

module.exports = {
    startListener
}

const logger = require('./../util/logger');
const cli = require('./../cli');
const compManager = require('./components-manager');

cli.registerCommand("stop", onStop);

let prevValues = {};
let stop = false;
async function startListener(onChangeCallback) {
    while (!stop) {
        const newValues = await compManager.getINComponentsValues();
        let changeOccurred = false;
        if (JSON.stringify(prevValues) !== JSON.stringify(newValues)) {
	    logger.debug(`Comparing values: ${JSON.stringify(prevValues)} and ${JSON.stringify(newValues)}`)
            prevValues = newValues;
            changeOccurred = true;
        }
        
        if (changeOccurred) {
            onChangeCallback();
        }
        await sleep(1000);
    }
}

async function onStop() {
    stop = true;
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
