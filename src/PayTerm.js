const express = require('express');
const pool = require('../db'); // Import the database connection
const authMiddleware = require('../authMiddleware'); // Import the authentication middleware
const router = express.Router();
const { writeToUserLog } = require('./common');

/**
 * @swagger
 * tags:
 *   name: PayTerms
 *   description: API endpoints for Pay Terms
 */

/**
 * @swagger
 * /api/GetPaymentTerm:
 *   get:
 *     summary: Get all Pay Terms
 *     tags: [PayTerms]
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all Pay Terms
 *       500:
 *         description: An error occurred while retrieving the Pay Terms
 */
router.get('/api/GetPaymentTerm', authMiddleware, async (req, res) => {
  try {
    const payTerms = await db.query('SELECT * FROM public."PayTerms"');
    res.status(200).json(payTerms.rows);
  } catch (error) {
    console.error('Error retrieving Pay Terms:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Pay Terms' });
  }
});

/**
 * @swagger
 * /api/GetAPayTerm/{paytermid}:
 *   get:
 *     summary: Get a single Pay Term by paytermid
 *     tags: [PayTerms]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: paytermid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Pay Term ID
 *     responses:
 *       200:
 *         description: Successfully retrieved the Pay Term
 *       404:
 *         description: Pay Term not found
 *       500:
 *         description: An error occurred while retrieving the Pay Term
 */
router.get('/api/GetAPayTerm/:paytermid', authMiddleware, async (req, res) => {
  const { paytermid } = req.params;

  try {
    const payTerm = await db.query('SELECT * FROM public."PayTerms" WHERE paytermid = $1', [paytermid]);

    if (payTerm.rows.length === 0) {
      res.status(404).json({ error: 'Pay Term not found' });
    } else {
      res.status(200).json(payTerm.rows[0]);
    }
  } catch (error) {
    console.error('Error retrieving Pay Term:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Pay Term' });
  }
});

/**
 * @swagger
 * /api/payterms/{paytermid}:
 *   delete:
 *     summary: Delete a Pay Term by paytermid
 *     tags: [PayTerms]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: paytermid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Pay Term ID
 *     responses:
 *       204:
 *         description: Pay Term deleted successfully
 *       404:
 *         description: Pay Term not found
 *       500:
 *         description: An error occurred while deleting the Pay Term
 */
router.delete('/api/payterms/:paytermid', authMiddleware, async (req, res) => {
  const { paytermid } = req.params;

  try {
    const deleteResult = await db.query('DELETE FROM public."PayTerms" WHERE paytermid = $1', [paytermid]);

    if (deleteResult.rowCount > 0) {
      res.sendStatus(204);
    } else {
      res.status(404).json({ error: 'Pay Term not found' });
    }
  } catch (error) {
    console.error('Error deleting Pay Term:', error);
    res.status(500).json({ error: 'An error occurred while deleting the Pay Term' });
  }
});

/**
 * @swagger
 * /api/SavePayTerm:
 *   post:
 *     summary: Create or update a Pay Term
 *     tags: [PayTerms]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paytermid:
 *                 type: integer
 *               payterm:
 *                 type: string
 *               noofdays:
 *                 type: integer
 *               compid:
 *                 type: integer
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Pay Term created or updated successfully
 *       500:
 *         description: An error occurred while creating or updating the Pay Term
 */
router.post('/api/SavePayTerm', authMiddleware, async (req, res) => {
  const { paytermid, payterm, noofdays, compid, userid, isweb } = req.body;

  try {
    const payTermExists = await db.query('SELECT * FROM public."PayTerms" WHERE TRIM(payterm) ILIKE $1', [payterm.trim()]);

    if (payTermExists.rows.length > 0) {
      await db.query('UPDATE public."PayTerms" SET noofdays = $1, compid = $2 WHERE TRIM(payterm) ILIKE $3', [noofdays, compid, payterm.trim()]);
      res.status(201).json({ message: 'Pay Term updated successfully' });
      writeToUserLog(userid, 'Updated Payment Terms  - '+payterm, compid, isweb);
    } else {
      if (paytermid > 0) {
        const payTermExists1 = await db.query('SELECT * FROM public."PayTerms" WHERE paytermid = $1', [paytermid]);

        if (payTermExists1.rows.length > 0) {
            await db.query('UPDATE public."PayTerms" SET noofdays = $1, compid = $2, payterm = $3 WHERE paytermid = $4', [noofdays, compid, payterm, paytermid]);
            res.status(201).json({ message: 'Pay Term updated successfully' });
            writeToUserLog(userid, 'Updated Payment Terms  - '+paytermid.toString(), compid, isweb);
          }
          else
          {
          await db.query('INSERT INTO public."PayTerms" (payterm, noofdays, compid) VALUES ($1, $2, $3)', [payterm, noofdays, compid]);
          res.status(201).json({ message: 'Pay Term created successfully' });
          writeToUserLog(userid, 'Created Payment Terms  - '+payterm, compid, isweb);
        }
        }
      else
      {
        await db.query('INSERT INTO public."PayTerms" (payterm, noofdays, compid) VALUES ($1, $2, $3)', [payterm, noofdays, compid]);
        res.status(201).json({ message: 'Pay Term created successfully' });
        writeToUserLog(userid, 'Created Payment Terms  - '+payterm, compid, isweb);
      }
}
  } catch (error) {
    console.error('Error creating or updating Pay Term:', error);
    res.status(500).json({ error: 'An error occurred while creating or updating the Pay Term' });
  }
});

module.exports = router;
