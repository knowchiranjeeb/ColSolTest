const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');
const { writeToUserLog } = require('./common');

// Swagger documentation for Currency CRUD API
/**
 * @swagger
 * tags:
 *   name: Currency
 *   description: API endpoints for Currency
 */

// API route to create or update a Currency
/**
 * @swagger
 * /api/SaveCurDetails:
 *   post:
 *     security:
 *       - BasicAuth: []
 *     summary: Create or update a Currency
 *     tags: [Currency]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currencycode:
 *                 type: string
 *                 maxLength: 3
 *               symbol:
 *                 type: string
 *                 maxLength: 3
 *               currencyname:
 *                 type: string
 *                 maxLength: 100
 *               dec:
 *                 type: integer
 *               format:
 *                 type: integer
 *               compid:
 *                 type: integer
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Successfully updated the Currency
 *       201:
 *         description: Successfully created a new Currency
 *       500:
 *         description: An error occurred while creating/updating the Currency
 */
router.post('/api/SaveCurDetails', authenticateToken, async (req, res) => {
    const { currencycode, symbol, currencyname, dec, format, compid, userid, isweb } = req.body;
  
    try {
      // Check if currencycode already exists
      const checkQuery = 'SELECT * FROM public."Currency" WHERE currencycode = $1 and compid = $2';
      const checkResult = await pool.query(checkQuery, [currencycode, compid]);
  
      if (checkResult.rows.length > 0) {
        // Update the existing currency
        const updateQuery = 'UPDATE public."Currency" SET symbol = $1, currencyname = $2, "dec" = $3, format = $4, userid = $5, updon = NOW() WHERE currencycode = $6 RETURNING *';
        const updateResult = await pool.query(updateQuery, [symbol, currencyname, dec, format, userid, currencycode]);
  
        res.status(200).json(updateResult.rows[0]);
        writeToUserLog(userid, 'Updated Currency - '+currencyname, compid, isweb);
      } else {
        // Create a new currency
        const createQuery = 'INSERT INTO public."Currency" (currencycode, symbol, currencyname, "dec", format, compid, userid) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
        const createResult = await pool.query(createQuery, [currencycode, symbol, currencyname, dec, format, compid, userid]);
  
        res.status(201).json(createResult.rows[0]);
        writeToUserLog(userid, 'Created Currency - '+currencyname, compid, isweb);
      }
    } catch (error) {
      console.error('Error creating/updating Currency:', error);
      res.status(500).json({ error: 'An error occurred while creating/updating the Currency' });
      writeToUserLog(userid, 'Created Currency - '+currencyname, compid, isweb);
    }
  });
  
  // API route to get all Currencies
  /**
   * @swagger
   * /api/GetCurrency:
   *   get:
   *     security:
   *       - BasicAuth: []
   *     summary: Get all Currencies
   *     tags: [Currency]
   *     responses:
   *       200:
   *         description: Successfully retrieved all Currencies
   *       500:
   *         description: An error occurred while retrieving the Currencies
   */
  router.get('/api/GetCurrency', authenticateToken, async (req, res) => {
    try {
      const query = 'SELECT currencycode,currencyname,symbol FROM public."Currency"';
      const result = await pool.query(query);
  
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error retrieving Currencies:', error);
      res.status(500).json({ error: 'An error occurred while retrieving the Currencies' });
    }
  });
  
  // API route to get a single Currency by currencycode
  /**
   * @swagger
   * /api/GetCurDetails/{currencycode}:
   *   get:
   *     summary: Get a single Currency by currencycode
   *     tags: [Currency]
   *     security:
   *       - BasicAuth: []
   *     parameters:
   *       - in: path
   *         name: currencycode
   *         schema:
   *           type: string
   *           maxLength: 3
   *         required: true
   *         description: Currency code
   *     responses:
   *       200:
   *         description: Successfully retrieved the Currency
   *       404:
   *         description: Currency not found
   *       500:
   *         description: An error occurred while retrieving the Currency
   */
  router.get('/api/GetCurDetails/:currencycode', authenticateToken, async (req, res) => {
    const { currencycode } = req.params;
  
    try {
      const query = 'SELECT * FROM public."Currency" WHERE currencycode = $1';
      const result = await pool.query(query, [currencycode]);
  
      if (result.rows.length > 0) {
        res.status(200).json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Currency not found' });
      }
    } catch (error) {
      console.error('Error retrieving Currency:', error);
      res.status(500).json({ error: 'An error occurred while retrieving the Currency' });
    }
  });
  
  // API route to delete a Currency by currencycode
  /**
   * @swagger
   * /api/currencies/{currencycode}:
   *   delete:
   *     security:
   *       - BasicAuth: []
   *     summary: Delete a Currency by currencycode
   *     tags: [Currency]
   *     parameters:
   *       - in: path
   *         name: currencycode
   *         schema:
   *           type: string
   *           maxLength: 3
   *         required: true
   *         description: Currency code
   *     responses:
   *       204:
   *         description: Currency deleted successfully
   *       404:
   *         description: Currency not found
   *       500:
   *         description: An error occurred while deleting the Currency
   */
  router.delete('/api/currencies/:currencycode', authenticateToken, async (req, res) => {
    const { currencycode } = req.params;
  
    try {
      const deleteQuery = 'DELETE FROM public."Currency" WHERE currencycode = $1';
      const deleteResult = await pool.query(deleteQuery, [currencycode]);
  
      if (deleteResult.rowCount > 0) {
        res.sendStatus(204);
      } else {
        res.status(404).json({ error: 'Currency not found' });
      }
    } catch (error) {
      console.error('Error deleting Currency:', error);
      res.status(500).json({ error: 'An error occurred while deleting the Currency' });
    }
  });

  // API route to get all Default Currencies
  /**
   * @swagger
   * /api/GetDefCur:
   *   get:
   *     summary: Get all Default Currencies
   *     tags: [Currency]
   *     security:
   *       - BasicAuth: []
   *     responses:
   *       200:
   *         description: Successfully retrieved all Default Currencies
   *       500:
   *         description: An error occurred while retrieving the Default Currencies
   */
  router.get('/api/GetDefCur', authenticateToken, async (req, res) => {
    try {
      const query = 'SELECT currencycode,currencyname,symbol FROM public."CurrencyBase"';
      const result = await pool.query(query);
  
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error retrieving Default Currencies:', error);
      res.status(500).json({ error: 'An error occurred while retrieving the Default Currencies' });
    }
  });

  /**
 * @swagger
 * /api/GetCurDet:
 *   get:
 *     summary: Search for a currencycode in Currency and CurrencyBase Tables
 *     tags: [Currency]
 *     security:
 *       - BasicAuth: []
 *     parameters:
 *       - in: query
 *         name: currencycode
 *         schema:
 *           type: string
 *         required: true
 *         description: Currency code to search for
 *     responses:
 *       200:
 *         description: Returns currency details
 *       404:
 *         description: Currency code not found in both tables
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetCurDet', authenticateToken, async (req, res) => {
  const { currencycode } = req.query;

  if (!currencycode) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    // Check if the currencycode exists in the Currency table
    const currencyQuery = `
      SELECT currencycode, symbol, currencyname, dec, format
      FROM "Currency"
      WHERE currencycode = $1
    `;

    const { rows: currencyRows } = await pool.query(currencyQuery, [currencycode]);

    if (currencyRows.length > 0) {
      const currencyDetails = currencyRows[0];
      return res.status(200).json(currencyDetails);
    }

    // If currencycode not found in Currency table, fetch from CurrencyBase table
    const currencyBaseQuery = `
      SELECT currencycode, symbol, currencyname, dec, format
      FROM "CurrencyBase"
      WHERE currencycode = $1
    `;

    const { rows: currencyBaseRows } = await pool.query(currencyBaseQuery, [currencycode]);

    if (currencyBaseRows.length > 0) {
      const currencyBaseDetails = currencyBaseRows[0];
      return res.status(200).json(currencyBaseDetails);
    }

    // Currency code not found in both tables
    return res.status(404).json({ error: 'Currency code not found in both tables' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/GetDefCurDet:
 *   get:
 *     summary: Search for a currencycode in CurrencyBase Tables
 *     tags: [Currency]
 *     security:
 *       - BasicAuth: []
 *     parameters:
 *       - in: query
 *         name: currencycode
 *         schema:
 *           type: string
 *         required: true
 *         description: Currency code to search for
 *     responses:
 *       200:
 *         description: Returns currency details
 *       404:
 *         description: Currency code not found in both tables
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetDefCurDet', authenticateToken, async (req, res) => {
  const { currencycode } = req.query;

  if (!currencycode) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {

    // Fetch from CurrencyBase table
    const currencyBaseQuery = `
      SELECT currencycode, symbol, currencyname, dec, format
      FROM "CurrencyBase"
      WHERE currencycode = $1
    `;

    const { rows: currencyBaseRows } = await pool.query(currencyBaseQuery, [currencycode]);

    if (currencyBaseRows.length > 0) {
      const currencyBaseDetails = currencyBaseRows[0];
      return res.status(200).json(currencyBaseDetails);
    }

    // Currency code not found in both tables
    return res.status(404).json({ error: 'Base Currency code not found' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API route to create or update a Currency in Base Currency Table
/**
 * @swagger
 * /api/SaveBaseCur:
 *   post:
 *     security:
 *       - BasicAuth: []
 *     summary: Create or update a Base Currency
 *     tags: [Currency]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currencycode:
 *                 type: string
 *                 maxLength: 3
 *               symbol:
 *                 type: string
 *                 maxLength: 3
 *               currencyname:
 *                 type: string
 *                 maxLength: 100
 *               dec:
 *                 type: integer
 *               format:
 *                 type: integer
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Successfully updated the Base Currency
 *       201:
 *         description: Successfully created a new Base Currency
 *       500:
 *         description: An error occurred while creating/updating the Base Currency
 */
router.post('/api/SaveBaseCur', authenticateToken, async (req, res) => {
  const { currencycode, symbol, currencyname, dec, format, userid, isweb } = req.body;

  try {
    // Check if currencycode already exists
    const compid = 0;
    const checkQuery1 = 'SELECT * FROM public."CurrencyBase" WHERE TRIM(currencyname) ILIKE $1';
    const checkResult1 = await pool.query(checkQuery1, [currencyname.trim()]);

    if (checkResult1.rows.length > 0) {
      const updateQuery1 = 'UPDATE public."CurrencyBase" SET symbol = $1, currencyname = $2, "dec" = $3, format = $4 WHERE TRIM(currencyname) ILIKE $5 RETURNING currencycode';
      const updateResult1 = await pool.query(updateQuery1, [symbol, currencyname, dec, format, currencyname.trim()]);

      res.status(200).json(updateResult1.rows[0]);
      writeToUserLog(userid, 'Updated Base Currency - '+currencyname, compid, isweb);
    }
    else
    {
      const checkQuery = 'SELECT * FROM public."CurrencyBase" WHERE currencycode = $1';
      const checkResult = await pool.query(checkQuery, [currencycode]);

      if (checkResult.rows.length > 0) {
        // Update the existing currency
        const updateQuery = 'UPDATE public."CurrencyBase" SET symbol = $1, currencyname = $2, "dec" = $3, format = $4 WHERE currencycode = $5 RETURNING currencycode';
        const updateResult = await pool.query(updateQuery, [symbol, currencyname, dec, format, currencycode]);

        res.status(200).json(updateResult.rows[0]);
        writeToUserLog(userid, 'Updated Base Currency - '+currencyname, compid, isweb);
      } else {
        // Create a new currency
        const createQuery = 'INSERT INTO public."CurrencyBase" (currencycode, symbol, currencyname, "dec", format) VALUES ($1, $2, $3, $4, $5) RETURNING currencycode';
        const createResult = await pool.query(createQuery, [currencycode, symbol, currencyname, dec, format]);

        res.status(201).json(createResult.rows[0]);
        writeToUserLog(userid, 'Created Base Currency - '+currencyname, compid, isweb);
      }
    }
  } catch (error) {
    console.error('Error creating/updating Base Currency:', error);
    res.status(500).json({ error: 'An error occurred while creating/updating the Base Currency' });
  }
});


  module.exports = router;