const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');
const { writeToUserLog } = require('./common');

// Swagger documentation for Payments API
/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: API endpoints for Payments
 */

/**
 * @swagger
 * /api/GetPayments/{compid}:
 *   get:
 *     summary: Get payment details by Company ID
 *     tags: [Payments]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Successful operation
 *       400:
 *         description: Invalid Company ID
 *       404:
 *         description: No payments found for the given Company ID
 */
router.get('/api/GetPayments/:compid', authenticateToken, async (req, res) => {
    const { compid } = req.params;
  
    try {
      const query = `
        SELECT P.payid, P.paydate, C.custname, P.payamt
        FROM Payments P
        JOIN Customer C ON P.custid = C.custid
        WHERE C.compid = $1
        ORDER BY P.paydate DESC;
      `;
  
      const values = [compid];
      const result = await pool.query(query, values);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'No payments found for the given Company ID' });
      }
  
      const paymentDetails = result.rows;
      return res.json(paymentDetails);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /**
 * @swagger
 * /api/GetAPayment/{payid}:
 *   get:
 *     summary: Get payment details by Payment ID
 *     tags: [Payments]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: payid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Successful operation
 *       400:
 *         description: Invalid Payment ID
 *       404:
 *         description: Payment not found
 */
router.get('/api/GetAPayment/:payid', authenticateToken, async (req, res) => {
    const { payid } = req.params;
  
    try {
      const query = `
        SELECT
          P.payid, P.custid, Cu.symbol, P.payamt, P.paymodeid,
          C.unadjamt, P.payrefid, P.tdsdeducted, P.remarks
        FROM Payments P
        JOIN Customer C ON P.custid = C.custid
        JOIN Currency Cu ON C.currencycode = Cu.currencycode
        WHERE P.payid = $1;
      `;
  
      const values = [payid];
      const result = await pool.query(query, values);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Payment not found' });
      }
  
      const paymentDetails = result.rows[0];
      return res.json(paymentDetails);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /**
 * @swagger
 * /api/SavePayment/{payid}:
 *   put:
 *     summary: Create or update payment details by Payment ID
 *     tags: [Payments]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: payid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               custid:
 *                 type: integer
 *               currencycode:
 *                 type: string
 *               payamount:
 *                 type: number
 *               paymodeid:
 *                 type: integer
 *               unadjustamt:
 *                 type: number
 *               payrefid:
 *                 type: string
 *               tdsdeducted:
 *                 type: boolean
 *               remarks:
 *                 type: string
 *               compid:
 *                 type: integer
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Successful operation
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Internal server error
 */
router.put('/api/SavePayment/:payid',authenticateToken, async (req, res) => {
    const { payid } = req.params;
    const {
      custid,
      currencycode,
      payamount,
      paymodeid,
      unadjustamt,
      payrefid,
      tdsdeducted,
      remarks,
      compid,
      userid,
      isweb,
    } = req.body;
  
    try {
      const existingPaymentQuery = `SELECT * FROM Payments WHERE payid = $1`;
      const existingPaymentResult = await pool.query(existingPaymentQuery, [payid]);
      const updon = new Date();
      if (existingPaymentResult.rows.length === 0) {
        // If no existing payment record found, create a new one
        const createPaymentQuery = `
          INSERT INTO Payments (custid, currencycode, payamount, paymodeid, unadjustamt, payrefid, tdsdeducted, remarks, userid, updon)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING payid;
        `;
  
        const values = [
          custid,
          currencycode,
          payamount,
          paymodeid,
          unadjustamt,
          payrefid,
          tdsdeducted,
          remarks,
          userid,
          updon
        ];
  
        const result = await pool.query(createPaymentQuery, values);

        const rpayid = result.rows[0];
        writeToUserLog(userid,'Created Payment record for ID - '+rpayid.toString(),compid,isweb);
  
        return res.json(rpayid);
      } else {
        // If an existing payment record found, update it
        const updatePaymentQuery = `
          UPDATE Payments
          SET custid = $2, currencycode = $3, payamount = $4, paymodeid = $5,
          unadjustamt = $6, payrefid = $7, tdsdeducted = $8, remarks = $9, userid = $10, updon = $11
          WHERE payid = $1
          RETURNING payid;
        `;
  
        const values = [
          payid,
          custid,
          currencycode,
          payamount,
          paymodeid,
          unadjustamt,
          payrefid,
          tdsdeducted,
          remarks,
          userid,
          updon
        ];
  
        const result = await pool.query(updatePaymentQuery, values);
        writeToUserLog(userid,'Updated Payment '+payid.toString(),compid,isweb);
        return res.json(result.rows[0]);
      }
    } catch (error) {
      console.error('Error creating/updating payment details:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  
module.exports = router;