const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');
const { writeToUserLog } = require('./common');

/**
 * @swagger
 * tags:
 *   name: Country
 *   description: API endpoints for Country
 */

/**
 * @swagger
 * /api/GetCountries:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get all Countries
 *     tags: [Country]
 *     responses:
 *       200:
 *         description: Successfully retrieved all Countries
 *       500:
 *         description: An error occurred while retrieving the Countries
 */
router.get('/api/GetCountries', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT * FROM public."Country"';
    const result = await pool.query(query);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error retrieving Countries:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Countries' });
  }
});

/**
 * @swagger
 * /api/countries/{countryid}:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get a single Country by countryid
 *     tags: [Country]
 *     parameters:
 *       - in: path
 *         name: countryid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Country ID
 *     responses:
 *       200:
 *         description: Successfully retrieved the Country
 *       404:
 *         description: Country not found
 *       500:
 *         description: An error occurred while retrieving the Country
 */
router.get('/api/countries/:countryid', authenticateToken, async (req, res) => {
  const { countryid } = req.params;

  try {
    const query = 'SELECT * FROM public."Country" WHERE countryid = $1';
    const result = await pool.query(query, [countryid]);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Country not found' });
    }
  } catch (error) {
    console.error('Error retrieving Country:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Country' });
  }
});

/**
 * @swagger
 * /api/SaveCountry:
 *   post:
 *     summary: Create or update a Country
 *     tags: [Country]
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               countryid:
 *                 type: integer
 *               countryname:
 *                 type: string
 *                 maxLength: 250
 *               defcurcode:
 *                 type: string
 *                 maxLength: 3
 *               isdcode:
 *                 type: integer
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Country ID
 *       201:
 *         description: Successfully created a new Country
 *       500:
 *         description: An error occurred while creating/updating the Country
 */
router.post('/api/SaveCountry', authenticateToken, async (req, res) => {
  const { countryid, countryname, defcurcode, isdcode, userid, isweb } = req.body;

  try {
    const checkQuery = 'SELECT * FROM public."Country" WHERE TRIM(countryname) ILIKE $1';
    const checkResult = await pool.query(checkQuery, [countryname.trim()]);
    const compid = 0;

    if (checkResult.rows.length > 0) {
      const updateQuery = 'UPDATE public."Country" SET defcurcode = $2, isdcode=$3, countryname = $1 WHERE TRIM(countryname) ILIKE $1 RETURNING countryid';
      const updateResult = await pool.query(updateQuery, [countryname.trim(), defcurcode, isdcode]);
      res.status(200).json(updateResult.rows[0]);
      writeToUserLog(userid, 'Updated Country - '+countryname, compid, isweb);
    } else {
      if (countryid > 0) {
        const checkQuery1 = 'SELECT * FROM public."Country" WHERE countryid = $1';
        const checkResult1 = await pool.query(checkQuery1, [countryid]);
        if (checkResult1.rows.length > 0) {
            const updateQuery1 = 'UPDATE public."Country" SET defcurcode = $2, isdcode=$3, countryname = $1 WHERE countryid = $4 RETURNING countryid';
            const updateResult1 = await pool.query(updateQuery1, [countryname, defcurcode, isdcode, countryid]);
            res.status(200).json(updateResult1.rows[0]);
            writeToUserLog(userid, 'Updated Country - '+countryid.toString(), compid, isweb);
          } else {
            const createQuery = 'INSERT INTO public."Country" (countryname, defcurcode, isdcode) VALUES ($1, $2, $3) RETURNING countryid';
            const createResult = await pool.query(createQuery, [countryname, defcurcode, isdcode]);
            res.status(201).json(createResult.rows[0]);
            writeToUserLog(userid, 'Created Country - '+countryname, compid, isweb);
          }
          }
        else {
          const createQuery1 = 'INSERT INTO public."Country" (countryname, defcurcode, isdcode) VALUES ($1, $2, $3) RETURNING countryid';
          const createResult1 = await pool.query(createQuery1, [countryname, defcurcode, isdcode]);
          res.status(201).json(createResult1.rows[0]);
          writeToUserLog(userid, 'Updated Country - '+countryname, compid, isweb);
        }
    }
    } catch (error) {
    console.error('Error creating/updating Country:', error);
    res.status(500).json({ error: 'An error occurred while creating/updating the Country' });
  }
});

/**
 * @swagger
 * /api/countries/{countryid}:
 *   delete:
 *     security:
 *       - BasicAuth: []
 *     summary: Delete a Country by countryid
 *     tags: [Country]
 *     parameters:
 *       - in: path
 *         name: countryid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Country ID
 *     responses:
 *       204:
 *         description: Country deleted successfully
 *       404:
 *         description: Country not found
 *       500:
 *         description: An error occurred while deleting the Country
 */
router.delete('/api/countries/:countryid', authenticateToken, async (req, res) => {
  const { countryid } = req.params;

  try {
    const deleteQuery = 'DELETE FROM public."Country" WHERE countryid = $1';
    const deleteResult = await pool.query(deleteQuery, [countryid]);

    if (deleteResult.rowCount > 0) {
      res.sendStatus(204);
    } else {
      res.status(404).json({ error: 'Country not found' });
    }
  } catch (error) {
    console.error('Error deleting Country:', error);
    res.status(500).json({ error: 'An error occurred while deleting the Country' });
  }
});

module.exports = router;
