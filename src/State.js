const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');
const { writeToUserLog } = require('./common');

/**
 * @swagger
 * tags:
 *   name: State
 *   description: API endpoints for State
 */

/**
 * @swagger
 * /api/GetAllStates:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get all State from Country
 *     tags: [State]
 *     responses:
 *       200:
 *         description: Successfully retrieved all States
 *       500:
 *         description: An error occurred while retrieving the States
 */
router.get('/api/GetAllStates', authenticateToken, async (req, res) => {
  const { countryid } = req.params;

  try {
  const query = 'SELECT s.*,c.countryname FROM public."States" s left outer join "Country" c on s.countryid=c.countryid';
  const result = await pool.query(query);

  res.status(200).json(result.rows);
} catch (error) {
  console.error('Error retrieving States:', error);
  res.status(500).json({ error: 'An error occurred while retrieving the States' });
}
});


/**
 * @swagger
 * /api/GetStates/{countryid}:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get all State from Country
 *     tags: [State]
 *     parameters:
 *       - in: path
 *         name: countryid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Country ID
 *     responses:
 *       200:
 *         description: Successfully retrieved all States
 *       500:
 *         description: An error occurred while retrieving the States
 */
router.get('/api/GetStates/:countryid', authenticateToken, async (req, res) => {
    const { countryid } = req.params;

    try {
    const query = 'SELECT * FROM public."States" WHERE countryid = $1';
    const result = await pool.query(query, [countryid]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error retrieving States:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the States' });
  }
});

/**
 * @swagger
 * /api/state/{stateid}:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get a single State by stateid
 *     tags: [State]
 *     parameters:
 *       - in: path
 *         name: stateid
 *         schema:
 *           type: integer
 *         required: true
 *         description: State ID
 *     responses:
 *       200:
 *         description: Successfully retrieved the State
 *       404:
 *         description: State not found
 *       500:
 *         description: An error occurred while retrieving the State
 */
router.get('/api/state/:stateid', authenticateToken, async (req, res) => {
  const { stateid } = req.params;

  try {
    const query = 'SELECT * FROM public."States" WHERE stateid = $1';
    const result = await pool.query(query, [stateid]);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'State not found' });
    }
  } catch (error) {
    console.error('Error retrieving State:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the State' });
  }
});

/**
 * @swagger
 * /api/SaveState:
 *   post:
 *     summary: Create or update a State
 *     tags: [State]
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stateid:
 *                 type: integer
 *               statename:
 *                 type: string
 *                 maxLength: 200
 *               countryid:
 *                 type: integer
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: stateid
 *       201:
 *         description: Successfully created a new State
 *       500:
 *         description: An error occurred while creating/updating the State
 */
router.post('/api/SaveState', authenticateToken, async (req, res) => {
  const { stateid, statename, countryid, userid, isweb } = req.body;

  try {
    const checkQuery = 'SELECT * FROM public."States" WHERE TRIM(statename) ILIKE $1';
    const checkResult = await pool.query(checkQuery, [statename.trim()]);
    const compid=0;

    if (checkResult.rows.length > 0) {
      const updateQuery = 'UPDATE public."States" SET countryid = $2, statename=$3 WHERE TRIM(statename) ILIKE $1 RETURNING stateid';
      const updateResult = await pool.query(updateQuery, [statename.trim(), countryid, statename]);

      res.status(200).json(updateResult.rows[0]);
      writeToUserLog(userid, 'Updated State  - '+statename, compid, isweb);
    } else {
      if (stateid > 0) {
        const sQuery = 'SELECT * FROM public."States" WHERE stateid = $1';
        const sResult = await pool.query(sQuery, [stateid]);
    
        if (sResult.rows.length > 0) {
          const updateQuery1 = 'UPDATE public."States" SET countryid = $2, statename=$3 WHERE stateid = $1 RETURNING stateid';
          const updateResult1 = await pool.query(updateQuery1, [stateid, countryid, statename]);
    
          res.status(200).json(updateResult1.rows[0]);
          writeToUserLog(userid, 'Updated State  - '+stateid.toString(), compid, isweb);
        }
        else { 
          const createQuery = 'INSERT INTO public."States" (statename, countryid) VALUES ($1, $2) RETURNING stateid';
          const createResult = await pool.query(createQuery, [statename, countryid]);
          res.status(201).json(createResult.rows[0]);
          writeToUserLog(userid, 'Created State  - '+statename, compid, isweb);
        }
      }
      else { 
        const createQuery1 = 'INSERT INTO public."States" (statename, countryid) VALUES ($1, $2) RETURNING stateid';
        const createResult1 = await pool.query(createQuery1, [statename, countryid]);
        res.status(201).json(createResult1.rows[0]);
        writeToUserLog(userid, 'Created State  - '+statename, compid, isweb);
      }
    }
  } catch (error) {
    console.error('Error creating/updating State:', error);
    res.status(500).json({ error: 'An error occurred while creating/updating the State' });
  }
});

/**
 * @swagger
 * /api/states/{stateid}:
 *   delete:
 *     security:
 *       - BasicAuth: []
 *     summary: Delete a State by stateid
 *     tags: [State]
 *     parameters:
 *       - in: path
 *         name: stateid
 *         schema:
 *           type: integer
 *         required: true
 *         description: State ID
 *     responses:
 *       204:
 *         description: State deleted successfully
 *       404:
 *         description: State not found
 *       500:
 *         description: An error occurred while deleting the State
 */
router.delete('/api/states/:stateid', authenticateToken, async (req, res) => {
  const { stateid } = req.params;

  try {
    const deleteQuery = 'DELETE FROM public."States" WHERE stateid = $1';
    const deleteResult = await pool.query(deleteQuery, [stateid]);

    if (deleteResult.rowCount > 0) {
      res.sendStatus(204);
    } else {
      res.status(404).json({ error: 'State not found' });
    }
  } catch (error) {
    console.error('Error deleting State:', error);
    res.status(500).json({ error: 'An error occurred while deleting the State' });
  }
});

module.exports = router;
