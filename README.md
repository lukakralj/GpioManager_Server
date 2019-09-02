# Gpio Manager (Server)
A central hub for controlling GPIO pins on the Dragonboard 410c.

## Overview
The purpose of this server is to be able to receive remote requests for managing
the GPIO pins on the Dragonboard. This then enables a remote control of all the
devices that are then connected to GPIOs on the board without using a laptop.
The server is using https and allows connections from outside the board's 
network which enables the user to access the connected devices from anywhere.

## Configuration
There are three configuration files.
- **`config.json`**:  This is the main configuration file. Set `"ngrokOpts"` to have any parameters you wish
for establishing an ngrok connection. In addition, **use your own email in `"transporter"` field and change `"email_to"` field to the email you want to receive the server URL on.** I suggest using an email where two-step authentication is not used otherwise you are likely to experience problems.
- `db-config.json`: You do not need to change this as it depends on data that was set in `schema.sql`.
- `logger.json`: This configuration file controls how the server logs will look like and where they will be shown.
I suggest setting `"fileOutput"` option to `true` when running the server on startup as this will help identify the 
problem in case the server crashes.

## Setup

1. Install nodejs (v10) and npm (v6).

If you have a MySql server already installed on the Dragonboard skip steps 2-6.

2. Install MariaDB: `sudo apt-get install mariadb-server` (same usage as for mysql-server).
3. Run: `sudo mysql_secure_installation` and follow the instructions given.
4. Login to MySql server: `sudo mysql -u root -p`. Enter root password.
5. Run:
    GRANT ALL PRIVILEGES on *.* to 'root'@'localhost' IDENTIFIED BY '<password>';
    FLUSH PRIVILEGES;
Read more [here](https://stackoverflow.com/questions/28068155/access-denied-for-user-rootlocalhost-using-password-yes-after-new-instal).
6. Restart MySql server: `sudo service mysql restart`.
7. Create and populate a database: run `./path/to/db_setup/setup`. Provide password 
for MySql root. The script will import all the setup files.

N.B. If `setup` file is not executable, run `chmod u+x ./path/to/db_setup/setup` and try again.

8. In project folder run `npm i`.

## Starting the server
To start the server run `npm start`. Provide your root password if prompted. The server needs to run
as root to be able to access GPIOs.

To start the server on board startup edit `crontab` file.

1. Open editor: `sudo vim /etc/crontab`
2. At the bottom of the file add this line: `@reboot root cd /path/to/project && npm start`

Next time the DragonBoard boots the server will start automatically. Thus you won't need to
start the server manually - in some cases this eliminates the need for using a laptop.

## Usage

When the server is started, it will email you its URL. You can send requests via this URL. If you are using GpioManager_App (see my other repo), use this URL to connect to the Dragonboard.

**_N.B._ On the Dragonboard ommunicate with the server via the terminal. This will allow you to stop the server properly. Exiting with a Ctrl+C might lead to some files not being cleaned up.**