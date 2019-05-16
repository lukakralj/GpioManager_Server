/**
 * This module provides the socket.io endpoint for remote access.
 * It enables external communication to the server, which is executing all
 * other subtasks.
 * 
 * @module 
 * @author Luka Kralj
 * @version 1.0
 */

//----- SOCKET IO ------
const ngrok = require('ngrok');
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

//------ UTILS -------
const logger = require('./util/logger');
const config = require('../config/config.json');
const errCodes = require('./err-codes');
const authenticator = require('./util/authenticator');
const cli = require('./cli');
const led = require('./modules/led_switch/led-switch');

logger.info("Server has started.");

//----- SETUP ----
server.listen(config.port, () => {
    logger.info("Server listening on port: " + config.port + "...");
});

logger.info("Connecting ngrok...");
let ngrokUrl = undefined;
(async function() {
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

const adminLogin = authenticator.generateNewHash("admin"); // temp. until a DB is setup

io.on('connection', (socket) => {
    logger.info(`Socket ${socket.id} connected`);

    socket.on("disconnect", () => {
        logger.info(`Socket ${socket.id} disconnected`);
    });

    /** Obtain the server's public key. */
    socket.on("serverKey", () => {
        const resCode = "serverKeyRes";
        socket.emit(resCode, { status: "OK", serverKey: undefined });
    });

    /** Required: {username: string, password: string, clientKey: string (base64)} */
    socket.on("login", async (msg) => {
        const resCode = "loginRes";
        msg = await decryptMessage(socket, resCode, msg);
        if (!msg) return;

        try {
            // TODO: uncomment if using encryption
            //msg = JSON.parse(msg);
            const keys = ["username", "password", "clientKey"];
            for (const i in keys) {
                if (!msg.hasOwnProperty(keys[i])) {
                    throw new Error("Missing key (" + keys[i] + ") in: " + JSON.stringify(msg));
                }
            }
        }
        catch (err) {
            logger.error(err);
            socket.emit(resCode, { status: "ERR", err_code: errCodes.INVALID_FORMAT });
            return;
        }

        if (! (await verifyUser(msg))) {
            socket.emit(resCode, { status: "ERR", err_code: errCodes.BAD_AUTH });
            return;
        }

        const accessToken = await authenticator.registerNewUserSession(msg.username, msg.clientKey);

        sendMessage(socket, resCode, accessToken, { status: "OK", accessToken: accessToken });
    });

    socket.on("ledStatus", async (msg) => {
        const resCode = "ledStatusRes";
        const processed = await processIncomingMsg(socket, resCode, msg, []);
        if (!processed) return;
        
        const ledStatus = (await led.isOn()) ? "on": "off";

        sendMessage(socket, resCode, processed.msg.accessToken, { status: "OK", ledStatus: ledStatus });
    });

    /** Required: { ledStatus: "on" | "off" } */
    socket.on("toggleLed", async (msg) => {
        const resCode = "toggleLedRes";
        const processed = await processIncomingMsg(socket, resCode, msg, []);
        if (!processed) return;

        let res;
        if (processed.msg.ledStatus == "on" || processed.msg.ledStatus == "off") {
            const turnOn = processed.msg.ledStatus == "on";
            const success = (turnOn) ? await led.turnOn() : await led.turnOff();
            const ledStatus = (await led.isOn()) ? "on": "off";
            if (success) {
                res = { status: "OK", ledStatus: ledStatus };
            }
            else {
                res = { status: "ERR", err_code: errCodes.LED_ERROR, ledStatus: ledStatus };
            }
            
        }
        else {
            res = { status: "ERR", err_code: errCodes.INVALID_FORMAT };
        }

        sendMessage(socket, resCode, processed.msg.accessToken, res);
    });


    //------------------------------------------------------
    //      TEMPLATE FOR NEW ENDPOINTS
    //------------------------------------------------------
    socket.on("[temp]", async (msg) => {
        const resCode = "[temp]Res";
        const processed = await processIncomingMsg(socket, resCode, msg, []); // insert any request specific keys (accessToken already included)
        if (!processed) return;

        // endpoint specific functions
        // processed = { msg: JSON, username: string}
        // ....

        sendMessage(socket, resCode, processed.msg.accessToken, { status: "OK", msg: "example" }); // define endpoint specific response
    });
    //------END OF TEMPLATE-------
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
    catch(err) {
        logger.error(err);
    }
    io.close(() => {
        logger.info("IO closed.");
    });
    server.close(() => {
        logger.info("Server closed.");
    });

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
 * 
 * @param {socket} socket Socket that received the request.
 * @param {string} resCode String used in emitting.
 * @param {string} msg Message to parse.
 * @param {array} keys Keys that need to be present in the message.
 */
async function processIncomingMsg(socket, resCode, msg, keys) {
    // TODO: uncomment if using encryption
    //msg = await decryptMessage(socket, resCode, msg);
    if (!msg) return undefined;
    msg = await checkJsonKeys(socket, resCode, JSON.stringify(msg), keys); // TODO: remove stringify if using encryption
    if (!msg) return undefined;
    const username = await verifyToken(socket, resCode, msg.accessToken);
    if (!username) return undefined;
    return { msg: msg, username: username };
}

/**
 * Converts the string message in JSON format and checks if it contains the compulsory keys.
 * 
 * @param {socket} socket Socket that received the request.
 * @param {string} resCode String used in emitting.
 * @param {string} msg Message to parse.
 * @param {array} keys Keys that need to be present in the message.
 * @param {string} accessToken If it is defined the error response will be encrypted. Otherwise it will not be.
 * @returns {json} Parsed message if successful, or undefined if it couldn't be parsed.
 */
async function checkJsonKeys(socket, resCode, msg, keys, accessToken = undefined) {
    try {
        msg = JSON.parse(msg);
        if (!msg.hasOwnProperty("accessToken")) {
            return await verifyToken(socket, resCode, undefined);
        }
        for (const i in keys) {
            if (!msg.hasOwnProperty(keys[i])) {
                throw new Error("Missing key (" + keys[i] + ") in: " + JSON.stringify(msg));
            }
        }
        return msg;
    }
    catch (err) {
        logger.error(err);
        const res = { status: "ERR", err_code: errCodes.INVALID_FORMAT };
        if (accessToken) {
            sendMessage(socket, resCode, accessToken, res);
        }
        else {
            socket.emit(resCode, res);
        }
        return undefined;
    }
}

/**
 * Decrypt the incoming message.
 * 
 * @param {socket} socket Socket that received the request.
 * @param {string} responseCode String used in emitting.
 * @param {string} msg Base64 encoded message.
 */
async function decryptMessage(socket, responseCode, msg) {
    // TODO: uncomment if using encryption
    //msg = await authenticator.decryptMessage(msg);
        
    if (msg === undefined) {
        socket.emit(responseCode, { status: "ERR", err_code: errCodes.BAD_ENCRYPT });
        return undefined;
    }
    return msg;
}

/**
 * Encrypts the message for the specific client and sends it.
 * 
 * @param {socket} socket Socket that will send the response.
 * @param {string} responseCode String used in emitting.
 * @param {string} accessToken User's access token.
 * @param {json} res Response to encrypt.
 */
async function sendMessage(socket, resCode, accessToken, res) {
    // TODO: uncomment to encrypt messages
    //res = await authenticator.encryptMessage(accessToken, JSON.stringify(res));

    if (res === undefined) {
        socket.emit(resCode, { status: "ERR", err_code: errCodes.SERVER_ERR });
    }
    socket.emit(resCode, res);
}

/**
 * Checks if the password matches the stored password.
 * 
 * @param {json} userData User details: { username: string, password: string }
 * @returns {boolean} True if the credentials are correct, false if not.
 */
async function verifyUser(userData) {
    try {
        // TODO: add DB check
        if (userData.username === "admin" &&
                authenticator.verifyPassword(userData.password, adminLogin.hash, adminLogin.salt, adminLogin.iterations)) {
            // valid user
            return true;
        }
    }
    catch (err) {
        logger.error(err);
    }
    return false;
}

/**
 * Verifies the token and retrieves the username associated with it.
 * 
 * @param {socket} socket Socket that received the request.
 * @param {string} responseCode String used in emitting.
 * @param {string} accessToken Token send by the user.
 * @returns {string} Username associated with the token or undefined if token is invalid or missing.
 */
async function verifyToken(socket, responseCode, accessToken){
    if (!accessToken) {
        socket.emit(responseCode, { status: "ERR", err_code: errCodes.NO_AUTH });
        return undefined;
    }
    const username = await authenticator.verifyToken(accessToken);
    if (!username) {
        socket.emit(responseCode, { status: "ERR", err_code: errCodes.BAD_AUTH });
        return undefined;
    }
    return username;
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
