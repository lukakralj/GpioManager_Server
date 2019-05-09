/**
 * This module enables commands to be entered into the STDIN of the server.
 * Also closing the server should be done through this rather than through
 * Ctrl+C as some cleaning takes place when the server is shut down.
 * 
 * @module 
 * @author Luka Kralj
 * @version 1.0
 */

module.exports = {
    registerCommand
};

const readline = require('readline');

const commands = {};

registerCommand("help", printHelp);

const cli = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

cli.setPrompt("stdin@smarthome > ");

cli.on('line', async (line) => {
    await processLine(line);
    cli.prompt();
});

/**
 * Resolves command action.
 * 
 * @param {string} line Line read.
 */
async function processLine(line) {
    line = line.trim();
    if (line.length == 0) {
        return;
    }
    
    // parse main command
    const all = line.split(" ");
    const main = all[0];
    const params = (all.length > 1) ? all.slice(1) : [];

    if (commands.hasOwnProperty(main)) {
        // valid command
        await commands[main](params);
    }
    else {
        console.log("Invalid command.");
    }
}

/**
 * Register a new command.
 * 
 * @param {string} command Main command without parameters.
 * @param {function} action Will receive a list of optional parameters.
 */
async function registerCommand(command, action) {
    commands[command] = action;
}

/**
 * Displays valid commands.
 */
function printHelp() {
    console.log("-----------------------");
    console.log("Valid commands are:");
    console.log(Object.keys(commands));
    console.log("-----------------------");
}
