const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../authMiddleware');
const { writeToUserLog } = require('./common');

/**
 * @swagger
 * tags:
 *   name: Fiscal Year
 *   description: API endpoints for managing Invoice Types
 */

/**
 * @swagger
 * /api/GetFisYear:
 *   get:
 *     summary: Get all Fiscal Years
 *     tags: [Fiscal Year]
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Returns a list of all Fiscal Years
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   fiscalid:
 *                     type: integer
 *                   fiscalyear:
 *                     type: string
 *       500:
 *         description: An error occurred while retrieving the Fiscal Years
 */
router.get('/api/GetFisYear', authMiddleware, async (req, res) => {
  try {
    const fiscalyears = await pool.query('SELECT * FROM public."FiscalYear"');
    res.json(fiscalyears.rows);
  } catch (error) {
    console.error('Error retrieving Fiscal Years:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Fiscal Years' });
  }
});

/**
 * @swagger
 * /api/fiscalyears/{fiscalid}:
 *   get:
 *     summary: Get a single Fiscal year by ID
 *     tags: [Fiscal Year]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: fiscalid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Fiscal year ID
 *     responses:
 *       200:
 *         description: Returns the specified Fiscal year
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fiscalid:
 *                   type: integer
 *                 fiscalyear:
 *                   type: string
 *       404:
 *         description: Fiscal Year not found
 *       500:
 *         description: An error occurred while retrieving the Fiscal Year
 */
router.get('/api/fiscalyears/:fiscalid', authMiddleware, async (req, res) => {
  const { fiscalid } = req.params;

  try {
    const fiscalyear = await pool.query('SELECT * FROM public."FiscalYear" WHERE fiscalid = $1', [fiscalid]);

    if (fiscalyear.rows.length > 0) {
      res.json(fiscalyear.rows[0]);
    } else {
      res.status(404).json({ error: 'Invoice Type not found' });
    }
  } catch (error) {
    console.error('Error retrieving Invoice Type:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Invoice Type' });
  }
});

/**
 * @swagger
 * /api/fiscalyears/{fiscalid}:
 *   delete:
 *     summary: Delete an Fiscal Year by ID
 *     tags: [Fiscal Year]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: fiscalid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Fiscal Year ID
 *     responses:
 *       204:
 *         description: Fiscal Year deleted successfully
 *       404:
 *         description: Fiscal Year not found
 *       500:
 *         description: An error occurred while deleting the Fiscal Year
 */
router.delete('/api/fiscalyears/:fiscalid', authMiddleware, async (req, res) => {
  const { invtypeid } = req.params;

  try {
    const deleteQuery = 'DELETE FROM public."FiscalYear" WHERE fiscalid = $1';
    const deleteResult = await pool.query(deleteQuery, [fiscalid]);

    if (deleteResult.rowCount === 0) {
      res.status(404).json({ error: 'Fiscal Year not found' });
    } else {
      res.sendStatus(204);
    }
  } catch (error) {
    console.error('Error deleting Fiscal Year:', error);
    res.status(500).json({ error: 'An error occurred while deleting the Fiscal Year' });
  }
});

/**
 * @swagger
 * /api/SaveFiscalYear:
 *   post:
 *     summary: Save a Fiscal Year
 *     tags: [Fiscal Year]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fiscalid:
 *                 type: integer
 *               fiscalyear:
 *                 type: string
 *               startmonth:
 *                 type: integer
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Fiscal Year created successfully
 *       500:
 *         description: An error occurred while creating the Fiscal Year
 */
router.post('/api/SaveFiscalYear', authMiddleware, async (req, res) => {
  const { fiscalid, fiscalyear, startmonth, userid, isweb } = req.body;

  try {
    const fiscalExists = await pool.query('SELECT * FROM public."FiscalYear" WHERE startmonth = $1', [startmonth]);
    const compid = 0;

    if (fiscalExists.rows.length > 0) {
      await pool.query('UPDATE public."FiscalYear" SET fiscalyear = $1 WHERE startmonth = $2', [fiscalyear, startmonth]);
      res.status(201).json({ message: 'Fiscal Year updated successfully' });
      writeToUserLog(userid, 'Updated Fiscal Year - '+fiscalyear, compid, isweb);
    } else {
      if (fiscalid > 0) {
        const fiscalExists1 = await pool.query('SELECT * FROM public."FiscalYear" WHERE fiscalid = $1', [fiscalid]);
        if (fiscalExists1.rows.length > 0) {
            await pool.query('UPDATE public."FiscalYear" SET fiscalyear = $1, startmonth = $2 WHERE fiscalid = $3', [fiscalyear, startmonth, fiscalid]);
            res.status(201).json({ message: 'Fiscal Year updated successfully' });
            writeToUserLog(userid, 'Updated Fiscal Year - '+fiscalid.toString(), compid, isweb);
          }
          else {        
            await pool.query('INSERT INTO public."FiscalYear" (fiscalyear, startmonth) VALUES ($1, $2)', [fiscalyear, startmonth]);
            res.status(201).json({ message: 'Fiscal Year created successfully' });
            writeToUserLog(userid, 'Created Fiscal Year - '+fiscalyear, compid, isweb);
          }
      }
        else {        
          await pool.query('INSERT INTO public."FiscalYear" (fiscalyear, startmonth) VALUES ($1, $2)', [fiscalyear, startmonth]);
          res.status(201).json({ message: 'Fiscal Year created successfully' });
          writeToUserLog(userid, 'Created Fiscal Year - '+fiscalyear, compid, isweb);
        }
    }
  } catch (error) {
    console.error('Error creating Fiscal Year:', error);
    res.status(500).json({ error: 'An error occurred while creating the Fiscal Year' });
  }
});

/**
 * @swagger
 * /fiscalyears/{fiscalid}:
 *   put:
 *     summary: Update an Fiscal Year by ID
 *     tags: [Fiscal Year]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: fiscalid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Fiscal Year ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fiscalyear:
 *                 type: string
 *               startmonth:
 *                 type: integer
 *     responses:
 *       204:
 *         description: Fiscal Year updated successfully
 *       404:
 *         description: Fiscal Year not found
 *       500:
 *         description: An error occurred while updating the Fiscal Year
 */
router.put('/fiscalyears/:fiscalid', authMiddleware, async (req, res) => {
  const {  } = req.params;
  const { fiscalyear, startmonth } = req.body;

  try {
    const updateQuery = 'UPDATE public."FiscalYear" SET fiscalyear = $1, startmonth = $2 WHERE fiscalid = $3';
    const updateResult = await pool.query(updateQuery, [fiscalyear, startmonth, fiscalid]);

    if (updateResult.rowCount === 0) {
      res.status(404).json({ error: 'Fiscal Year not found' });
    } else {
      res.sendStatus(204);
    }
  } catch (error) {
    console.error('Error updating Fiscal Year:', error);
    res.status(500).json({ error: 'An error occurred while updating the Fiscal Year' });
  }
});

module.exports = router;
