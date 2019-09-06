/**
 * This module enables commands to be entered into the STDIN of the server.
 * Also closing the server should be done through this rather than through
 * Ctrl+C as some cleaning takes place when the server is shut down.
 * 
 * N.B. If two modules use the same main command name, the action will NOT be
 * overridden. Both 'subscribed' actions will be executed (like in C# - function 
 * subscription).
 * 
 * @module cli
 * @author Luka Kralj
 * @version 1.0
 */

module.exports = {
    registerCommand
};

const readline = require('readline');
const logger = require('./util/logger');

const commands = {};

registerCommand("help", printHelp);
registerCommand("exit", onExit);

const cli = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

cli.setPrompt("stdin@gpioManager >> ");

// Print initial help
setTimeout(() => {
    console.log("====Hello!====");
    console.log("Communicate with the server via this CLI.")
    console.log("N.B. To properly stop the server execute 'stop' first and then call 'exit'.");
    console.log("==============");
    cli.prompt();
}, 5000)

cli.on('line', async (line) => {
    processLine(line);
});

/**
 * Resolves command action.
 * 
 * @param {string} line Line read.
 */
async function processLine(line) {
    line = line.trim();
    if (line.length == 0) {
        cli.prompt();
        return;
    }
    
    // parse main command
    const all = line.split(" ");
    const main = all[0];
    const params = (all.length > 1) ? all.slice(1) : [];

    if (commands.hasOwnProperty(main)) {
        // valid command
        executeAll(commands[main], params, "exit" != main);
    }
    else {
        console.log("Invalid command. Type 'help' for available commands.");
        cli.prompt();
    }
}

async function executeAll(actions, params, prompt) {
    const total = actions.length;
    let executed = 0;
    for (const i in actions) {
        actions[i](params).then(() => {
            executed++;
        });
    }

    while (executed < total) {
        await sleep(2);
    }
    if (prompt) {
        cli.prompt();
    }
}

/**
 * Register a new command.
 * 
 * @param {string} command Main command without parameters.
 * @param {function} action Will receive a list of optional parameters.
 */
async function registerCommand(command, action) {
    if (commands.hasOwnProperty(command)) {
        commands[command].push(action);
    }
    else {
        commands[command] = [action];
    }
}

/**
 * Displays valid commands.
 */
async function printHelp() {
    console.log("Valid commands are:");
    console.log(Object.keys(commands));
}

async function onExit() {
    cli.close();
    logger.info("CLI closed.")
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