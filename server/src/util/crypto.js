/**
 * This module provides the functionalities that concern data encryption and security.
 * It provides functions for RSA encryption and decryption, as well as access token
 * control for the logged-in users.
 * 
 * @module authenticator
 * @author Luka Kralj
 * @version 1.0
 */

module.exports = {
    getRSAPublicKey,
    rsaEncrypt,
    rsaDecrypt,
    aesEncrypt,
    aesDecrypt
}


const logger = require('./logger');
const crypto = require('crypto');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
        type: 'spki',
        format: "der"
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});

/**
 * Return the public key for the server.
 * 
 * @returns {object} RSA public key.
 */
async function getRSAPublicKey() {
    return publicKey.toString('base64');
}

/**
 * Encrypt the message for the user which identifies with this token.
 * 
 * @param {string} token User's access token.
 * @param {string} msg Message to encrypt.
 * @returns{string} Message encrypted as base64 string.
 */
async function rsaEncrypt(clientRsaKey, msg) {
    const buffer = Buffer.from(msg);
    clientRsaKey = "-----BEGIN PUBLIC KEY-----\n" + clientRsaKey + "-----END PUBLIC KEY-----";
    let encrypted = undefined;
    try {
        encrypted = crypto.publicEncrypt(clientRsaKey, buffer);
    }
    catch (err) {
        logger.error(err);
        return undefined;
    }
    return encrypted.toString('base64');
}

/**
 * Decrypt the message that was sent to the server. The message should have
 * been encrypted with the server's current public key.
 * 
 * @param {string} msg Message encrypted as base64 string.
 * @returns {string} Decrypted message in UTF-8 encoding.
 */
async function rsaDecrypt(msg) {
    const buffer = Buffer.from(msg, "base64");
    let decrypted = undefined;
    try {
        decrypted = crypto.privateDecrypt(privateKey, buffer);
    }
    catch (err) {
        logger.error(err);
        return undefined;
    }
    return decrypted.toString("utf8");
}
 /**
  * Encrypt message for the client using AES.
  * 
  * @param {string} aesKey AES key of a client.
  * @param {string} msg Message to encrypt.
  */
async function aesEncrypt(aesKey, msg) {
    // generate IV
    const iv = crypto.randomBytes(16);
    // encrypt message
    let encrypted = '';
    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    encrypted += cipher.update(Buffer.from(msg), 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // add IV to message
    encrypted += iv.toString('base64');

    return encrypted;
}

/**
 * Encrypt using the client AES key.
 * 
 * @param {string} aesKey AES key of the client.
 * @param {string} msg Base64 encoded string.
 */
async function aesDecrypt(aesKey, msg) {
    // separate IV
    const iv = msg.slice(-24);
    msg = msg.substring(0, msg.length - 24)
    // decrypt
    const cipher = crypto.createDecipheriv('aes-256-cbc', aesKey,  Buffer.from(iv, 'base64'));
    msg += cipher.update(Buffer.from(msg, 'base64'), 'base64', 'utf8');
    msg += cipher.final('utf8');

    return msg;
}