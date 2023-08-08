const express = require('express');
const pool = require('../db'); // Import the database connection
const authMiddleware = require('../authMiddleware'); // Import the authentication middleware
const { writeToUserLog } = require('./common');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: CurrencyConversions
 *   description: API endpoints for Currency Conversions
 */

/**
 * @swagger
 * /api/GetCurConvRate:
 *   get:
 *     summary: Get all Currency Conversions
 *     tags: [CurrencyConversions]
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all Currency Conversions
 *       500:
 *         description: An error occurred while retrieving the Currency Conversions
 */
router.get('/api/GetCurConvRate', authMiddleware, async (req, res) => {
  try {
    const currencyConversions = await pool.query('SELECT * FROM public."CurConv"');
    res.status(200).json(currencyConversions.rows);
  } catch (error) {
    console.error('Error retrieving Currency Conversions:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Currency Conversions' });
  }
});

/**
 * @swagger
 * /api/currencyconversions/{bcurcode}/{fcurcode}:
 *   get:
 *     summary: Get a single Currency Conversion by bcurcode and fcurcode
 *     tags: [CurrencyConversions]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: bcurcode
 *         schema:
 *           type: string
 *         required: true
 *         description: Base currency code
 *       - in: path
 *         name: fcurcode
 *         schema:
 *           type: string
 *         required: true
 *         description: Foreign currency code
 *     responses:
 *       200:
 *         description: Successfully retrieved the Currency Conversion
 *       404:
 *         description: Currency Conversion not found
 *       500:
 *         description: An error occurred while retrieving the Currency Conversion
 */
router.get('/api/currencyconversions/:bcurcode/:fcurcode', authMiddleware, async (req, res) => {
  const { bcurcode, fcurcode } = req.params;

  try {
    const currencyConversion = await pool.query('SELECT bottom 1 * FROM public."CurConv" WHERE bcurcode = $1 AND fcurcode = $2', [bcurcode, fcurcode]);

    if (currencyConversion.rows.length === 0) {
      res.status(404).json({ error: 'Currency Conversion not found' });
    } else {
      res.status(200).json(currencyConversion.rows[0]);
    }
  } catch (error) {
    console.error('Error retrieving Currency Conversion:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Currency Conversion' });
  }
});

/**
 * @swagger
 * /api/currencyconversions/{bcurcode}/{fcurcode}:
 *   delete:
 *     summary: Delete a Currency Conversion by bcurcode and fcurcode
 *     tags: [CurrencyConversions]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: bcurcode
 *         schema:
 *           type: string
 *         required: true
 *         description: Base currency code
 *       - in: path
 *         name: fcurcode
 *         schema:
 *           type: string
 *         required: true
 *         description: Foreign currency code
 *     responses:
 *       204:
 *         description: Currency Conversion deleted successfully
 *       404:
 *         description: Currency Conversion not found
 *       500:
 *         description: An error occurred while deleting the Currency Conversion
 */
router.delete('/api/currencyconversions/:bcurcode/:fcurcode', authMiddleware, async (req, res) => {
  const { bcurcode, fcurcode } = req.params;

  try {
    const deleteResult = await pool.query('DELETE FROM public."CurConv" WHERE bcurcode = $1 AND fcurcode = $2', [bcurcode, fcurcode]);

    if (deleteResult.rowCount > 0) {
      res.sendStatus(204);
    } else {
      res.status(404).json({ error: 'Currency Conversion not found' });
    }
  } catch (error) {
    console.error('Error deleting Currency Conversion:', error);
    res.status(500).json({ error: 'An error occurred while deleting the Currency Conversion' });
  }
});

/**
 * @swagger
 * /api/SaveCurConvRate:
 *   post:
 *     summary: Create or update a Currency Conversion
 *     tags: [CurrencyConversions]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bcurcode:
 *                 type: string
 *               fcurcode:
 *                 type: string
 *               convrate:
 *                 type: number
 *               ratedate:
 *                 type: string
 *                 format: date
 *               ratetime:
 *                 type: string
 *                 format: time
 *               compid:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Currency Conversion created or updated successfully
 *       500:
 *         description: An error occurred while creating or updating the Currency Conversion
 */
router.post('/api/SaveCurConvRate', authMiddleware, async (req, res) => {
  const { bcurcode, fcurcode, convrate, ratedate, ratetime, compid } = req.body;

  try {
    const currencyConversionExists = await pool.query(
      'SELECT * FROM public."CurConv" WHERE bcurcode = $1 AND fcurcode = $2',
      [bcurcode, fcurcode]
    );

    if (currencyConversionExists.rows.length > 0) {
      await pool.query(
        'UPDATE public."CurConv" SET convrate = $1, ratedate = $2, ratetime = $3, compid = $4 WHERE bcurcode = $5 AND fcurcode = $6',
        [convrate, ratedate, ratetime, compid, bcurcode, fcurcode]
      );
      res.status(201).json({ message: 'Currency Conversion updated successfully' });
    } else {
      await pool.query(
        'INSERT INTO public."CurConv" (bcurcode, fcurcode, convrate, ratedate, ratetime, compid) VALUES ($1, $2, $3, $4, $5, $6)',
        [bcurcode, fcurcode, convrate, ratedate, ratetime, compid]
      );
      res.status(201).json({ message: 'Currency Conversion created successfully' });
    }
  } catch (error) {
    console.error('Error creating or updating Currency Conversion:', error);
    res.status(500).json({ error: 'An error occurred while creating or updating the Currency Conversion' });
  }
});

module.exports = router;
