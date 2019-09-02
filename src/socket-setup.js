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

//------ UTILS -------
const logger = require('./util/logger');
const config = require('../config/config.json');
const errCodes = require('./err-codes');
const authenticator = require('./util/authenticator');
const queryController = require('./util/db/query-controller');
const compManager = require('./modules/components-manager');
const cli = require('./cli');
const path = require("path");

//----- SOCKET IO ------
logger.info("Initialising Socket.IO...");
const fs = require('fs');
logger.info("Reading SSL certificates...");
const options = {
    key: fs.readFileSync(path.resolve(__dirname, './../config/server.key')),
    cert: fs.readFileSync(path.resolve(__dirname, './../config/server.crt'))
};
logger.info("Certificates loaded.");
logger.info("Creating HTTPS server...");
const server = require('https').createServer(options);
const io = require('socket.io')(server);
logger.info("Socket.IO finished initialising.")

//----- SETUP ----
server.listen(config.ngrokOpts.addr, () => {// port same as in ngrok
    logger.info("Server listening on port: " + config.ngrokOpts.addr + ".");
});

cli.registerCommand("stop", onStop);

/** Used to notify all that a change in components has happened. */
const componentsChangeCode = "componentsChange";
const componentsRoom = "componentsRoom";

// start components listener
(require('./modules/components-listener')).startListener(() => {
    io.in(componentsRoom).emit(componentsChangeCode);
});


io.on('connection', (socket) => {
    logger.info(`Socket ${socket.id} connected`);

    socket.on("disconnect", () => {
        logger.info(`Socket ${socket.id} disconnected`);
    });

    /** Required: {username: string, password: string} */
    socket.on("login", async (msg) => {
        const resCode = "loginRes";

        const keysOk = await checkJsonKeys(socket, resCode, msg, ["username", "password"]);
        if (!keysOk) return;

        if (!(await verifyUser(msg))) {
            socket.emit(resCode, { status: "ERR", err_code: errCodes.BAD_AUTH });
            return;
        }

        const accessToken = await authenticator.registerNewUserSession(msg.username);

        sendMessage(socket, resCode, { status: "OK", accessToken: accessToken });
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

        sendMessage(socket, resCode, { status: "OK", components: components });
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
         
        sendMessage(socket, resCode, res);
        io.in(componentsRoom).emit(componentsChangeCode);
    });

    /** Required: {id: integer, data: json} */
    socket.on("updateComponent", async (msg) => {
        const resCode = "updateComponentRes";
        const processed = await processIncomingMsg(socket, resCode, msg, ["id", "data"]); 
        if (!processed) return;
  
        const success = await compManager.updateComponent(processed.msg.id, processed.msg.data);
        const res = (success) ? { status: "OK" } : {status: "ERR", err_code: errCodes.SERVER_ERR};
        sendMessage(socket, resCode, res);
        io.in(componentsRoom).emit(componentsChangeCode);
    });

    /** Required: {data: json} */
    socket.on("addComponent", async (msg) => {
        const resCode = "addComponentRes";
        const processed = await processIncomingMsg(socket, resCode, msg, ["data"]); 
        if (!processed) return;
  
        const id = await compManager.addComponent(processed.msg.data);
        const res = (id != undefined) ? { status: "OK", id: id} : {status: "ERR", err_code: errCodes.INVALID_FORMAT};
        sendMessage(socket, resCode, res);
        io.in(componentsRoom).emit(componentsChangeCode);
    });

    /** Required: {id: integer} */
    socket.on("removeComponent", async (msg) => {
        const resCode = "removeComponentRes";
        const processed = await processIncomingMsg(socket, resCode, msg, ["id"]); 
        if (!processed) return;
  
        const success = await compManager.removeComponent(processed.msg.id);
        const res = (success) ? { status: "OK"} : {status: "ERR", err_code: errCodes.SERVER_ERR};
        sendMessage(socket, resCode, res);
        io.in(componentsRoom).emit(componentsChangeCode);
    });

    socket.on("logout", async (msg) => {
        const resCode = "logoutRes";
        const processed = await processIncomingMsg(socket, resCode, msg, []);
        if (!processed) return;

        authenticator.removeUserSession(processed.msg.accessToken);

        sendMessage(socket, resCode, { status: "OK" });
    });

    socket.on("refreshToken", async (msg) => {
        const resCode = "refreshTokenRes";
        const processed = await processIncomingMsg(socket, resCode, msg, []); // insert any request specific keys (accessToken already included)
        if (!processed) return;

        // processIncomingMsg() already refreshes token validity.

        sendMessage(socket, resCode, { status: "OK" }); // define endpoint specific response
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

        sendMessage(socket, resCode, { status: "OK", msg: "example" }); // define endpoint specific response
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
    const username = await verifyToken(socket, resCode, msg.accessToken);
    if (!username) return undefined;

    const keysOk = await checkJsonKeys(socket, resCode, msg, keys);
    if (!keysOk) return undefined;
    
    return { msg: msg, username: username };
}

/**
 * Checks if the request received contains the compulsory keys.
 * 
 * @param {JSON} msg Message to parse.
 * @param {array} keys Keys that need to be present in the message.
 * @returns {boolean} True if keys are correct, false if not.
 */
async function checkJsonKeys(socket, resCode, msg, keys) {
    for (const i in keys) {
        if (!msg.hasOwnProperty(keys[i])) {
            logger.error("Missing key (" + keys[i] + ") in: " + JSON.stringify(msg));
            sendMessage(socket, resCode, { status: "ERR", err_code: errCodes.INVALID_FORMAT });
            return false;
        }
    }
    return true;
}

/**
 * Send the server response.
 * 
 * @param {socket} socket Socket that will send the response.
 * @param {string} responseCode String used in emitting.
 * @param {json} res Server response.
 */
async function sendMessage(socket, resCode, res) {
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
async function verifyToken(socket, resCode, accessToken) {
    if (!accessToken) {
        sendMessage(socket, resCode, { status: "ERR", err_code: errCodes.NO_AUTH });
        return undefined;
    }
    const username = await authenticator.verifyToken(accessToken);
    if (!username) {
        sendMessage(socket, resCode, { status: "ERR", err_code: errCodes.BAD_AUTH });
        return undefined;
    }
    return username;
}

async function onStop() {
    io.close(() => {
        logger.info("Socket.IO closed.");
    });
    server.close(() => {
        logger.info("Server closed.");
    });
}