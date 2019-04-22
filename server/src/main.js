/**
 * This module provides the socket.io endpoint for remote access.
 * 
 * @module 
 * @author Luka Kralj
 * @version 1.0
 */

const app = require('express')();
const fs = require('fs');
const path = require("path");

const key = fs.readFileSync(path.resolve('key.pem')); // path relative to where npm start was called from
const cert = fs.readFileSync(path.resolve('cert.pem'));

const server = require('http').Server({// TODO: use https and make client work with it
    key: key,
    cert: cert
}, app);

const io = require('socket.io')(server);
const logger = require('./util/logger');
const config = require('../config/config.json');

logger.info("Server has started.");

logger.info("Starting authenticator...")
const authenticator = require('./util/authenticator');
logger.info("Authenticator has started.")

logger.info("Server's public key is:" + authenticator.getServerPublicKey());

server.listen(config.port, () => {
    logger.info("Listening on port: " + config.port + "...");
});

io.on('connection', (socket) => {
    logger.info(`Socket ${socket.id} connected`);
    //socket.emit("connected");

    socket.on("disconnect", () => {
        logger.info(`Socket ${socket.id} disconnected`);
    });

    socket.on("msg", (msg) => {
        console.log("Received: " + msg);
        socket.emit("res", "all good");
    });
});