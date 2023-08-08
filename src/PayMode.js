const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');
const { writeToUserLog } = require('./common');

/**
 * @swagger
 * tags:
 *   name: Payment Mode
 *   description: API endpoints for Payment Mode
 */

/**
 * @swagger
 * /api/GetPaymentMode:
 *   get:
 *     summary: Get list of paymodeid and paymodename from the PayMode table for a given compid
 *     tags: [Payment Mode]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: query
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Returns the list of paymodes
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetPaymentMode', authenticateToken, async (req, res) => {
    const { compid } = req.query;
  
    if (!compid) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = `
        SELECT paymodeid, paymodename
        FROM "PayMode"
        WHERE compid = $1
      `;
  
      const { rows } = await pool.query(query, [compid]);
  
      return res.status(200).json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
/**
 * @swagger
 * /api/GetAPayMode:
 *   get:
 *     summary: Get paymodename from the PayMode table for a given paymodeid
 *     tags: [Payment Mode]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: query
 *         name: paymodeid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Paymode ID
 *     responses:
 *       200:
 *         description: Returns the paymodename
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: Paymode not found
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetAPayMode', authenticateToken, async (req, res) => {
    const { paymodeid } = req.query;
  
    if (!paymodeid) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = `
        SELECT paymodename
        FROM "PayMode"
        WHERE paymodeid = $1
      `;
  
      const { rows } = await pool.query(query, [paymodeid]);
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Paymode not found' });
      }
  
      const paymodename = rows[0].paymodename;
      return res.status(200).json({ paymodename });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
/**
 * @swagger
 * /api/SavePayMode:
 *   post:
 *     summary: Update or add a paymode record in the PayMode table for a particular paymodeid
 *     tags: [Payment Mode]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymodeid:
 *                 type: integer
 *               paymodename:
 *                 type: string
 *               compid:
 *                 type: integer
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *             required:
 *               - paymodeid
 *               - paymodename
 *               - compid
 *               - userid
 *     responses:
 *       200:
 *         description: Paymode record updated or added successfully
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.post('/api/SavePayMode', authenticateToken, async (req, res) => {
    const { paymodeid, paymodename, compid, userid, isweb } = req.body;
  
    if (!paymodename || !compid || !userid) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      // Check if the paymodeid already exists in the PayMode table
      const pExists = await pool.query('SELECT * FROM public."PayMode" WHERE TRIM(paymodename) ILIKE $1 and compid = $2', [paymodename.trim(), compid]);

      if (pExists.rows.length > 0) {
        await pool.query('UPDATE public."PayMode" SET paymodename = $1, userid = $3, updon = NOW() WHERE TRIM(paymodename) ILIKE $2 and compid = $4', [paymodename, paymodename.trim(), userid, compid]);
        res.status(201).json({ message: 'Payment Mode updated successfully' });
        writeToUserLog(userid, 'Updated Payment Mode  - '+paymodename, compid, isweb);
      } else {
        if (paymodeid > 0) {
            const checkQuery = `
                SELECT COUNT(*) AS count FROM "PayMode" WHERE paymodeid = $1
            `;
            const checkResult = await pool.query(checkQuery, [paymodeid]);
            const paymodeExists = checkResult.rows[0].count > 0;
        
            if (paymodeExists) {
                // Update the existing paymode
                const updateQuery = `
                UPDATE "PayMode"
                SET
                    paymodename = $2,
                    userid = $3,
                    updon = NOW() 
                WHERE paymodeid = $1
                `;
        
                await pool.query(updateQuery, [paymodeid, paymodename, userid]);
                writeToUserLog(userid, 'Updated Payment Mode  - '+paymodeid.toString(), compid, isweb);
              } else {
                // Add a new paymode
                const insertQuery = `
                INSERT INTO "PayMode" (paymodename, compid, userid, updon)
                VALUES ($1, $2, $3, NOW()) 
                `;
        
                await pool.query(insertQuery, [paymodename, compid, userid]);
                writeToUserLog(userid, 'Created Payment Mode  - '+paymodename, compid, isweb);
              }
        } else {
        // Add a new paymode
            const insertQuery1 = `
            INSERT INTO "PayMode" (paymodename, compid, userid, updon)
            VALUES ($1, $2, $3, NOW()) 
            `;

            await pool.query(insertQuery1, [paymodename, compid, userid]);
            writeToUserLog(userid, 'Created Payment Mode  - '+paymodename, compid, isweb);
          }
        }

      return res.status(200).json({ message: 'Paymode record updated or added successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
module.exports = router;