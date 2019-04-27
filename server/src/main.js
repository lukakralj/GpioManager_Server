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
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

//------ UTILS -------
const logger = require('./util/logger');
const config = require('../config/config.json');
const errCodes = require('./err-codes');

logger.info("Server has started.");
logger.info("Starting authenticator...")
const authenticator = require('./util/authenticator');
logger.info("Authenticator has started.")


//----- SETUP ----
server.listen(config.port, () => {
    logger.info("Listening on port: " + config.port + "...");
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
        socket.emit(resCode, { status: "OK", serverKey: authenticator.getServerPublicKey() });
    });

    /** 
     * Login to obtain an access token.
     * @param {string} msg Encrypted JSON of format {username: string, password: string, clientKey: string (base64)}
     */
    socket.io("login", async (msg) => {
        const resCode = "loginRes";
        msg = await decryptMessage(socket, resCode);
        if (!msg) return;

        try {
            msg = JSON.parse(msg);
            for (const key in ["username", "password", "clientKey"]) {
                if (!msg.hasOwnProperty(key)) {
                    throw new Error("Missing key (" + key + ") in: " + JSON.stringify(msg));
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

    socket.on("msg", async (msg) => {
        const resCode = "msgRes";
        const processed = await processIncomingMsg(socket, resCode, msg, []);
        if (!processed) return;

        sendMessage(socket, resCode, processed.msg.accessToken, { status: "OK", msg: "All good" });
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
 * 
 * @param {socket} socket Socket that received the request.
 * @param {string} resCode String used in emitting.
 * @param {string} msg Message to parse.
 * @param {array} keys Keys that need to be present in the message.
 */
async function processIncomingMsg(socket, resCode, msg, keys) {
    msg = await decryptMessage(socket, resCode, msg);
    if (!msg) return undefined;
    msg = await checkJsonKeys(socket, resCode, msg, keys);
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
        for (const key in keys) {
            if (!msg.hasOwnProperty(key)) {
                throw new Error("Missing key (" + key + ") in: " + JSON.stringify(msg));
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
    msg = await authenticator.decryptMessage(msg);
        
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
    res = await authenticator.encryptMessage(accessToken, JSON.stringify(res));

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