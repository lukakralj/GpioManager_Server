/**
 * This module provides the functionalities that concern data encryption and security.
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
const db_controller = require('./db/db-controller');
const logger = require('./logger');
const mysql = require('mysql');

/**
 * {
 *   token1: {
 *     username: string,
 *     expires: Date,
 *   },
 *   ...
 * }
 */
const accessTokens = {}
const ACCESS_TOKEN_VALIDITY_DAYS = 10;
initTokens();

/**
 * Retrieves all access tokens (if any) from the database and creates a lookup table for
 * faster access.
 */
async function initTokens() {
    const res = await db_controller.selectQuery("SELECT * FROM AccessTokens");
    if (!res.success) {
        logger.error("Could not initialise tokens from the DB. Response: " + JSON.stringify(res));
        return;
    }
    const rows = res.response.rows;
    for (let i = 0; i < rows.length; i++) {
        accessTokens[rows[i].token] = {
            username: rows[i].username,
            expires: rows[i].expiration
        }
    }
    logger.info("Successfully loaded " + rows.length + " token(s) from the DB.");
}

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
        db_controller.deleteAccessToken(accessToken)
            .then((res) => {
                if (res.success) {
                    logger.info("Access token successfully deleted.")
                }
                else {
                    logger.error("Error deleting access token. Response: " + JSON.stringify(res));
                }
            });
        return undefined;
    }
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + ACCESS_TOKEN_VALIDITY_DAYS);
    accessTokens[accessToken].expires = newExpiry;
    db_controller.updateAccessToken(accessToken, newExpiry)
        .then((res) => {
            if (!res.success) {
                logger.error("Error updating access token. Response: " + JSON.stringify(res));
            }
        });

    return accessTokens[accessToken].username;
}

/**
* Register the given username with a login token that is
* used in authorisation of the requests.
*
* @param {string} username A valid username.
* @returns {string} A login token for this user.
*/
async function registerNewUserSession(username) {
    const token = tokenGenerator.generateAccessToken();
    const expires = new Date();
    expires.setDate(expires.getDate() + ACCESS_TOKEN_VALIDITY_DAYS);
    accessTokens[token] = { username: username, expires: expires };
    let sql = "INSERT INTO AccessTokens VALUES (?, ?, ?)";
    sql = mysql.format(sql, [token, username, expires]);
    db_controller.insertQuery(sql)
        .then((res) => {
            if (res.success) {
                logger.info("Access token successfully stored.")
            }
            else {
                logger.error("Error storing access token. Response: " + JSON.stringify(res));
            }
        });
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
        db_controller.deleteAccessToken(accessToken)
            .then((res) => {
                if (res.success) {
                    logger.info("Access token successfully deleted.")
                }
                else {
                    logger.error("Error deleting access token. Response: " + JSON.stringify(res));
                }
            });
        return true;
    }
    else {
        return false;
    }
}