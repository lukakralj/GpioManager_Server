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
    verifyPassword,
    generateNewHash,
    registerNewUserSession,
    verifyToken,
    removeUserSession
}

const tokenGenerator = require('./token-generator');
const crypto = require('crypto');

/**
 * {
 *   token1: {
 *     username: string,
 *     expires: Date,
 *     publicKey: key
 *   },
 *   ...
 * }
 */
const accessTokens = {}
const ACCESS_TOKEN_VALIDITY_DAYS = 10;


/**
 * Produce random iterations.
 * 
 * @returns {integer} Number of iterations. 
 */
function produceIterations() {
    const min = 3000;
    const max = 5000;
    const random = Math.floor(Math.random() * (+max - +min)) + +min;
    return random;
}

/**
 * Produce random salt for the password.
 * 
 * @returns {string} Random salt.
 */
function produceSalt() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Produce the hash for the password with given parameters.
 * 
 * @param {string} password Password to hash.
 * @param {string} salt Salt for this password.
 * @param {integer} iterations Number of iterations to use with hashing.
 * @returns {string} Hash for the password.
 */
function generateHash(password, salt, iterations) {
    return crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha256').toString('hex');
}

/**
 * Produce hash for the password. Salt and iterations will be assigned randomly.
 * @param {string} password Password to hash.
 * @returns {JSON} {
 *              hash: string,
 *              salt: string,
 *              iterations: integer
 *          }
 */
function generateNewHash(password) {
    const salt = produceSalt();
    const iterations = produceIterations();
    const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha256').toString('hex');
    return {
        hash: hash,
        salt: salt,
        iterations: iterations
    };
}

/**
 * Compare the attempted password to the saved password.
 * 
 * @param {string} attempt Attempted password - not hashed.
 * @param {string} hashed Saved password.
 * @param {string} savedSalt Salt for the saved password.
 * @param {integer} savedIterations Number of iterations for the saved password.
 * @returns {boolean} True if passwords match, false if they do not.
 */
function verifyPassword(attempt, hashed, savedSalt, savedIterations) {
    return hashed === generateHash(attempt, savedSalt, savedIterations);
}

/**
 * Verifies user using the accessToken.
 *
 * @param {string} accessToken Token used for identification.
 * @returns Username of the user or undefined if token is invalid.
 */
async function verifyToken(accessToken) {
    if (!(accessToken in accessTokens)) {
        return undefined;
    }
    const expires = new Date(accessTokens[accessToken].expires);
    if ((expires - new Date()) <= 0) {
        // Token has expired.
        delete accessTokens[accessToken];
        return undefined;
    }
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + ACCESS_TOKEN_VALIDITY_DAYS);
    accessTokens[accessToken].expires = newExpiry;

    return accessTokens[accessToken].username;
}

/**
* Register the given username with a login token that is
* used in authorisation of the requests.
*
* @param {string} username A valid username.
* @param {object} userPublicKey User's public key to encrypt messages with.
* @returns {string} A login token for this user.
*/
async function registerNewUserSession(username, userPublicKey) {
    const token = tokenGenerator.generateAccessToken();
    const expires = new Date();
    expires.setDate(expires.getDate() + ACCESS_TOKEN_VALIDITY_DAYS);
    accessTokens[token] = { username: username, expires: expires, publicKey: userPublicKey };

    return token;
}

/**
 * Delete access token for this user.
 *
 * @param {string} accessToken Token used for identification.
 * @returns {boolean} True if token successfully deleted, false if invalid token.
 */
async function removeUserSession(accessToken) {
    if (await verifyToken(accessToken)) {
        delete accessTokens[accessToken];
        return true;
    }
    else {
        return false;
    }
}