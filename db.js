const pg = require('pg');

const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;
const dbase = process.env.DB;

// Database Configuration
const pool = new pg.Pool({
  user: dbUser,
  host: dbHost,
  database: dbase,
  password: dbPass,
  port: '25060',
  ssl: {
   rejectUnauthorized: false, 
  }, 

});

module.exports = pool;