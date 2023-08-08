// Required Dependencies
//const https = require('https');
//const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const regRoutes = require('./src/Register');
const btypeRoutes = require('./src/BusinessType');
const indtypeRoutes = require('./src/IndustryType');
const fiscalRoutes = require('./src/FiscalYear');
const curRoutes = require('./src/Currency');
const curConvRoutes = require('./src/CurrencyConv');
const contRoutes = require('./src/Country');
const langRoutes = require('./src/Language');
const datformatRoutes = require('./src/DateFormat');
const payTermRoutes = require('./src/PayTerm');
const salRoutes = require('./src/Salutation');
const unitRoutes = require('./src/Units');
const taxPrefRoutes = require('./src/TaxPref');
const stateRoutes = require('./src/State');
const gsttreatRoutes = require('./src/GSTTreatment');
const compRoutes = require('./src/Company');
const custRoutes = require('./src/Customer');
const payModeRoutes = require('./src/PayMode');
const itemRoutes = require('./src/Items');
const hsnRoutes = require('./src/HSNCode');
const userRoutes = require('./src/Users');
const invRoutes = require('./src/Invoice');
const payRoutes = require('./src/Payments');
const adjustRoutes = require('./src/Adjustments');
const repRoutes = require('./src/Reports');
const cors = require('cors');
const app = express();
const port = 8000;


//const certificate = fs.readFileSync('./security/cert.pem', 'utf8');
//const privatekey = fs.readFileSync('./security/cert.key', 'utf8');

// Create the credentials object
//const credentials = {
//  key: privatekey,
//  cert: certificate,
// };

//const server = https.createServer(credentials, app);

app.use(cors());

// Middleware
app.use(bodyParser.json());


const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "KF Invoice API",
        version: "1.0.0",
        description: "KF Invoice API",
        contact: {
          name: "Chiranjeeb Sengupta",
        },
        servers: ["https:*localhost:5000"],
      },
    },    
    apis: ["./src/*.js"],
  };
  
  const specs = swaggerJsDoc(options);
  app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));


  // API endpoints
app.use('/', regRoutes);
app.use('/', btypeRoutes);
app.use('/', indtypeRoutes);
app.use('/', fiscalRoutes);
app.use('/', curRoutes);
app.use('/', curConvRoutes);
app.use('/', contRoutes);
app.use('/', langRoutes);
app.use('/', datformatRoutes);
app.use('/', payTermRoutes);
app.use('/', salRoutes);
app.use('/', unitRoutes);
app.use('/', taxPrefRoutes);
app.use('/', stateRoutes);
app.use('/', gsttreatRoutes);
app.use('/', compRoutes);
app.use('/', custRoutes);
app.use('/', userRoutes);
app.use('/', itemRoutes);
app.use('/', hsnRoutes);
app.use('/', payModeRoutes);
app.use('/', invRoutes);
app.use('/', payRoutes);
app.use('/', adjustRoutes);
app.use('/', repRoutes);

// Start the server

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
