// Required Dependencies
//const https = require('https');
//const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const collegeRoutes = require('./src/College');
const courseRoutes = require('./src/Course');
const optRoutes = require('./src/Option');
const roomsRoutes = require('./src/Rooms');
const topicRoutes = require('./src/Topic');
const subjectRoutes = require('./src/Subject');
const app = express();
const port = 4000;


//const certificate = fs.readFileSync('./security/cert.pem', 'utf8');
//const privatekey = fs.readFileSync('./security/cert.key', 'utf8');

// Create the credentials object
//const credentials = {
//  key: privatekey,
//  cert: certificate,
// };

//const server = https.createServer(credentials, app);

// Middleware
app.use(cors());
app.use(bodyParser.json());


const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "KF College Social API",
        version: "1.0.0",
        description: "KF College Social API",
        contact: {
          name: "Chiranjeeb Sengupta",
        },
        servers: ["https:*localhost:4000"],
      },
    },    
    apis: ["./src/*.js"],
  };
  
  const specs = swaggerJsDoc(options);
  app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

// API endpoints
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
app.use('/', collegeRoutes);
app.use('/', courseRoutes);
app.use('/', optRoutes);
app.use('/', roomsRoutes);
app.use('/', topicRoutes);
app.use('/', subjectRoutes);

// Start the server

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
