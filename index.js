// Required Dependencies
// const https = require('https');
const express = require('express');
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

// Middleware
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
        servers: ["http:*localhost:4000"],
      },
    },    
    apis: ["./src/*.js"],
  };
  
  const specs = swaggerJsDoc(options);
  app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

// API endpoints
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
