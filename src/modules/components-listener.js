/**
 * Listens to changes in IN components and notifies about the change.
 * 
 * @module components-listener
 * @author Luka Kralj
 * @version 1.0
 */

module.exports = {
    startListener
}

const cli = require('./../cli');
const compManager = require('./components-manager');

cli.registerCommand("stop", onStop);

let prevValues = {};
let stop = false;

/**
 * Start the listener and decide what happens when a change occurs.
 * 
 * @param {function} onChangeCallback Invoked when the change in IN components values occurs.
 */
async function startListener(onChangeCallback) {
    while (!stop) {
        const newValues = await compManager.getINComponentsValues();
        let changeOccurred = false;
        if (JSON.stringify(prevValues) !== JSON.stringify(newValues)) {
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
