/**
 * This module will be converted into a service and will send an email containing IP information 
 * every time a Dragonboard starts up. This will enable SSH usage without the need for screen (to
 * obtain an IP of the board).
 * 
 * To schedule this task to run on every start up add this line to /etc/crontab:
 *    @reboot root cd /path/to/ip_service && npm start
 * 
 * @module ip-service
 * @author Luka Kralj
 * @version 1.0
 */

const nodeMailer = require("nodemailer");
const email_config = require('./email-config.json');
const exec = require('child_process').exec;
const matchAll = require("match-all");

const publicIpCmd = "curl ifconfig.me";
const localIpCmd = "hostname -I";
const memesCmd = "curl https://www.memedroid.com/memes/top/week/";

execute();

async function execute() {
    let publicIP = undefined;
    let localIP = undefined;
    do {
        publicIP = await cmdOutput(publicIpCmd);
        localIP = await cmdOutput(localIpCmd);
    } while(publicIP == undefined || localIP == undefined);

    let url = await getUrl();
    console.log(url);
    if (url == undefined) {
        url = "Oops... no meme today :/";
    }
    else {
        url = "<img src=\"" + url + "\"  alt=\"a fresh meme\">";
    }
    const html = `
<!DOCTYPE html>
<html>
<head>
<title>Dragonboard IPs</title>
</head>
<body>
${url}<br><br>
Local IP: ${localIP}<br>
Public IP: ${publicIP}
</body>
</html>
    `;

    let sent = false;
    do {
        sent = await sendEmail(html);
        await sleep(5000);
    }
    while (!sent);
}

/**
 * Executes the given command and returns the response of the command.
 * 
 * @param {string} cmd One of the constants above.
 * @param {number} timeout Number of milliseconds.
 * @returns {string} IP or undefined if an error occurred.
 */
async function cmdOutput(cmd, timeout = 10000) {
    let ip = undefined;
    let finished = false;
    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            console.log(err)
            console.log(stderr);
        }
        else {
            ip = stdout;
        }
        finished = true;
    });
    let time = 0;
    while(!finished && time < timeout) {
        time ++;
        await sleep(1);
    }
    return ip;
}

/**
 * 
 * @returns {string} A random url as string.
 */
async function getUrl() {
    const page = await cmdOutput(memesCmd, 20000);
    if (page == undefined) return undefined;
    const gifs = matchAll(page, /"https:\/\/([^\"\']*)gif"/g).toArray();
    const jpegs = matchAll(page, /"https:\/\/([^\"\']*)jpeg"/g).toArray();
    let url = undefined;
    const i = randInt(0, 3);

    if (i == 0) {
        // use jpeg
        if (jpegs.length == 0) {
            i++;
        }
        else {
            url = "https://" + jpegs[randInt(0, jpegs.length)] + "jpeg";
        }
    }

    if (i != 0) {
        // use gif
        if (gifs.length != 0) {
            url = "https://" + gifs[randInt(0, gifs.length)] + "gif"; 
        }
    }
    return url;
}

/**
 * Generates a random integer.
 *
 * @param {number} min Lower bound.
 * @param {number} max Upper bound.
 * @returns {number} Random integer.
 */
function randInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}


 /**
  * Sends an email.
  * 
  * @param {string} html Content of an email.
  * @returns {boolean} True if email successfully sent, false otherwise.
  */
async function sendEmail(html) {
    const transporter = nodeMailer.createTransport(email_config.transporter);

    const receiverOptions = {
        from: transporter.options.auth.user,
        to: "luka.kralj2@gmail.com",
        subject: "IP configuration for Dragonboard",
        html: html
    };

    let successful = false;
    let finished = false;
    await transporter.sendMail(receiverOptions, (err) => {
        if (err) {
            console.log(err);
            successful = false;
        } else {
            console.log("Email sent successfully to: " + receiverOptions.to + ".");
            successful = true;
        }
        transporter.close();
        finished = true;
    });
    while (!finished) {
        await sleep(1);
    }
    return successful;
}

/**
 * Await for this function to pause execution for a certain time.
 *
 * @param {number} ms Time in milliseconds
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}