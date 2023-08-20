const express = require('express');
const router = express.Router();
const csvParser = require('csv-parser');
const fs = require('fs');
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const authenticateToken = require('../authMiddleware');

const upload = multer({ dest: 'uploads/' });

// Endpoint to save bulk countries from the CSV file
/**
 * @swagger
 * /api/SaveBulkCountries:
 *   put:
 *     summary: Save countries from a CSV file or update if already present
 *     tags: [Country]
 *     security:
 *       - BasicAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               csvFile:
 *                 type: string
 *                 format: binary 
 *                 description: CSV file containing multiple countries (countryname, defcurcode,isdcode) - all defcurcode should be in currency table
 *                 required: true
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Countries saved or updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/api/SaveBulkCountries', upload.single('csvFile'), authenticateToken, (req, res) => {

    const countries = [];
  
    const fileStream = req.file.path;
    fs.createReadStream(fileStream)
      .pipe(csvParser())
      .on('data', (row) => {
        // Add each row to the countries array
        countries.push(row);
      })
      .on('end', () => {
        // Save or update the countries in the database
        saveOrUpdateCountries(countries)
          .then(() => {
            res.status(200).json({ message: 'Countries saved or updated successfully' });
          })
          .catch((error) => {
            console.log('Error saving or updating countries:', error);
            res.status(500).json({ error: 'Internal server error' });
          });
      });
  });  

  // Function to save or update countries in the database
  async function saveOrUpdateCountries(countries) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
  
      // Iterate through each country and insert or update in the database
      for (const country of countries) {
        let countryName;
        for(var i in country){
          countryName = country[i];
          break;
        }
        const existingCountry = await getCountryByName(client,countryName);
  
        if (existingCountry.countryid > 0) {
          // If the country name is already present, update the existing record
          const query = 'UPDATE "Country" SET defcurcode = $1, isdcode=$2 WHERE countryid = $3';
          const values = [country.defcurcode, country.isdcode, existingCountry.countryid];
  
          await client.query(query, values);
        } else {
          // If the country name is not found, create a new country record
          const query = 'INSERT INTO "Country" (countryname, defcurcode, isdcode) VALUES ($1, $2, $3)';
          const values = [countryName, country.defcurcode, country.isdcode];
  
          await client.query(query, values);
        }
      }
  
      await client.query('COMMIT');
    } catch (error) {
      console.log(error);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
// Endpoint to save bulk states from the CSV file
/**
 * @swagger
 * /api/SaveBulkStates:
 *   put:
 *     summary: Save or update states from a CSV file
 *     tags: [State]
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               csvFile:
 *                 type: string
 *                 format: binary 
 *                 description: CSV file containing multiple states (statename, countryname)- all countryname should be in country table
 *                 required: true
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: States saved or updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/api/SaveBulkStates', upload.single('csvFile'), authenticateToken, (req, res) => {
    const states = [];
  
    const fileStream = req.file.path;
    fs.createReadStream(fileStream)
      .pipe(csvParser())
      .on('data', (row) => {
        // Add each row to the states array
        states.push(row);
      })
      .on('end', () => {
        // Save or update the states in the database
        saveOrUpdateStates(states)
          .then(() => {
            res.status(200).json({ message: 'States saved or updated successfully' });
          })
          .catch((error) => {
            console.error('Error saving or updating states:', error);
            res.status(500).json({ error: 'Internal server error' });
          });
      });
  });

  // Function to save or update states in the database
async function saveOrUpdateStates(states) {
    try {
      for (const state of states) {
        const { statename, countryname } = state;
  
        // Get the countryid based on the countryname from the Country Table
        const countryId = await getCountryByName(countryname);
  
        // Check if the state already exists in the database
        const existingState = await pool.query(
          'SELECT * FROM "States" WHERE LOWER(statename) = LOWER($1)',
          [statename]
        );
  
        if (existingState.rows.length > 0) {
          // Update the existing state
          await pool.query(
            'UPDATE "States" SET countryid = $1, modon = NOW() WHERE LOWER(statename) = LOWER($2)',
            [countryId, statename]
          );
        } else {
          // Insert the new state
          await pool.query(
            'INSERT INTO "States" (statename, countryid, modon) VALUES ($1, $2, NOW())',
            [statename, countryId]
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }
  
  // Function to get country by name (case-insensitive)
  async function getCountryByName(countryname) {
    try {
      const result = await pool.query(
        'SELECT countryid FROM "Country" WHERE LOWER(countryname) = LOWER($1)',
        [countryname]
      );
  
      if (result.rows.length > 0) {
        return result.rows[0].countryid;
      } else {
        //throw new Error('Country not found');
        return {countryid : 0};
      }
    } catch (error) {
      throw error;
    }
  }
  
// Endpoint to save bulk Base currencies from the CSV file
/**
 * @swagger
 * /api/SaveBulkBaseCur:
 *   put:
 *     summary: Save or update base currencies from a CSV file
 *     tags: [Currency]
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               csvFile:
 *                 type: string
 *                 format: binary 
 *                 description: CSV file containing multiple currencies (currencycode, symbol, currencyname, dec, format)
 *                 required: true
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Currencies saved or updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/api/SaveBulkBaseCur', upload.single('csvFile'), authenticateToken, (req, res) => {

  const currencies = [];
  
    const fileStream = req.file.path;
    fs.createReadStream(fileStream)
      .pipe(csvParser())
      .on('data', (row) => {
        // Add each row to the currency array
        currencies.push(row);
      })
      .on('end', () => {
        // Save or update the currencies in the database
        saveOrUpdateCurrencies(currencies)
          .then(() => {
            res.status(200).json({ message: 'Currencies saved or updated successfully' });
          })
          .catch((error) => {
            console.error('Error saving or updating currencies:', error);
            res.status(500).json({ error: 'Internal server error' });
          });
      });
  });

  // Function to save or update currencies in the database
async function saveOrUpdateCurrencies(currencies) {
    try {
      for (const currency of currencies) {
        const { currencycode, symbol, currencyname, dec, format } = currency;
  
        // Check if the currency already exists in the database
        const existingCurrency = await pool.query(
          'SELECT * FROM "CurrencyBase" WHERE LOWER(currencycode) = LOWER($1)',
          [currencycode]
        );
  
        if (existingCurrency.rows.length > 0) {
          // Update the existing currency
          await pool.query(
            'UPDATE "CurrencyBase" SET symbol = $2, currencyname = $3, dec = $4, format = $5 WHERE LOWER(currencycode) = LOWER($1)',
            [currencycode, symbol, currencyname, dec, format]
          );
        } else {
          // Insert the new currency
          await pool.query(
            'INSERT INTO "CurrencyBase" (currencycode, symbol, currencyname, dec, format) VALUES ($1, $2, $3, $4, $5)',
            [currencycode, symbol, currencyname, dec, format]
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }

// Endpoint to save bulk HSN/SAC Code from the CSV file
/**
 * @swagger
 * /api/SaveBulkHSNCode:
 *   put:
 *     summary: Save or update base HSN/SAC codes from a CSV file
 *     tags: [HSN Code]
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               csvFile:
 *                 type: string
 *                 format: binary 
 *                 description: CSV file containing multiple HSN/SAC Codes (hsncode, codedesc, isselectable, isservice)
 *                 required: true
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: HSN/SAC Codes saved or updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/api/SaveBulkHSNCode', upload.single('csvFile'), authenticateToken, (req, res) => {
  
    const hsns = [];
  
    const fileStream = req.file.path;
    fs.createReadStream(fileStream)
      .pipe(csvParser())
      .on('data', (row) => {
        // Add each row to the HSN/SAC code array
        hsns.push(row);
      })
      .on('end', () => {
        // Save or update the HSN/SAC Code in the database
        saveOrUpdateHSN(hsns)
          .then(() => {
            res.status(200).json({ message: 'HSN/SAC Codes saved or updated successfully' });
          })
          .catch((error) => {
            console.error('Error saving or updating HSN/SAC Codes:', error);
            res.status(500).json({ error: 'Internal server error' });
          });
      });
  });

  // Function to save or update HSN/SAC Codes in the database
async function saveOrUpdateHSN(hsns) {
    try {
      for (const hsn of hsns) {
        const { hsncode, codedesc, isselectable, isservice } = hsn;
  
        // Check if the HSN/SAC Code already exists in the database
        const existingHSN = await pool.query(
          'SELECT * FROM "HSNSAC" WHERE LOWER(hsncode) = LOWER($1)',
          [hsncode]
        );
  
        if (existingHSN.rows.length > 0) {
          // Update the existing HSN/SAC code
          await pool.query(
            'UPDATE "HSNSAC" SET codedesc = $2, isselectable= $3, isservice = $4 WHERE LOWER(hsncode) = LOWER($1)',
            [hsncode, codedesc, isselectable, isservice]
          );
        } else {
          // Insert the new HSN/SAC Code
          await pool.query(
            'INSERT INTO "HSNSAC" (hsncode, codedesc, isselectable, isservice) VALUES ($1, $2, $3, $4)',
            [hsncode, codedesc, isselectable, isservice]
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }

// Endpoint to save bulk Industry Type from the CSV file
/**
 * @swagger
 * /api/SaveBulkIndType:
 *   put:
 *     summary: Save or update base HSN/SAC codes from a CSV file
 *     tags: [IndustryType]
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               csvFile:
 *                 type: string
 *                 format: binary 
 *                 description: CSV file containing multiple Industry Types (indtype)
 *                 required: true
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Industry Types saved or updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/api/SaveBulkIndType', upload.single('csvFile'), authenticateToken, (req, res) => {
  
    const indtypes = [];
  
    const fileStream = req.file.path;
    fs.createReadStream(fileStream)
      .pipe(csvParser())
      .on('data', (row) => {
        // Add each row to the Industry Type array
        indtypes.push(row);
      })
      .on('end', () => {
        // Save or update the Industry Type in the database
        saveOrUpdateIndType(indtypes)
          .then(() => {
            res.status(200).json({ message: 'Industry Types saved or updated successfully' });
          })
          .catch((error) => {
            console.error('Error saving or updating Industry Types:', error);
            res.status(500).json({ error: 'Internal server error' });
          });
      });
  });

  // Function to save or update Industry Types in the database
async function saveOrUpdateIndType(indtypes) {
    try {
      for (const indtype1 of indtypes) {
        const { indtype } = indtype1;
  
        // Check if the Industry Type already exists in the database
        const existingIndType = await pool.query(
          'SELECT * FROM "IndustryType" WHERE LOWER(indtype) = LOWER($1)',
          [indtype]
        );
  
        if (existingIndType.rows.length > 0) {
          // Update the existing Industry Type
          await pool.query(
            'UPDATE "IndustryType" SET indtype=$1 WHERE LOWER(indtype) = LOWER($1)',
            [indtype]
          );
        } else {
          // Insert the new Industry Type
          await pool.query(
            'INSERT INTO "IndustryType" (indtype) VALUES ($1)',
            [indtype]
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }

// Endpoint to save bulk Business Type from the CSV file
/**
 * @swagger
 * /api/SaveBulkBusType:
 *   put:
 *     summary: Save or update base Business Types from a CSV file
 *     tags: [BusinessType]
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               csvFile:
 *                 type: string
 *                 format: binary 
 *                 description: CSV file containing multiple Business Types (bustype)
 *                 required: true
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Business Types saved or updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/api/SaveBulkBusType', upload.single('csvFile'), authenticateToken, (req, res) => {
  
    const bustypes = [];
  
    const fileStream = req.file.path;
    fs.createReadStream(fileStream)
      .pipe(csvParser())
      .on('data', (row) => {
        // Add each row to the Business Type array
        bustypes.push(row);
      })
      .on('end', () => {
        // Save or update the Business Type in the database
        saveOrUpdateBusType(bustypes)
          .then(() => {
            res.status(200).json({ message: 'Business Types saved or updated successfully' });
          })
          .catch((error) => {
            console.error('Error saving or updating Business Types:', error);
            res.status(500).json({ error: 'Internal server error' });
          });
      });
  });

  // Function to save or update Business Types in the database
async function saveOrUpdateBusType(bustypes) {
    try {
      for (const bustype1 of bustypes) {
        const { bustype } = bustype1;
  
        // Check if the Business Type already exists in the database
        const existingBusType = await pool.query(
          'SELECT * FROM "BusinessType" WHERE LOWER(bustype) = LOWER($1)',
          [bustype]
        );
  
        if (existingBusType.rows.length > 0) {
          // Update the existing Business Type
          await pool.query(
            'UPDATE "BusinessType" SET bustype=$1 WHERE LOWER(bustype) = LOWER($1)',
            [bustype]
          );
        } else {
          // Insert the new Business Type
          await pool.query(
            'INSERT INTO "BusinessType" (bustype) VALUES ($1)',
            [bustype]
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }

// Endpoint to save bulk Language from the CSV file
/**
 * @swagger
 * /api/SaveBulkLang:
 *   put:
 *     summary: Save or update base Languages from a CSV file
 *     tags: [Language]
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               csvFile:
 *                 type: string
 *                 format: binary 
 *                 description: CSV file containing multiple Languages (langcode, language)
 *                 required: true
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Languages saved or updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/api/SaveBulkLang', upload.single('csvFile'), authenticateToken, (req, res) => {
  
    const languages = [];
  
    const fileStream = req.file.path;
    fs.createReadStream(fileStream)
      .pipe(csvParser())
      .on('data', (row) => {
        // Add each row to the Language array
        languages.push(row);
      })
      .on('end', () => {
        // Save or update the Language in the database
        saveOrUpdateLangugae(languages)
          .then(() => {
            res.status(200).json({ message: 'Languages saved or updated successfully' });
          })
          .catch((error) => {
            console.error('Error saving or updating Languages:', error);
            res.status(500).json({ error: 'Internal server error' });
          });
      });
  });

  // Function to save or update Languages in the database
async function saveOrUpdateLangugae(languages) {
    try {
      for (const language1 of languages) {
        const { langcode, language } = language1;
  
        // Check if the Language already exists in the database
        const existingLang = await pool.query(
          'SELECT * FROM "Language" WHERE LOWER(langcode) = LOWER($1)',
          [langcode]
        );
  
        if (existingLang.rows.length > 0) {
          // Update the existing Language
          await pool.query(
            'UPDATE "Language" SET language=$2 WHERE LOWER(langcode) = LOWER($1)',
            [langcode, language]
          );
        } else {
          // Insert the new Language
          await pool.query(
            'INSERT INTO "Language" (langcode, language) VALUES ($1, $2)',
            [langcode, language]
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }

// Endpoint to save bulk GST Treatment from the CSV file
/**
 * @swagger
 * /api/SaveBulkGSTTreat:
 *   put:
 *     summary: Save or update GST Treatments from a CSV file
 *     tags: [GST Treatment]
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               csvFile:
 *                 type: string
 *                 format: binary 
 *                 description: CSV file containing multiple GST Treatments (gsttreatment, reqgstno, reqsupplace)
 *                 required: true
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: GST Treatments saved or updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/api/SaveBulkGSTTreat', upload.single('csvFile'), authenticateToken, (req, res) => {
  
    const gsttreats = [];
  
    const fileStream = req.file.path;
    fs.createReadStream(fileStream)
      .pipe(csvParser())
      .on('data', (row) => {
        // Add each row to the GST Treatment array
        gsttreats.push(row);
      })
      .on('end', () => {
        // Save or update the GST Treatment in the database
        saveOrUpdateGSTTreat(gsttreats)
          .then(() => {
            res.status(200).json({ message: 'GST Treatments saved or updated successfully' });
          })
          .catch((error) => {
            console.error('Error saving or updating GST Treatments:', error);
            res.status(500).json({ error: 'Internal server error' });
          });
      });
  });

  // Function to save or update GST Treatment in the database
async function saveOrUpdateGSTTreat(gsttreats) {
    try {
      for (const gsttreat of gsttreats) {
        const { gsttreatment, reqgstno, reqsupplace } = gsttreat;
  
        // Check if the GST Treatment already exists in the database
        const existingGSTTreat = await pool.query(
          'SELECT * FROM "GSTTreatment" WHERE LOWER(gsttreatment) = LOWER($1)',
          [gsttreatment]
        );
  
        if (existingGSTTreat.rows.length > 0) {
          // Update the existing GST Treatment
          await pool.query(
            'UPDATE "GSTTreatment" SET reqgstno = $2, reqsupplace=$3 WHERE LOWER(gsttreatment) = LOWER($1)',
            [gsttreatment, reqgstno, reqsupplace]
          );
        } else {
          // Insert the new GST Treatment
          await pool.query(
            'INSERT INTO "GSTTreatment" (gsttreatment, reqgstno, reqsupplace) VALUES ($1, $2, $3)',
            [gsttreatment, reqgstno, reqsupplace]
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }

module.exports = router;