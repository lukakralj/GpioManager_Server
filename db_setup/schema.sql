-- ====================================================
-- N.B. This is the development schema only
--      as it deletes all data before being recreated.
--
-- @author Luka Kralj
-- ====================================================

-- TODO: remove 
DROP DATABASE IF EXISTS GpioManagerDB;
DROP USER IF EXISTS GpioManagerAdmin;

CREATE DATABASE IF NOT EXISTS GpioManagerDB;

USE GpioManagerDB;

-- Create user that is used in the DBMS to avoid using root.
GRANT ALL PRIVILEGES ON GpioManagerDB.*
    TO 'GpioManagerAdmin'@'localhost'
    IDENTIFIED BY "GpioManager_admin1";

DROP TABLE IF EXISTS AccessTokens;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Components;

-- ================================================
--          Core functionality
-- ================================================

CREATE TABLE Components (
    id INTEGER AUTO_INCREMENT,
    physicalPin INTEGER NOT NULL UNIQUE,
    direction ENUM("in", "out") NOT NULL DEFAULT "out",
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    PRIMARY KEY (id)
);

-- ================================================
--              User management
-- ================================================

CREATE TABLE Users (
    username VARCHAR(100),
    hashedPassword VARCHAR(255) NOT NULL,
    isAdmin ENUM("yes", "no") NOT NULL DEFAULT "no",
    salt VARCHAR(255) NOT NULL,
    iterations INTEGER NOT NULL,
    recoveryEmail VARCHAR(100) NOT NULL,
    PRIMARY KEY (username)
);

CREATE TABLE AccessTokens (
    token VARCHAR(191), -- Set to 191 because if set to 255 this error occurs:
                        -- ERROR 1071 (42000) at line 47: Specified key was too long; max key length is 767 bytes
    username VARCHAR(100) NOT NULL,
    expiration DATETIME NOT NULL,
    PRIMARY KEY (token),
    FOREIGN KEY (username) REFERENCES Users(username)
);
