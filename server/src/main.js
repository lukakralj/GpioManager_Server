/**
 * 
 * @module server
 * @author Luka Kralj
 * @version 1.0
 */


const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(http);
const logger = require('./util/logger');
const config = require('../config/config.json');

server.listen(config.port, () => {
    logger.info("Listening on port: " + config.port + "...");
});

io.on('connection', (socket) => {
    logger.info(`Socket ${socket.id} connected`);
    socket.emit("connected");

    socket.on("disconnect", () => {
        logger.info(`Socket ${socket.id} disconnected`);
    });
});