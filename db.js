const pg = require('pg');

// Database Configuration
const pool = new pg.Pool({
     /* user: 'doadmin',
     host: 'tfcolsocial-do-user-14281593-0.b.db.ondigitalocean.com',
     database: 'Invoice',
     password: 'AVNS_IStoLHxESBLt80vLiFM',
     port: '25060',
     ssl: {
      rejectUnauthorized: false, 
     }, */
    // sslmode: require, 

    user: 'csg',
    host: 'localhost',
    database: 'Invoice',
    password: 'csg',
    port: '5432',
  });

  module.exports = pool;