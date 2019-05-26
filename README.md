# IoTControlServer
A central hub for controlling IoT devices through a DragonBoard.

## Setup

1. install nodejs (v10) and npm (v6)
2. install MariaDB: `sudo apt-get install mariadb-server` (same usage as for mysql-server)
3. create DB: `sudo mysql -u root -p < /path/to/schema.sql`
4. populate DB: `sudo mysql -u root -p < /path/to/insert.sql`
5. start server: `npm start`
6. server will start as a sudo user (to be able to access gpios etc)

## Start on startup

To start the server when the DragonBoard is turned on edit `crontab` file.

1. Open editor: `sudo vim /etc/crontab`
2. At the bottom of the file add this line: `@reboot root cd /path/to/server && npm start`

Next time the DragonBoard boots the server will start automatically.
