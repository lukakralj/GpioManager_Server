/**
 * This module provides the socket.io endpoint for remote access.
 * It enables external communication to the server, which is executing all
 * other subtasks.
 * 
 * @module 
 * @author Luka Kralj
 * @version 1.0
 */

const app = require('express')();
const server = require('http').Server(app);

const io = require('socket.io')(server);
const logger = require('./util/logger');
const config = require('../config/config.json');

logger.info("Server has started.");

logger.info("Starting authenticator...")
const authenticator = require('./util/authenticator');
logger.info("Authenticator has started.")

server.listen(config.port, () => {
    logger.info("Listening on port: " + config.port + "...");
});

let adminToken = undefined;

io.on('connection', (socket) => {
    logger.info(`Socket ${socket.id} connected`);
    //socket.emit("connected");

    socket.on("disconnect", () => {
        logger.info(`Socket ${socket.id} disconnected`);
    });

    socket.on("key", async (clientKey) => {
        adminToken = await authenticator.registerNewUsername("admin", clientKey);

        socket.emit("keyRes", authenticator.getServerPublicKey());
    });

    socket.on("msg", async (msg) => {
        console.log("Received encoded: " + msg);
        const decoded = await authenticator.decryptMessage(msg);
        console.log("Decrypted: " + decoded);

        const res = await authenticator.encryptMessage(adminToken, "all good ");

        socket.emit("res", res);
    });
});