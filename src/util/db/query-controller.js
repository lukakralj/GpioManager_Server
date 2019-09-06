/**
 * This module enables execution of the basic queries.
 * 
 * @author Luka Kralj
 * @version 1.0
 * 
 * @module db-controller
 */

module.exports = {
    getUser,
    getComponents,
    addComponent,
    addUser,
    updateComponent,
    removeComponent
};

const mysql = require("mysql");
const db = require('./db-controller');

//=========================================
//    SELECT
//=========================================

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

/**
 * @returns {Array} List of all the components.
 */
async function getComponents() {
    const sql = "SELECT * FROM Components";

    const res = await db.selectQuery(sql);
    return res.response.rows;
}


//=========================================
//    INSERT
//=========================================


async function addComponent(physicalPin, direction, name, description=undefined) {
    let sql = "INSERT INTO Components(physicalPin,direction,name,description) VALUES (?,?,?,?)";
    sql = mysql.format(sql, [physicalPin, direction, name, description]);

    return await db.insertQuery(sql);
}

async function addUser(username, hash, salt, iterations) {
    let sql = "INSERT INTO Users VALUES (?,?,?,?)";
    sql = mysql.format(sql, [username, hash, salt, iterations]);

    return await db.insertQuery(sql);
}

//=========================================
//    UPDATE
//=========================================


async function updateComponent(id, physicalPin, direction, name, description=undefined) {
    let sql = "UPDATE Components SET physicalPin=?, direction=?, name=?, description=? WHERE id=?";
    sql = mysql.format(sql, [physicalPin, direction, name, description, id]);

    return await db.updateQuery(sql);
}

//=========================================
//     DELETE
//=========================================


async function removeComponent(id) {
    let sql = "DELETE FROM Components WHERE id=?";
    sql = mysql.format(sql, [id]);

    return await db.deleteQuery(sql);
}