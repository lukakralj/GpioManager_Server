/** 
 * This module enables to create and store a new user.
 * 
 * @module setup-new-user
 * @author Luka Kralj
 * @version 1.0
 */

(require('./util/logger')).changeOption("consoleOutput", false);

const authenticator = require('./util/authenticator');
const query_controller = require('./util/db/query-controller');
var prompt = require('prompt');
prompt.start();

const usernamePrompt = "Please enter the username";
const passwordPrompt = "Please enter the user password";
const repeatPasswordPrompt = "Please enter the user password again";

console.log("===== Begin setting up a new user =====");

var promptSchema = {
properties: {
        username: {
            description: usernamePrompt,
            pattern: /^[a-zA-Z0-9]+/,
            message: 'Username must be only letters and numbers.',
            required: true
        },
        password: {
            description: passwordPrompt,
            hidden: true,
            replace: '*',
            required: true
        },
        passwordAgain: {
            description: repeatPasswordPrompt,
            hidden: true,
            replace: '*',
            required: true
        }
    }
};

getData();

/**
 * Retrieves the needed data. Recursively calls itself if data is invalid.
 */
function getData() {
    prompt.get(promptSchema, async (err, result) => {
        let usernameOk = await checkUsername(result.username);
        if (! usernameOk) {
            console.log("Please re-enter the details:")
            getData();
            return;
        }

        let passwordOk = await checkPassword(result.password, result.passwordAgain);
        if (!passwordOk) {
            console.log("Please re-enter the details:")
            getData();
            return;
        }

        const passwordData = await authenticator.generateNewHash(result.password);
        const res = await query_controller.addUser(result.username, passwordData.hash, passwordData.salt, passwordData.iterations);
        if (res.success) {
            console.log("New user successfully created.");
        }
        else {
            console.log("Error occured:");
            console.log(res);
        }
        console.log("===== User setup finished =====");
    });
}

/**
 * Verify that the username is unique and long enough.
 * 
 * @param {string} username Username entered.
 * @returns {boolean} True if username is ok, false if not.
 */
async function checkUsername(username) {
    username = username.trim();
    if (username.length < 5) {
        console.log("Username is too short.");
        return false;
    }
    // Check if username already exists.
    if (!query_controller.getUser(username)) {
        console.log("Username already exits.");
        return false;
    }
    return true;
}

/**
 * Verify that the passwords match and that they are long enough.
 * 
 * @param {string} password First password entered.
 * @param {string} passwordAgain Second password entered.
 * @returns {boolean} True if password is ok, false if not.
 */
async function checkPassword(password, passwordAgain) {
    if (password.length < 5) {
        console.log("Password is too short.");
        return false;
    }
    if (password != passwordAgain) {
        console.log("Passwords must match.");
        return false;
    }
    return true;
}
