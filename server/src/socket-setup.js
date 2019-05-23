/**
 * This module provides the socket.io endpoint for remote access.
 * It enables external communication to the server, which is executing all
 * other subtasks.
 * 
 * @module 
 * @author Luka Kralj
 * @version 1.0
 */

/*
REFACTOR IDEA: 
Put all groups of setup functions in a separate file. For example, all components
endpoints are put in one function in a different file. This function is then 
called from (socket) => {} function (top level of io.on()). The file with 
components setup function imports a module with setup-util functions (processIncomingMessage etc.).
*/

//----- SOCKET IO ------
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

//------ UTILS -------
const logger = require('./util/logger');
const config = require('../config/config.json');
const errCodes = require('./err-codes');
const authenticator = require('./util/authenticator');
const queryController = require('./util/db/query-controller');
const compManager = require('./modules/components-manager');
const cli = require('./cli');

//----- SETUP ----
server.listen(config.port, () => {
    logger.info("Server listening on port: " + config.port + "...");
});

cli.registerCommand("stop", onStop);

/** Used to notify all that a change in components has happened. */
const componentsChangeCode = "componentsChange";
const componentsRoom = "componentsRoom";

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

        if (!(await verifyUser(msg))) {
            socket.emit(resCode, { status: "ERR", err_code: errCodes.BAD_AUTH });
            return;
        }

        const accessToken = await authenticator.registerNewUserSession(msg.username, msg.clientKey);

        sendMessage(socket, resCode, accessToken, { status: "OK", accessToken: accessToken });
    });

    /** Requires access token. */
    socket.on("joinComponentsRoom", async (msg) => {
        const resCode = "joinComponentsRoomRes";
        const processed = await processIncomingMsg(socket, resCode, msg, []); 
        if (!processed) return;
  
        socket.join(componentsRoom);
        logger.info(`Socket ${socket.id} joined ${componentsRoom}.`);

        socket.emit(resCode, { status: "OK"});
    });

    socket.on("leaveComponentsRoom", async () => {
        const resCode = "leaveComponentsRoomRes";
  
        socket.leave(componentsRoom);
        logger.info(`Socket ${socket.id} left ${componentsRoom}.`);

        socket.emit(resCode, { status: "OK"});
    });

    socket.on("components", async (msg) => {
        const resCode = "componentsRes";
        const processed = await processIncomingMsg(socket, resCode, msg, []); 
        if (!processed) return;
  
        const components = await compManager.getComponents();

        sendMessage(socket, resCode, processed.msg.accessToken, { status: "OK", components: components });
    });

    /** Required: {id: integer, status: "on" | "off"} */
    socket.on("toggleComponent", async (msg) => {
        const resCode = "toggleComponentRes";
        const processed = await processIncomingMsg(socket, resCode, msg, ["id", "status"]); 
        if (!processed) return;
  
        let success;
        let res;
        try {
            success = await compManager.toggleComponent(processed.msg.id, processed.msg.status);
            res = (success) ? { status: "OK"} : {status: "ERR", err_code: errCodes.SERVER_ERR};
        } 
        catch(err) {
            logger.error(err);
            res = {status: "ERR", err_code: errCodes.INVALID_FORMAT};
        }
         
        sendMessage(socket, resCode, processed.msg.accessToken, res);
        io.in(componentsRoom).emit(componentsChangeCode);
    });

    /** Required: {id: integer, data: json} */
    socket.on("updateComponent", async (msg) => {
        const resCode = "updateComponentRes";
        const processed = await processIncomingMsg(socket, resCode, msg, ["id", "data"]); 
        if (!processed) return;
  
        const success = await compManager.updateComponent(processed.msg.id, processed.msg.data);
        const res = (success) ? { status: "OK" } : {status: "ERR", err_code: errCodes.SERVER_ERR};
        sendMessage(socket, resCode, processed.msg.accessToken, res);
        io.in(componentsRoom).emit(componentsChangeCode);
    });

    /** Required: {data: json} */
    socket.on("addComponent", async (msg) => {
        const resCode = "addComponentRes";
        const processed = await processIncomingMsg(socket, resCode, msg, ["data"]); 
        if (!processed) return;
  
        const id = await compManager.addComponent(processed.msg.data);
        const res = (id != undefined) ? { status: "OK", id: id} : {status: "ERR", err_code: errCodes.INVALID_FORMAT};
        sendMessage(socket, resCode, processed.msg.accessToken, res);
        io.in(componentsRoom).emit(componentsChangeCode);
    });

    /** Required: {id: integer} */
    socket.on("removeComponent", async (msg) => {
        const resCode = "removeComponentRes";
        const processed = await processIncomingMsg(socket, resCode, msg, ["id"]); 
        if (!processed) return;
  
        const success = await compManager.removeComponent(processed.msg.id);
        const res = (success) ? { status: "OK"} : {status: "ERR", err_code: errCodes.SERVER_ERR};
        sendMessage(socket, resCode, processed.msg.accessToken, res);
        io.in(componentsRoom).emit(componentsChangeCode);
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
        const saved = await queryController.getUser(userData.username);

        if (saved &&
            authenticator.verifyPassword(userData.password, saved.hashedPassword, saved.salt, saved.iterations)) {
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
async function verifyToken(socket, responseCode, accessToken) {
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

async function onStop() {
    io.close(() => {
        logger.info("IO closed.");
    });
    server.close(() => {
        logger.info("Server closed.");
    });
}