const express = require('express');
const pool = require('../db'); // Import the database connection
const authMiddleware = require('../authMiddleware'); // Import the authentication middleware
const router = express.Router();
const { writeToUserLog } = require('./common');

/**
 * @swagger
 * tags:
 *   name: GST Treatment
 *   description: API endpoints for GST Treatment
 */

/**
 * @swagger
 * /api/GetGSTTreatment:
 *   get:
 *     summary: Get all GST Treatment
 *     tags: [GST Treatment]
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all GST Treatments
 *       500:
 *         description: An error occurred while retrieving the GST Treatments
 */
router.get('/api/GetGSTTreatment', authMiddleware, async (req, res) => {
  try {
    const gsttreatments = await pool.query('SELECT gsttreatmentid, gsttreatment FROM public."GSTTreatment"');
    res.status(200).json(gsttreatments.rows);
  } catch (error) {
    console.error('Error retrieving GST Treatments:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the GST Treatment' });
  }
});

/**
 * @swagger
 * /api/GetAGSTTreatment/{gsttreatmentid}:
 *   get:
 *     summary: Get a single GST Treatment by gsttreatmentid
 *     tags: [GST Treatment]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: gsttreatmentid
 *         schema:
 *           type: integer
 *         required: true
 *         description: GST Treatment ID
 *     responses:
 *       200:
 *         description: Successfully retrieved the GST Treatment
 *       404:
 *         description: GST Treatment not found
 *       500:
 *         description: An error occurred while retrieving the GST Treatment
 */
router.get('/api/GetAGSTTreatment/:gsttreatmentid', authMiddleware, async (req, res) => {
  const { gsttreatmentid } = req.params;

  try {
    const gsttreatment = await pool.query('SELECT * FROM public."GSTTreatment" WHERE gsttreatmentid = $1', [gsttreatmentid]);

    if (gsttreatment.rows.length === 0) {
      res.status(404).json({ error: 'GST Treatment not found' });
    } else {
      res.status(200).json(gsttreatment.rows[0]);
    }
  } catch (error) {
    console.error('Error retrieving GST Treatment:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the GST Treatment' });
  }
});

/**
 * @swagger
 * /api/gsttreatments/{gsttreatmentid}:
 *   delete:
 *     summary: Delete a GST Treatment by gsttreatmentid
 *     tags: [GST Treatment]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: gsttreatmentid
 *         schema:
 *           type: integer
 *         required: true
 *         description: GST Treatment ID
 *     responses:
 *       204:
 *         description: GST Treatment deleted successfully
 *       404:
 *         description: GST Treatment not found
 *       500:
 *         description: An error occurred while deleting the GST Treatment
 */
router.delete('/api/gsttreatments/:gsttreatmentid', authMiddleware, async (req, res) => {
  const { gsttreatmentid } = req.params;

  try {
    const deleteResult = await pool.query('DELETE FROM public."GSTTreatment" WHERE gsttreatmentid = $1', [gsttreatmentid]);

    if (deleteResult.rowCount > 0) {
      res.sendStatus(204);
    } else {
      res.status(404).json({ error: 'GST Treatment not found' });
    }
  } catch (error) {
    console.error('Error deleting GST Treatment:', error);
    res.status(500).json({ error: 'An error occurred while deleting the GST Treatment' });
  }
});

/**
 * @swagger
 * /api/SaveGSTTreatment:
 *   post:
 *     summary: Create or update a GST Treatment
 *     tags: [GST Treatment]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gsttreatmentid:
 *                 type: integer
 *               gsttreatment:
 *                 type: string
 *               reqgstno:
 *                 type: boolean
 *               reqsupplace:
 *                 type: boolean
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: GST Treatment created or updated successfully
 *       500:
 *         description: An error occurred while creating or updating the GST Treatment
 */
router.post('/api/SaveGSTTreatment', authMiddleware, async (req, res) => {
  const { gsttreatmentid, gsttreatment, reqgstno, reqsupplace,  userid, isweb } = req.body;

  try {
    const gsttreatmentExists = await pool.query('SELECT * FROM public."GSTTreatment" WHERE TRIM(gsttreatment) ILIKE $1', [gsttreatment.trim()]);
    const compid = 0;

    if (gsttreatmentExists.rows.length > 0) {
      await pool.query('UPDATE public."GSTTreatment" SET gsttreatment = $1, reqgstno = $2, reqsupplace = $3 WHERE TRIM(gsttreatment) ILIKE $1', [gsttreatment.trim(), reqgstno, reqsupplace]);
      res.status(201).json({ message: 'GST Treatment updated successfully' });
      writeToUserLog(userid, 'Updated GST Treatment - '+gsttreatment, compid, isweb);
    } else {
      if (gsttreatmentid > 0)
      {
        const gsttreatmentExists1 = await pool.query('SELECT * FROM public."GSTTreatment" WHERE gsttreatmentid = $1', [gsttreatmentid]);
        if (gsttreatmentExists1.rows.length > 0) 
          {
          await pool.query('UPDATE public."GSTTreatment" SET gsttreatment = $1, reqgstno = $3, reqsupplace = $4 WHERE gsttreatmentid = $2', [gsttreatment, gsttreatmentid, reqgstno, reqsupplace]);
          res.status(201).json({ message: 'GST Treatment updated successfully' });
          writeToUserLog(userid, 'Updated GST Treatment - '+gsttreatmentid.toString(), compid, isweb);
        }
        else{
          await pool.query('INSERT INTO public."GSTTreatment" (gsttreatment, reqgstno, reqsupplace) VALUES ($1, $2, $3)', [gsttreatment, reqgstno, reqsupplace]);
          res.status(201).json({ message: 'GST Treatment created successfully' });
          writeToUserLog(userid, 'Created GST Treatment - '+gsttreatment, compid, isweb);
        }
      }
      else{
        await pool.query('INSERT INTO public."GSTTreatment" (gsttreatment, reqgstno, reqsupplace) VALUES ($1, $2, $3)', [gsttreatment, reqgstno, reqsupplace]);
        res.status(201).json({ message: 'GST Treatment created successfully' });
        writeToUserLog(userid, 'Created GST Treatment - '+gsttreatment, compid, isweb);
      }
    }
  } catch (error) {
    console.error('Error creating or updating GST Treatment:', error);
    res.status(500).json({ error: 'An error occurred while creating or updating the GST Treatment' });
  }
});

module.exports = router;
