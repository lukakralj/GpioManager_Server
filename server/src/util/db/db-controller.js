/**
 * This module enables execution of the basic queries.
 * 
 * @author Luka Kralj
 * @version 1.0
 * 
 * @module db-controller
 */

module.exports = {
    selectQuery,
    insertQuery,
    deleteQuery,
    updateQuery,
    updateAccessToken,
    deleteAccessToken
};

const mysql = require("mysql");
const databaseConfig = require("../../../config/db-config");
const Database = require("./Database");
const logger = require('../logger');
const dateformat = require('dateformat');

/**
 * Call this for SELECT queries.
 *
 * @param {string} sql The SQL query.
 * @returns {Promise<JSON>} JSON object that contains response data or error message, if the query was unsuccessful.
 */
async function selectQuery(sql) {
    return await nonCriticalQuery(sql, "select", async (result) => {
        const rows_ = [];
        for (const key in result) {
            rows_.push(result[key]);
        }
        return {
            query: "OK",
            rows: rows_
        }
    });
}

/**
 * Call this for INSERT queries.
 *
 * @param {string} sql The SQL query.
 * @returns {Promise<JSON>} JSON object that contains response data or error message, if the query was unsuccessful.
 */
async function insertQuery(sql) {
    return await nonCriticalQuery(sql, "insert", async (result) => {
        return await {
            query: "OK",
            affectedRows: result.affectedRows,
            insertId: result.insertId
        }
    });
}

/**
 * Call this for DELETE queries.
 *
 * @param {string} sql The SQL query.
 * @returns {Promise<JSON>} JSON object that contains response data or error message, if the query was unsuccessful.
 */
async function deleteQuery(sql) {
    return await nonCriticalQuery(sql, "delete", async (result) => {
        return await {
            query: "OK",
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        }
    });
}

/**
 * Call this for UPDATE queries.
 *
 * @param {string} sql The SQL query.
 * @param {string} entryTable Name of the table involved in the query.
 * @param {string} entryID Key of the entry that is being updated.
 * @param {string} token Token that is used for verifying the edit permissions.
 * @returns {Promise<JSON>} JSON object that contains response data or error message, if the query was unsuccessful.
 */
async function updateQuery(sql) {
    return await nonCriticalQuery(sql, "update", async (result) => {
        return await {
            query: "OK",
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        }
    });
}

/**
 * Updates the expiration of an access token specified.
 *
 * @param {string} accessToken - Access token we are editing.
 * @param {Date} newExpiration New expiration for this token.
 * @returns {Promise<JSON>} JSON object that contains response data or error message.
 */
async function updateAccessToken(accessToken, newExpiration) {
    let sql = "UPDATE AccessTokens SET expiration = ? WHERE token = ?";
    sql = mysql.format(sql, [dateformat(newExpiration, "yyyymmddHHMMss"), accessToken]);
    const database = new Database(databaseConfig);
    const res = await getResult(sql, database, () => {
        return {success: true};
    });
    database.close();
    if (!res.success) {
        logger.error("Could not update access token expiration in the DB.");
    }
    return res;
}

/**
 * Deletes the access token specified.
 *
 * @param {string} accessToken - Access token we are editing.
 * @returns {Promise<JSON>} JSON object that contains response data or error message.
 */
async function deleteAccessToken(accessToken) {
    let sql = "DELETE FROM AccessTokens WHERE token = ?";
    sql = mysql.format(sql, [accessToken]);
    const database = new Database(databaseConfig);
    const res = await getResult(sql, database, () => {
        return {success: true};
    });
    database.close();
    if (!res.success) {
        logger.error("Could not delete access token in the DB.");
    }
    return res;
}

//=====================================
//  HELPER FUNCTIONS BELOW:
//=====================================

/**
 * A helper function for insertQuery and selectQuery.
 *
 * @param {string} sql The SQL query.
 * @param {string} type "select" or "insert"
 * @param {function} treatResponse This function is called to format the query response, if 
 *                                  the query was successful.
 * @returns {Promise<JSON>} JSON object that contains response data or error message, if the query was unsuccessful.
 */
async function nonCriticalQuery(sql, type, treatResponse) {
    if (!startsWith(sql, type)) {
        throw new Error("Invalid use of " + type + "Query.");
    }
    const database = new Database(databaseConfig);
    const response = await getResult(sql, database, treatResponse);
    database.close();

    return response;
}

/**
 * Helper function that executes the query.
 *
 * @param {string} sql Query to execute.
 * @param {Database} database Database object to execute the query on.
 * @param {function} treatResponse Decide how the response of a successful query is modified.
 * @returns {JSON} Result of the query or error response, if query unsuccessful.
 */
async function getResult(sql, database, treatResponse) {
    let result = undefined;
    try {
        result = await database.query(sql);
    }
    catch(err) {
        const errResponse = await getSQLErrorResponse(err);
        return errResponse;
    }
    const treated = await treatResponse(result);
    return await getSuccessfulResponse(treated);
}

/**
 * Formats the error response to give some information about the query error
 * (type, code, error number, SQL message).
 *
 * @param {Error} err Error thrown by the database query function.
 * @returns {JSON} Formatted error response.
 */
function getSQLErrorResponse(err) {
    return {
        success: false,
        err: {
            type: "SQL Error",
            code: err.code,
            errno: err.errno,
            sqlMessage: err.sqlMessage
        }
    };
}

/**
 * Formats a successful response. Enables all responses to follow the same format.
 *
 * @param {JSON} response Preformatted query-specific response.
 * @returns {JSON} A formatted response.
 */
function getSuccessfulResponse(response_) {
    return {
        success: true,
        response: response_
    }
}

/**
 * Shorthand function for comparing the start of a string. Leading spaces
 * and capitalisation are ignored.
 *
 * @param {string} toCheck A string the start of which we want to check.
 * @param {string} compareTo A string that should appear at the start of the toCheck.
 * @returns {boolean} True if toCheck starts with compareTo, false otherwise.
 */
function startsWith(toCheck, compareTo) {
    return toCheck.trim().toLowerCase().startsWith(compareTo.toLowerCase());
}