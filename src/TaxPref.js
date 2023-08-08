const express = require('express');
const pool = require('../db'); // Import the database connection
const authMiddleware = require('../authMiddleware'); // Import the authentication middleware
const router = express.Router();
const { writeToUserLog } = require('./common');

/**
 * @swagger
 * tags:
 *   name: Tax Preferences
 *   description: API endpoints for Tax Preferences
 */

/**
 * @swagger
 * /api/GetTaxPref:
 *   get:
 *     summary: Get all Tax Preferences
 *     tags: [Tax Preferences]
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all Tax Preferences
 *       500:
 *         description: An error occurred while retrieving the Tax Preferences
 */
router.get('/api/GetTaxPref', authMiddleware, async (req, res) => {
  try {
    const taxes = await pool.query('SELECT * FROM public."TaxPref"');
    res.status(200).json(taxes.rows);
  } catch (error) {
    console.error('Error retrieving Tax Preferences:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Tax Preferences' });
  }
});

/**
 * @swagger
 * /api/taxes/{taxprefid}:
 *   get:
 *     summary: Get a single Tax Preferences by taxprefid
 *     tags: [Tax Preferences]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: taxprefid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Tax Preferences ID
 *     responses:
 *       200:
 *         description: Successfully retrieved the Tax Preferences
 *       404:
 *         description: Tax Preferences not found
 *       500:
 *         description: An error occurred while retrieving the Tax Preferences
 */
router.get('/api/taxes/:taxprefid', authMiddleware, async (req, res) => {
  const { taxprefid } = req.params;

  try {
    const tax = await pool.query('SELECT * FROM public."TaxPref" WHERE taxprefid = $1', [taxprefid]);

    if (tax.rows.length === 0) {
      res.status(404).json({ error: 'Tax not found' });
    } else {
      res.status(200).json(tax.rows[0]);
    }
  } catch (error) {
    console.error('Error retrieving Tax Preferences:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Tax Preferences' });
  }
});

/**
 * @swagger
 * /api/taxes/{taxprefid}:
 *   delete:
 *     summary: Delete a Tax Preferences by taxprefid
 *     tags: [Tax Preferences]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: taxprefid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Tax Preferences ID
 *     responses:
 *       204:
 *         description: Tax Preferences deleted successfully
 *       404:
 *         description: Tax Preferences not found
 *       500:
 *         description: An error occurred while deleting the Tax Preferences
 */
router.delete('/api/taxes/:taxprefid', authMiddleware, async (req, res) => {
  const { taxprefid } = req.params;

  try {
    const deleteResult = await pool.query('DELETE FROM public."TaxPref" WHERE taxprefid = $1', [taxprefid]);

    if (deleteResult.rowCount > 0) {
      res.sendStatus(204);
    } else {
      res.status(404).json({ error: 'Tax Preferences not found' });
    }
  } catch (error) {
    console.error('Error deleting Tax Preferences:', error);
    res.status(500).json({ error: 'An error occurred while deleting the Tax Preferences' });
  }
});

/**
 * @swagger
 * /api/SaveTaxPref:
 *   post:
 *     summary: Create or update a Tax Preferences
 *     tags: [Tax Preferences]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taxprefid:
 *                 type: integer
 *               taxprefname:
 *                 type: string
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Tax Preferences created or updated successfully
 *       500:
 *         description: An error occurred while creating or updating the Tax Preferences
 */
router.post('/api/SaveTaxPref', authMiddleware, async (req, res) => {
  const { taxprefid, taxprefname, userid, isweb } = req.body;

  try {
    const taxExists = await pool.query('SELECT * FROM public."TaxPref" WHERE TRIM(taxprefname) ILIKE $1', [taxprefname.trim()]);
    const compid = 0;

    if (taxExists.rows.length > 0) {
      await pool.query('UPDATE public."TaxPref" SET taxprefname = $1 WHERE TRIM(taxprefname) ILIKE $1', [taxprefname.trim()]);
      res.status(201).json({ message: 'Tax Preferences updated successfully' });
      writeToUserLog(userid, 'Updated Tax Preferences  - '+taxprefname, compid, isweb);
    } else {
      if (taxprefid > 0) {
        const taxExists1 = await pool.query('SELECT * FROM public."TaxPref" WHERE taxprefid = $1', [taxprefid]);

        if (taxExists1.rows.length > 0) {
            await pool.query('UPDATE public."TaxPref" SET taxprefname = $1 WHERE taxprefid = $2', [taxprefname, taxprefid]);
            res.status(201).json({ message: 'Tax Preferences updated successfully' });
            writeToUserLog(userid, 'Updated Tax Preferences  - '+taxprefid.toString(), compid, isweb);
          } else {
            await pool.query('INSERT INTO public."TaxPref" (taxprefname) VALUES ($1)', [taxprefname]);
            res.status(201).json({ message: 'Tax Preferences created successfully' });
            writeToUserLog(userid, 'Created Tax Preferences  - '+taxprefname, compid, isweb);
          }
        }
     else {
        await pool.query('INSERT INTO public."TaxPref" (taxprefname) VALUES ($1)', [taxprefname]);
        res.status(201).json({ message: 'Tax Preferences created successfully' });
        writeToUserLog(userid, 'Created Tax Preferences  - '+taxprefname, compid, isweb);
      }
    }
  } catch (error) {
    console.error('Error creating or updating Tax Preferences:', error);
    res.status(500).json({ error: 'An error occurred while creating or updating the Tax Preferences' });
  }
});

module.exports = router;
