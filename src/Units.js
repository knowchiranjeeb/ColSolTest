const express = require('express');
const pool = require('../db'); // Import the database connection
const authMiddleware = require('../authMiddleware'); // Import the authentication middleware
const router = express.Router();
const { writeToUserLog } = require('./common');

/**
 * @swagger
 * tags:
 *   name: Units
 *   description: API endpoints for Units
 */

/**
 * @swagger
 * /api/GetUnits:
 *   get:
 *     summary: Get all Units
 *     tags: [Units]
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all Units
 *       500:
 *         description: An error occurred while retrieving the Units
 */
router.get('/api/GetUnits', authMiddleware, async (req, res) => {
  try {
    const units = await pool.query('SELECT * FROM public."Units"');
    res.status(200).json(units.rows);
  } catch (error) {
    console.error('Error retrieving Units:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Units' });
  }
});

/**
 * @swagger
 * /api/units/{unitid}:
 *   get:
 *     summary: Get a single Unit by unitid
 *     tags: [Units]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: unitid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Unit ID
 *     responses:
 *       200:
 *         description: Successfully retrieved the Unit
 *       404:
 *         description: Unit not found
 *       500:
 *         description: An error occurred while retrieving the Unit
 */
router.get('/api/units/:unitid', authMiddleware, async (req, res) => {
  const { unitid } = req.params;

  try {
    const unit = await pool.query('SELECT * FROM public."Units" WHERE unitid = $1', [unitid]);

    if (unit.rows.length === 0) {
      res.status(404).json({ error: 'Unit not found' });
    } else {
      res.status(200).json(unit.rows[0]);
    }
  } catch (error) {
    console.error('Error retrieving Unit:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Unit' });
  }
});

/**
 * @swagger
 * /api/units/{unitid}:
 *   delete:
 *     summary: Delete a Unit by unitid
 *     tags: [Units]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: unitid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Unit ID
 *     responses:
 *       204:
 *         description: Unit deleted successfully
 *       404:
 *         description: Unit not found
 *       500:
 *         description: An error occurred while deleting the Unit
 */
router.delete('/api/units/:unitid', authMiddleware, async (req, res) => {
  const { unitid } = req.params;

  try {
    const deleteResult = await pool.query('DELETE FROM public."Units" WHERE unitid = $1', [unitid]);

    if (deleteResult.rowCount > 0) {
      res.sendStatus(204);
    } else {
      res.status(404).json({ error: 'Unit not found' });
    }
  } catch (error) {
    console.error('Error deleting Unit:', error);
    res.status(500).json({ error: 'An error occurred while deleting the Unit' });
  }
});

/**
 * @swagger
 * /api/SaveUnit:
 *   post:
 *     summary: Create or update a Unit
 *     tags: [Units]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               unitid:
 *                 type: integer
 *               unitname:
 *                 type: string
 *               compid:
 *                 type: integer
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Unit created or updated successfully
 *       500:
 *         description: An error occurred while creating or updating the Unit
 */
router.post('/api/SaveUnit', authMiddleware, async (req, res) => {
  const { unitid, unitname, compid, userid, isweb } = req.body;

  try {
    const unitExists = await pool.query('SELECT * FROM public."Units" WHERE TRIM(unitname) ILIKE $1', [unitname.trim()]);

    if (unitExists.rows.length > 0) {
      await pool.query('UPDATE public."Units" SET compid = $1 WHERE TRIM(unitname) ILIKE $2', [compid, unitname.trim()]);
      res.status(201).json({ message: 'Unit updated successfully' });
      writeToUserLog(userid, 'Updated Unit  - '+unitname, compid, isweb);
    } else {
      if (unitid > 0) {
        const checkQuery = `
          SELECT COUNT(*) AS count FROM "Units" WHERE unitid = $1
        `;
        const checkResult = await pool.query(checkQuery, [unitid]);
        const uExists = checkResult.rows[0].count > 0;
        if (uExists) {
          await pool.query('UPDATE public."Units" SET compid = $1, unitname = $2, userid = $3 WHERE unitid = $4', [compid, unitname, userid, unitid]);
          res.status(201).json({ message: 'Unit updated successfully' });
          writeToUserLog(userid, 'Updated Unit  - '+unitid.toString(), compid, isweb);
        } else {
          await pool.query('INSERT INTO public."Units" (unitname, compid, userid) VALUES ($1, $2, $3)', [unitname, compid, userid]);
          res.status(201).json({ message: 'Unit created successfully' });
          writeToUserLog(userid, 'Created Unit  - '+unitname, compid, isweb);
        } 
      } else {
        await pool.query('INSERT INTO public."Units" (unitname, compid, userid) VALUES ($1, $2, $3)', [unitname, compid, userid]);
        res.status(201).json({ message: 'Unit created successfully' });
        writeToUserLog(userid, 'Created Unit  - '+unitname, compid, isweb);
      }
  }
  } catch (error) {
    console.error('Error creating or updating Unit:', error);
    res.status(500).json({ error: 'An error occurred while creating or updating the Unit' });
  }
});

module.exports = router;
