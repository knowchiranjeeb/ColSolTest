const express = require('express');
const pool = require('../db'); // Import the database connection
const authMiddleware = require('../authMiddleware'); // Import the authentication middleware
const router = express.Router();
const { writeToUserLog } = require('./common');

/**
 * @swagger
 * tags:
 *   name: Salutations
 *   description: API endpoints for Salutations
 */

/**
 * @swagger
 * /api/GetSalutation:
 *   get:
 *     summary: Get all Salutations
 *     tags: [Salutations]
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all Salutations
 *       500:
 *         description: An error occurred while retrieving the Salutations
 */
router.get('/api/GetSalutation', authMiddleware, async (req, res) => {
  try {
    const salutations = await pool.query('SELECT * FROM public."Salutation"');
    res.status(200).json(salutations.rows);
  } catch (error) {
    console.error('Error retrieving Salutations:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Salutations' });
  }
});

/**
 * @swagger
 * /api/GetASalutation/{salid}:
 *   get:
 *     summary: Get a single Salutation by salid
 *     tags: [Salutations]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: salid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Salutation ID
 *     responses:
 *       200:
 *         description: Successfully retrieved the Salutation
 *       404:
 *         description: Salutation not found
 *       500:
 *         description: An error occurred while retrieving the Salutation
 */
router.get('/api/GetASalutation/:salid', authMiddleware, async (req, res) => {
  const { salid } = req.params;

  try {
    const salutation = await pool.query('SELECT * FROM public."Salutation" WHERE salid = $1', [salid]);

    if (salutation.rows.length === 0) {
      res.status(404).json({ error: 'Salutation not found' });
    } else {
      res.status(200).json(salutation.rows[0]);
    }
  } catch (error) {
    console.error('Error retrieving Salutation:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Salutation' });
  }
});

/**
 * @swagger
 * /api/salutations/{salid}:
 *   delete:
 *     summary: Delete a Salutation by salid
 *     tags: [Salutations]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: salid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Salutation ID
 *     responses:
 *       204:
 *         description: Salutation deleted successfully
 *       404:
 *         description: Salutation not found
 *       500:
 *         description: An error occurred while deleting the Salutation
 */
router.delete('/api/salutations/:salid', authMiddleware, async (req, res) => {
  const { salid } = req.params;

  try {
    const deleteResult = await pool.query('DELETE FROM public."Salutation" WHERE salid = $1', [salid]);

    if (deleteResult.rowCount > 0) {
      res.sendStatus(204);
    } else {
      res.status(404).json({ error: 'Salutation not found' });
    }
  } catch (error) {
    console.error('Error deleting Salutation:', error);
    res.status(500).json({ error: 'An error occurred while deleting the Salutation' });
  }
});

/**
 * @swagger
 * /api/SaveSalutation:
 *   post:
 *     summary: Create or update a Salutation
 *     tags: [Salutations]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               salid:
 *                 type: integer
 *               salutation:
 *                 type: string
 *               gender:
 *                 type: string
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Salutation created or updated successfully
 *       500:
 *         description: An error occurred while creating or updating the Salutation
 */
router.post('/api/SaveSalutation', authMiddleware, async (req, res) => {
  const { salid, salutation, gender, userid, isweb } = req.body;

  try {
    const salutationExists = await pool.query('SELECT * FROM public."Salutation" WHERE TRIM(salutation) ILIKE $1', [salutation.trim()]);
    const compid=0;

    if (salutationExists.rows.length > 0) {
      await pool.query('UPDATE public."Salutation" SET gender = $1, salutation = $2 WHERE TRIM(salutation) ILIKE $2', [gender, salutation.trim()]);
      res.status(201).json({ message: 'Salutation updated successfully' });
      writeToUserLog(userid, 'Updated Salutation  - '+salutation, compid, isweb);
    } else {
      if (salid > 0) {
        const salutationExists1 = await pool.query('SELECT * FROM public."Salutation" WHERE salid = $1', [salid]);

        if (salutationExists1.rows.length > 0) {
          await pool.query('UPDATE public."Salutation" SET gender = $1, salutation = $2 WHERE salid = $3', [gender, salutation, salid]);
          res.status(201).json({ message: 'Salutation updated successfully' });
          writeToUserLog(userid, 'Updated Salutation  - '+salid.toString(), compid, isweb);
        } else {
          await pool.query('INSERT INTO public."Salutation" (salutation, gender) VALUES ($1, $2)', [salutation, gender]);
          res.status(201).json({ message: 'Salutation created successfully' });
          writeToUserLog(userid, 'Created Salutation  - '+salutation, compid, isweb);
        }
      }
    else {
      await pool.query('INSERT INTO public."Salutation" (salutation, gender) VALUES ($1, $2)', [salutation, gender]);
      res.status(201).json({ message: 'Salutation created successfully' });
      writeToUserLog(userid, 'Created Salutation  - '+salutation, compid, isweb);
    }
}
  } catch (error) {
    console.error('Error creating or updating Salutation:', error);
    res.status(500).json({ error: 'An error occurred while creating or updating the Salutation' });
  }
});

module.exports = router;
