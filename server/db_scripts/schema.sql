-- ====================================================
-- N.B. This is the development schema only
--      as it deletes all data before being recreated.
--
-- @author Luka Kralj
-- ====================================================

CREATE DATABASE IF NOT EXISTS SmartHomeDB;

USE SmartHomeDB;

-- Create user that is used in the DBMS to avoid using root.
GRANT ALL PRIVILEGES ON BloodTestDB.*
    TO 'smartHomeAdmin'@localhost
    IDENTIFIED BY "SmartHome_admin1";

DROP TABLE IF EXISTS AccessTokens;
DROP TABLE IF EXISTS User;


CREATE TABLE User (
    username VARCHAR(100),
    hashed_password VARCHAR(255) NOT NULL,
    isAdmin ENUM("yes", "no") NOT NULL DEFAULT "no",
    salt VARCHAR(255) NOT NULL,
    iterations INTEGER NOT NULL,
    recovery_email VARCHAR(100) NOT NULL,
    PRIMARY KEY (username)
);

CREATE TABLE AccessTokens (
    token VARCHAR(255),
    username VARCHAR(100) NOT NULL,
    expiration DATETIME NOT NULL,
    PRIMARY KEY (token),
    FOREIGN KEY (username) REFERENCES User(username)
);
