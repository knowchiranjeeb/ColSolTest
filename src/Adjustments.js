const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');
const { writeToUserLog } = require('./common');

// Swagger documentation for Adjustment API
/**
 * @swagger
 * tags:
 *   name: Adjustments
 *   description: API endpoints for Adjustments
 */

/**
 * @swagger
 * /api/DeleteAdjustment/{payid}:
 *   delete:
 *     summary: Delete all rows from Adjustment Table where payid matches the given Payment ID
 *     tags: [Adjustments]
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
 *       500:
 *         description: Internal server error
 */
router.delete('/api/DeleteAdjustment/:payid', authenticateToken, async (req, res) => {
    const { payid } = req.params;
  
    try {
      const deleteQuery = `DELETE FROM Adjustment WHERE payid = $1 RETURNING *;`;
      const values = [payid];
      const result = await pool.query(deleteQuery, values);
  
      if (result.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid Payment ID' });
      }
  
      res.json({ message: 'Adjustments deleted successfully' });
    } catch (error) {
      console.error('Error deleting adjustments:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
 
  /**
 * @swagger
 * /api/SaveAdjustment:
 *   post:
 *     summary: Add a new row to the Adjustment Table and update Invoice Table's amtdue
 *     tags: [Adjustments]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               invid:
 *                 type: integer
 *               payid:
 *                 type: integer
 *               adjustamt:
 *                 type: number
 *               compid:
 *                 type: integer
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Successful operation
 *       500:
 *         description: Internal server error
 */
router.post('/api/SaveAdjustment', authenticateToken, async (req, res) => {
    const { invid, payid, adjustamt, compid, userid, isweb } = req.body;
    const updon = new Date();
  
    try {
      // Add a new row to the Adjustment Table
      const insertAdjustmentQuery = `
        INSERT INTO Adjustment (invid, payid, adjustamt, compid, userid, updon)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING invid, payid;
      `;
  
      const values = [invid, payid, adjustamt, compid, userid, updon];
      const adjustmentResult = await pool.query(insertAdjustmentQuery, values);
      const newAdjustment = adjustmentResult.rows[0];
  
      // Update the amtdue column in the Invoice Table
      const updateInvoiceQuery = `
        UPDATE Invoice
        SET amtdue = total - (
          SELECT COALESCE(SUM(adjustamt), 0) FROM Adjustment WHERE invid = $1
        )
        WHERE invid = $1
        RETURNING invid;
      `;
  
      const updateInvoiceValues = [invid];
      const invoiceResult = await pool.query(updateInvoiceQuery, updateInvoiceValues);
      const updatedInvoice = invoiceResult.rows[0];
      writeToUserLog(userid,'Created Adjustment record for Invoice ID - '+toString(invid)+' and Payment ID '+toString(payid),compid,isweb);  
      return res.json({ adjustment: newAdjustment, updatedInvoice });
    } catch (error) {
      console.error('Error adding adjustment and updating invoice:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

/**
 * @swagger
 * /api/UpdateCustUnadjBal/{custid}/update-unadjamt:
 *   put:
 *     summary: Update unadjamt in the Customer Table based on Payments Table
 *     tags: [Adjustments]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: custid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Successful operation
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
router.put('/api/UpdateCustUnadjBal/:custid/update-unadjamt', authenticateToken, async (req, res) => {
    const { custid } = req.params;
  
    try {
      // Calculate the sum of unadjustamt from the Payments Table where custid matches the given Customer ID
      const sumUnadjustamtQuery = `
        SELECT COALESCE(SUM(unadjustamt), 0) AS total_unadjamt FROM Payments WHERE custid = $1;
      `;
  
      const sumUnadjustamtValues = [custid];
      const sumResult = await pool.query(sumUnadjustamtQuery, sumUnadjustamtValues);
      const totalUnadjamt = sumResult.rows[0].total_unadjamt;
  
      if (totalUnadjamt === null) {
        return res.status(404).json({ message: 'Customer not found' });
      }
  
      // Update the unadjamt column in the Customer Table
      const updateCustomerQuery = `
        UPDATE Customer
        SET unadjamt = $1
        WHERE custid = $2
        RETURNING *;
      `;
  
      const updateCustomerValues = [totalUnadjamt, custid];
      const customerResult = await pool.query(updateCustomerQuery, updateCustomerValues);
      const updatedCustomer = customerResult.rows[0];
  
      return res.json(updatedCustomer);
    } catch (error) {
      console.error('Error updating customer unadjamt:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

/**
 * @swagger
 * /api/GetUnadjustedAmt/{custid}/unadjamt:
 *   get:
 *     summary: Get unadjamt from the Customer Table based on Customer ID
 *     tags: [Adjustments]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: custid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Successful operation
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetUnadjustedAmt/:custid/unadjamt', authenticateToken, async (req, res) => {
    const { custid } = req.params;
  
    try {
      // Get the unadjamt from the Customer Table based on the given Customer ID
      const getUnadjamtQuery = `
        SELECT unadjamt FROM Customer WHERE custid = $1;
      `;
  
      const values = [custid];
      const result = await pool.query(getUnadjamtQuery, values);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Customer not found' });
      }
  
      const unadjamt = result.rows[0].unadjamt;
      return res.json({ unadjamt });
    } catch (error) {
      console.error('Error fetching customer unadjamt:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

module.exports = router;

