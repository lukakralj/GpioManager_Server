# Gpio Manager (Server)
Server that allows remote control of GPIO pins on the DragonBoard 410c through a [mobile app](https://github.com/lukakralj/GpioManager_App).

## Aim
The purpose of this server is to be able to receive remote requests for managing
the GPIO pins on the DragonBoard (DB). This then enables a remote control of all the
devices that are currently connected to GPIOs on the DB without using a laptop.
The server allows connections from outside the board's network which enables the 
user to access the connected devices from anywhere. The server is notifying all the connected
devices about any updates in real time, so the data on all the devices is consistent at all times.

Below you can see a sample setup and how this setup reflects in the [mobile app](https://github.com/lukakralj/GpioManager_App) that connects to this server:

![Sample DragonBoard setup with a sound chip and a switch.](./images/sample_setup.jpg?raw=true "Sample DragonBoard setup with a sound chip and a switch.")

![The setup above viewed from the mobile app.](./images/components_screen.png?raw=true "The setup above viewed from the mobile app.")

## Configuration
There are three configuration files.
- **`config.json`**:  This is the main configuration file. Set `"ngrokOpts"` to have any parameters you wish
for establishing an ngrok connection. In addition, **use your own email in `"transporter"` field and change `"email_to"` field to the email you want to receive the server URL on.** In "transporter", I suggest using an email where a two-step authentication is not used otherwise you are likely to experience problems.
- `db-config.json`: You do not need to change this as it depends on data that was set in `schema.sql`.
- `logger.json`: This configuration file controls how the server logs will look like and where they will be shown.
I suggest setting `"fileOutput"` option to `true` when running the server on startup as this will help identify the 
problem in case the server crashes.

## Setup

1. Install nodejs (v10) and npm (v6).

If you have a MySql server already installed on the Dragonboard skip steps 2-6.

2. Install MariaDB: `sudo apt-get install mariadb-server` (same usage as for mysql-server).
3. Run: `sudo mysql_secure_installation` and follow the instructions on the screen.
4. Login to MySql server: `sudo mysql -u root -p`. Enter root password.
5. Run: `GRANT ALL PRIVILEGES on *.* to 'root'@'localhost' IDENTIFIED BY '<password>'; FLUSH PRIVILEGES;`
Read more about why to do this [here](https://stackoverflow.com/questions/28068155/access-denied-for-user-rootlocalhost-using-password-yes-after-new-instal).
6. Restart MySql server: `sudo service mysql restart`.
7. Create and populate a database: run `./path/to/db_setup/setup`. Provide password 
for MySql root, when prompted. The script will import all the setup files.

N.B. If `setup` file is not executable, run `chmod u+x ./path/to/db_setup/setup` and try again.

8. In project folder run `npm i`.

The server is now ready to run.

### User setup
There is one user already registered on the system. Username is 'admin', and password is 'admin'. To remove this user
log into MySql server (run `mysql -u root -p GpioManagerDB`), and then run `DELETE FROM Users WHERE username='admin'`.

If you wish to create a new user, from the project folder, run `npm run newuser`.
This will start a script that will prompt you for user details. If the details entered are correct the user will
be stored on the system and you will be able to use these details to log in.

## Starting the server
To start the server run `npm start`. Provide your root password, if prompted. The server needs to run
as root to be able to access and modify GPIOs.

To start the server every time the DB boots edit `crontab` file.

1. Open editor: `sudo vim /etc/crontab`
2. At the bottom of the file add this line: `@reboot root cd /path/to/project && npm start`

Next time the DB boots the server will start automatically. Thus you won't need to
start the server manually - in some cases this eliminates the need for using a laptop altogether.

## Usage

When the server is started, it will email you its URL. You can send requests via this URL. If you are using [GpioManager_App](https://github.com/lukakralj/GpioManager_App), use this URL to connect to the Dragonboard.

There is a simple CLI implemented for communication with the server. Type 'help' in the server STDIN to see the valid commands.

**_N.B._ On the DragonBoard communicate with the server via the terminal (it's STDIN). This will allow you to stop the server properly. Exiting with a Ctrl+C might lead to some files not being cleaned up.**

### Feedback
Whether you liked the project or not, I would be very thankful for any feedback, suggestions or comments on the project.

*Feel free to [email](mailto:luka.kralj2@gmail.com) me!*
