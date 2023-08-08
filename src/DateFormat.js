const express = require('express');
const pool = require('../db'); // Import the database connection
const authMiddleware = require('../authMiddleware'); // Import the authentication middleware
const router = express.Router();
const { writeToUserLog } = require('./common');

/**
 * @swagger
 * tags:
 *   name: DateFormat
 *   description: API endpoints for Date Format
 */

/**
 * @swagger
 * /api/GetDateFormat:
 *   get:
 *     summary: Get all Date Formats
 *     tags: [DateFormat]
 *     security:
 *       - BasicAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all Date Formats
 *       500:
 *         description: An error occurred while retrieving the Date Formats
 */
router.get('/api/GetDateFormat', authMiddleware, async (req, res) => {
  try {
    const dateFormats = await pool.query('SELECT * FROM public."DateFormat"');
    res.status(200).json(dateFormats.rows);
  } catch (error) {
    console.error('Error retrieving Date Formats:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Date Formats' });
  }
});

/**
 * @swagger
 * /api/GetADateFormat/{dateformatid}:
 *   get:
 *     summary: Get a single Date Format by dateformatid
 *     tags: [DateFormat]
 *     security:
 *       - BasicAuth: []
 *     parameters:
 *       - in: path
 *         name: dateformatid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Date Format ID
 *     responses:
 *       200:
 *         description: Successfully retrieved the Date Format
 *       404:
 *         description: Date Format not found
 *       500:
 *         description: An error occurred while retrieving the Date Format
 */
router.get('/api/GetADateFormat/:dateformatid', authMiddleware, async (req, res) => {
  const { dateformatid } = req.params;

  try {
    const dateFormat = await pool.query('SELECT * FROM public."DateFormat" WHERE dateformatid = $1', [dateformatid]);

    if (dateFormat.rows.length === 0) {
      res.status(404).json({ error: 'Date Format not found' });
    } else {
      res.status(200).json(dateFormat.rows[0]);
    }
  } catch (error) {
    console.error('Error retrieving Date Format:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Date Format' });
  }
});

/**
 * @swagger
 * /api/dateFormats/{dateformatid}:
 *   delete:
 *     summary: Delete a Date Format by dateformatid
 *     tags: [DateFormat]
 *     security:
 *       - BasicAuth: []
 *     parameters:
 *       - in: path
 *         name: dateformatid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Date Format ID
 *     responses:
 *       204:
 *         description: Date Format deleted successfully
 *       404:
 *         description: Date Format not found
 *       500:
 *         description: An error occurred while deleting the Date Format
 */
router.delete('/api/dateFormats/:dateformatid', authMiddleware, async (req, res) => {
  const { dateformatid } = req.params;

  try {
    const deleteResult = await pool.query('DELETE FROM public."DateFormat" WHERE dateformatid = $1', [dateformatid]);

    if (deleteResult.rowCount > 0) {
      res.sendStatus(204);
    } else {
      res.status(404).json({ error: 'Date Format not found' });
    }
  } catch (error) {
    console.error('Error deleting Date Format:', error);
    res.status(500).json({ error: 'An error occurred while deleting the Date Format' });
  }
});

/**
 * @swagger
 * /api/SaveDateFormat:
 *   post:
 *     summary: Create or update a Date Format
 *     tags: [DateFormat]
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dateformatid:
 *                 type: integer
 *               dateformat:
 *                 type: string
 *               monfmt:
 *                 type: string
 *               daypos:
 *                 type: integer
 *               monpos:
 *                 type: integer
 *               yearpos:
 *                 type: integer
 *               yearfmt:
 *                 type: string
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Date Format created or updated successfully
 *       500:
 *         description: An error occurred while creating or updating the Date Format
 */
router.post('/api/SaveDateFormat', authMiddleware, async (req, res) => {
  const { dateformatid, dateformat, monfmt, daypos, monpos, yearpos, yearfmt, userid, isweb } = req.body;

  try {

    const checkQuery = 'SELECT * FROM public."DateFormat" WHERE dateformat = $1';
    const checkResult = await pool.query(checkQuery, [dateformat]);
    const compid = 0;

    if (checkResult.rows.length > 0) {
        const updateQuery = 'UPDATE public."DateFormat" SET monfmt = $2, daypos = $3, monpos = $4, yearpos = $5, yearfmt = $6 WHERE countryname = $1 RETURNING dateformatid';
        const updateResult = await pool.query(updateQuery, [dateformat, monfmt, daypos, monpos, yearpos, yearfmt]);
  
        res.status(200).json(updateResult.rows[0]);
        writeToUserLog(userid, 'Updated Date Format - '+dateformat, compid, isweb);
      } else {
        if (dateformatid > 0) {
          const checkQuery1 = 'SELECT * FROM public."DateFormat" WHERE dateformatid = $1';
          const checkResult1 = await pool.query(checkQuery1, [dateformatid]);
      
          if (checkResult1.rows.length > 0) {
                const updateQuery1 = 'UPDATE public."DateFormat" SET countryname = $1, monfmt = $2, daypos = $3, monpos = $4, yearpos = $5, yearfmt = $6 WHERE dateformatid = $7 RETURNING dateformatid';
                const updateResult1 = await pool.query(updateQuery1, [dateformat, monfmt, daypos, monpos, yearpos, yearfmt, dateformatid]);
          
                res.status(200).json(updateResult1.rows[0]);
                writeToUserLog(userid, 'Updated Date Format - '+dateformatid.toString(), compid, isweb);
              } else {
                const createQuery = 'INSERT INTO public."DateFormat" (dateformat, monfmt, daypos, monpos, yearpos, yearfmt) VALUES ($1, $2, $3, $4, $5, $6) RETURNING dateformatid';
                const createResult = await pool.query(createQuery, [dateformat, monfmt, daypos, monpos, yearpos, yearfmt]);
          
                res.status(201).json(createResult.rows[0]);
                writeToUserLog(userid, 'Created Date Format - '+dateformat, compid, isweb);
              }
          }
        else {
          const createQuery1 = 'INSERT INTO public."DateFormat" (dateformat, monfmt, daypos, monpos, yearpos, yearfmt) VALUES ($1, $2, $3, $4, $5, $6) RETURNING dateformatid';
          const createResult1 = await pool.query(createQuery1, [dateformat, monfmt, daypos, monpos, yearpos, yearfmt]);    
          res.status(201).json(createResult1.rows[0]);
          writeToUserLog(userid, 'Created Date Format - '+dateformat, compid, isweb);
        }
}
    } catch (error) {
    console.error('Error creating or updating Date Format:', error);
    res.status(500).json({ error: 'An error occurred while creating or updating the Date Format' });
  }
});

module.exports = router;
