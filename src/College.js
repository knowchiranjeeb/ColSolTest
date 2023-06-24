const express = require('express');
const router = express.Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');
const authenticateToken = require('../authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     CollegeSmall:
 *       type: object
 *       properties:
 *         collegeid:
 *           type: integer
 *         address:
 *           type: string
 *         city:
 *           type: string
 *         statename:
 *           type: string
 *         country:
 *           type: string
 *         pin:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         website:
 *           type: string
 *         faxno:
 *           type: string
 *         collegetype:
 *           type: string
 *         isgender:
 *           type: boolean
 *         gender:
 *           type: string
 *         emblem:
 *           type: string
 *         collegene:
 *           type: string
 *         collegenw:
 *           type: string
 *         collegese:
 *           type: string
 *         collegesw:
 *           type: string
 */

/**
 * @swagger
 * /api/collegesmall:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Retrieve all records from the CollegeSmall table
 *     tags: [CollegeSmall]
 *     responses:
 *       200:
 *         description: Returns an array of CollegeSmall records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CollegeSmall'
 */
router.get('/api/collegesmall', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT collegeid, address, city, statename, country, pin, email, phone, website, faxno, collegetype, isgender, gender, emblem, collegene, collegenw, collegese, colleges FROM "CollegeSmall"';
    const result = await pool.query(query);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/collegesmall/{collegeid}:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Retrieve a record from the CollegeSmall table by collegeid
 *     tags: [CollegeSmall]
 *     parameters:
 *       - in: path
 *         name: collegeid
 *         required: true
 *         description: ID of the CollegeSmall record
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Returns the CollegeSmall record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CollegeSmall'
 */
router.get('/api/collegesmall/:collegeid', authenticateToken, async (req, res) => {
  try {
    const collegeid = parseInt(req.params.collegeid);

    const query = 'SELECT * FROM "CollegeSmall" WHERE collegeid = $1';
    const values = [collegeid];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'CollegeSmall record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/collegesmall:
 *   post:
 *     security:
 *       - BasicAuth: []
 *     summary: Create a new record in the CollegeSmall table
 *     tags: [CollegeSmall]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CollegeSmall'
 *     responses:
 *       201:
 *         description: Returns the created CollegeSmall record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CollegeSmall'
 */
router.post('/api/collegesmall', authenticateToken, async (req, res) => {
  try {
    const {
      address,
      city,
      statename,
      country,
      pin,
      email,
      phone,
      website,
      faxno,
      collegetype,
      isgender,
      gender,
      emblem,
      collegene,
      collegenw,
      collegese,
      collegesw
    } = req.body;

    const query =
      'INSERT INTO "CollegeSmall" (address, city, statename, country, pin, email, phone, website, faxno, collegetype, isgender, gender, updon, emblem, collegene, collegenw, collegese, collegesw) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *;';
    const values = [
      address,
      city,
      statename,
      country,
      pin,
      email,
      phone,
      website,
      faxno,
      collegetype,
      isgender,
      gender,
      emblem,
      collegene,
      collegenw,
      collegese,
      collegesw
    ];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/collegesmall/{collegeid}:
 *   put:
 *     security:
 *       - BasicAuth: []
 *     summary: Update a record in the CollegeSmall table by collegeid
 *     tags: [CollegeSmall]
 *     parameters:
 *       - in: path
 *         name: collegeid
 *         required: true
 *         description: ID of the CollegeSmall record
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CollegeSmall'
 *     responses:
 *       200:
 *         description: Returns the updated CollegeSmall record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CollegeSmall'
 */
router.put('/api/collegesmall/:collegeid', authenticateToken, async (req, res) => {
  try {
    const collegeid = parseInt(req.params.collegeid);
    const {
      address,
      city,
      statename,
      country,
      pin,
      email,
      phone,
      website,
      faxno,
      collegetype,
      isgender,
      gender,
      emblem,
      collegene,
      collegenw,
      collegese,
      collegesw
    } = req.body;

    const query =
      'UPDATE "CollegeSmall" SET address = $1, city = $2, statename = $3, country = $4, pin = $5, email = $6, phone = $7, website = $8, faxno = $9, collegetype = $10, isgender = $11, gender = $12, emblem = $13, collegene = $14, collegenw = $15, collegese = $16, collegesw = $17 WHERE collegeid = $18 RETURNING *;';
    const values = [
      address,
      city,
      statename,
      country,
      pin,
      email,
      phone,
      website,
      faxno,
      collegetype,
      isgender,
      gender,
      emblem,
      collegene,
      collegenw,
      collegese,
      collegesw,
      collegeid
    ];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'CollegeSmall record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/collegesmall/{collegeid}:
 *   delete:
 *     security:
 *       - BasicAuth: []
 *     summary: Delete a record from the CollegeSmall table by collegeid
 *     tags: [CollegeSmall]
 *     parameters:
 *       - in: path
 *         name: collegeid
 *         required: true
 *         description: ID of the CollegeSmall record
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: CollegeSmall record deleted successfully
 */
router.delete('/api/collegesmall/:collegeid', authenticateToken, async (req, res) => {
  try {
    const collegeid = parseInt(req.params.collegeid);

    const query = 'DELETE FROM "CollegeSmall" WHERE collegeid = $1;';
    const values = [collegeid];
    await pool.query(query, values);

    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
