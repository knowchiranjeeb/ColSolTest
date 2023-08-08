const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../authMiddleware');
const { writeToUserLog } = require('./common');

// Swagger documentation for HSN Code API
/**
 * @swagger
 * tags:
 *   name: HSN Code
 *   description: API endpoints for HSN Codes
 */

/**
 * @swagger
 * /api/GetAllHSNCodes:
 *   get:
 *     summary: Get list of all hsncode and codedesc from the HSNSAC table 
 *     tags: [HSN Code]
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Returns the list of hsncodes and codedesc
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetAllHSNCodes', authMiddleware, async (req, res) => {

  try {
    const query = `
      SELECT hsncode, codedesc, isselectable, isservice 
      FROM "HSNSAC"
    `;

    const { rows } = await pool.query(query);

    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});



/**
 * @swagger
 * /api/GetHSNCodes:
 *   get:
 *     summary: Get list of hsncode and codedesc from the HSNSAC table for a given Service flag
 *     tags: [HSN Code]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: query
 *         name: isservice
 *         schema:
 *           type: boolean
 *         required: true
 *         description: Service flag (true or false)
 *     responses:
 *       200:
 *         description: Returns the list of hsncodes and codedesc
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetHSNCodes', authMiddleware, async (req, res) => {
    const { isservice } = req.query;
  
    //if (isservice === undefined || typeof isservice !== 'boolean') {
    //  return res.status(400).json({ error: 'Invalid request or missing parameters' });
    //}
  
    try {
      const query = `
        SELECT hsncode, codedesc
        FROM "HSNSAC"
        WHERE isselectable = true AND isservice = $1
      `;
  
      const { rows } = await pool.query(query, [isservice]);
  
      return res.status(200).json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
/**
 * @swagger
 * /api/GetHSNCodePart:
 *   get:
 *     summary: Get list of hsncode and codedesc from the HSNSAC table for a given Service flag and hsncode part
 *     tags: [HSN Code]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: query
 *         name: isservice
 *         schema:
 *           type: boolean
 *         required: true
 *         description: Service flag (true or false)
 *       - in: query
 *         name: hsncode
 *         schema:
 *           type: string
 *         description: Part of HSN Code
 *     responses:
 *       200:
 *         description: Returns the list of hsncodes and codedesc
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetHSNCodePart', authMiddleware, async (req, res) => {
  const isservice = req.query.isservice;
  const hsncode  = req.query.hsncode;

  //if (isservice === undefined || typeof isservice !== 'boolean') {
  //  return res.status(400).json({ error: 'Invalid request or missing parameters' });
  //}

  try {
    const query = `
      SELECT hsncode, codedesc, isselectable
      FROM "HSNSAC"
      WHERE hsncode ILIKE $2 AND isservice = $1
    `;

    const { rows } = await pool.query(query, [isservice, `%${hsncode}%`]);

    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


  /**
 * @swagger
 * /api/SaveHSNCode:
 *   post:
 *     summary: Create or update a record in the HSNSAC table based on the hsncode
 *     tags: [HSN Code]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hsncode:
 *                 type: string
 *               codedesc:
 *                 type: string
 *               isselectable:
 *                 type: boolean
 *               isservice:
 *                 type: boolean
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *             required:
 *               - hsncode
 *     responses:
 *       200:
 *         description: HSNSAC record created or updated successfully
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.post('/api/SaveHSNCode', authMiddleware, async (req, res) => {
    const { hsncode, codedesc, isselectable, isservice, userid, isweb } = req.body;
  
    if (!hsncode || typeof hsncode !== 'string') {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      // Check if the hsncode already exists in the HSNSAC table
      const checkQuery = `
        SELECT COUNT(*) AS count FROM "HSNSAC" WHERE hsncode = $1
      `;
 
      const compid = 0;
      const checkResult = await pool.query(checkQuery, [hsncode]);
      const hsncodeExists = checkResult.rows[0].count > 0;
  
      if (hsncodeExists) {
        // Update the existing hsncode
        const updateQuery = `
          UPDATE "HSNSAC"
          SET
            codedesc = $2,
            isselectable = $3,
            isservice = $4
          WHERE hsncode = $1
        `;
  
        await pool.query(updateQuery, [hsncode, codedesc, isselectable, isservice]);
        writeToUserLog(userid, 'Updated HSN Code - '+hsncode, compid, isweb);
      } else {
        // Add a new hsncode
        const insertQuery = `
          INSERT INTO "HSNSAC" (hsncode, codedesc, isselectable, isservice)
          VALUES ($1, $2, $3, $4)
        `;
  
        await pool.query(insertQuery, [hsncode, codedesc, isselectable, isservice]);
        writeToUserLog(userid, 'Created HSN Code - '+hsncode, compid, isweb);
      }
  
      return res.status(200).json({ message: 'HSN/SAC record created or updated successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  module.exports = router;