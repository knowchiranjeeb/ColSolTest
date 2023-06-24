const pg = require('pg');

// Database Configuration
const pool = new pg.Pool({
    user: 'doadmin',
    host: 'tfcolsocial-do-user-14281593-0.b.db.ondigitalocean.com',
    database: 'tfCollegeSocial',
    password: 'AVNS_IStoLHxESBLt80vLiFM',
    port: '25060',
    ssl: require, 

    // user: 'csg',
    // host: 'localhost',
    // database: 'tfCollegeSocial',
    // password: 'csg',
    // port: '5432',
  });

  module.exports = pool;