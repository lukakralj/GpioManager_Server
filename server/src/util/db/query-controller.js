/**
 * This module enables execution of the basic queries.
 * 
 * @author Luka Kralj
 * @version 1.0
 * 
 * @module db-controller
 */

module.exports = {
    getUser
};

const mysql = require("mysql");
const logger = require('../logger');
const db = require('./db-controller');

/**
 * 
 * @param {string} username User we want to retrieve.
 * @returns {JSON} All user data or undefined if such user does not exist. 
 */
async function getUser(username) {
    let sql = "SELECT * FROM Users WHERE username = ?";
    sql = mysql.format(sql, username);

    const res = await db.selectQuery(sql);
    return (res.response.rows.length > 0) ? res.response.rows[0] : undefined;
}