# smartHome
A central hub for controlling devices in a smart home setup.

## Setup

1. install nodejs (v10) and npm (v6)
2. install MariaDB: `sudo apt-get install mariadb-server` (same usage as for mysql-server)
3. create DB: `sudo mysql -u root -p < /path/to/schema.sql`
4. populate DB: `sudo mysql -u root -p < /path/to/insert.sql`
5. start server: `npm start`
6. server will start as a sudo user (to be able to access gpios etc)
