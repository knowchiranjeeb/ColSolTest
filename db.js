const pg = require('pg');

// Database Configuration
const pool = new pg.Pool({
     user: 'doadmin',
     host: 'tfcolsocial-do-user-14281593-0.b.db.ondigitalocean.com',
     database: 'tfCollegeSocial',
     password: 'AVNS_IStoLHxESBLt80vLiFM',
     port: '25060',
     ssl: {
      rejectUnauthorized: false, 
     }, 
    // sslmode: require, 

     //user: 'csg123456789',
     //host: 'dpg-cice6tl9aq03rjn0i2mg-a.singapore-postgres.render.com',
     //database: 'csg',
     //password: 'oSVzfXbKQpT0gAXhPmqAweAsyuJxqM9Z',
     //port: '5432',
     //ssl: {
     // rejectUnauthorized: false, 
     //}, 

    //user: 'csg',
    //host: 'localhost',
    //database: 'tfCollegeSocial',
    //password: 'csg',
    //port: '5432',
  });

  module.exports = pool;