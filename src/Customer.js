const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');
const { writeToUserLog } = require('./common');

/**
 * @swagger
 * tags:
 *   name: Customer
 *   description: API endpoints for Company
 */

/**
 * @swagger
 * /api/GetCustomerList/{compid}:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get list of customers based on compid
 *     tags: [Customer]
 *     parameters:
 *       - in: path
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID (Set to 0 for all companies)
 *     responses:
 *       200:
 *         description: Returns the list of customers
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetCustomerList/:compid', authenticateToken, async (req, res) => {
    const { compid } = req.params;
  
    if (compid === undefined) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      let query = `
        SELECT custid, custname, gstno, phone, email
        FROM "Customer"
      `;
  
      if (compid !== '0') {
        query += ` WHERE compid = ${compid}`;
      }
  
      const { rows } = await pool.query(query);
  
      return res.status(200).json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

/**
 * @swagger
 * /api/GetCustomerDet/{custid}:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get customer details from the Customer table based on custid
 *     tags: [Customer]
 *     parameters:
 *       - in: path
 *         name: custid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Returns the customer details
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetCustomerDet/:custid', authenticateToken, async (req, res) => {
    const { custid } = req.params;
  
    if (!custid) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = `
        SELECT
          custid, custname, gsttreatmentid, currencycode, gstno, paytermid, placeofsupply,
          panno, phone, email, billcountryid, billstateid, billstreet1, billstreet2, billcity,
          billpin, shipcountryid, shipstateid, shipstreet1, shipstreet2, shipcity, shippin, isactive
        FROM "Customer"
        WHERE custid = $1
      `;
  
      const { rows } = await pool.query(query, [custid]);
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
  
      const customerDetails = rows[0];
      return res.status(200).json(customerDetails);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
 * @swagger
 * /api/SaveCustomer:
 *   post:
 *     security:
 *       - BasicAuth: []
 *     summary: Add or update records in the Customer table
 *     tags: [Customer]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               custid:
 *                 type: integer
 *               custname:
 *                 type: string
 *                 maxLength: 200
 *               gsttreatmentid:
 *                 type: integer
 *               currencycode:
 *                 type: string
 *                 maxLength: 3
 *               gstno:
 *                 type: string
 *                 maxLength: 30
 *               paytermid:
 *                 type: integer
 *               placeofsupply:
 *                 type: integer
 *               panno:
 *                 type: string
 *                 maxLength: 10
 *               phone:
 *                 type: string
 *                 maxLength: 20
 *               email:
 *                 type: string
 *                 maxLength: 100
 *               billcountryid:
 *                 type: integer
 *               billstateid:
 *                 type: integer
 *               billstreet1:
 *                 type: string
 *                 maxLength: 250
 *               billstreet2:
 *                 type: string
 *                 maxLength: 250
 *               billcity:
 *                 type: string
 *                 maxLength: 100
 *               billpin:
 *                 type: string
 *                 maxLength: 10
 *               shipcountryid:
 *                 type: integer
 *               shipstateid:
 *                 type: integer
 *               shipstreet1:
 *                 type: string
 *                 maxLength: 250
 *               shipstreet2:
 *                 type: string
 *                 maxLength: 250
 *               shipcity:
 *                 type: string
 *                 maxLength: 100
 *               shippin:
 *                 type: string
 *                 maxLength: 10
 *               isactive:
 *                 type: boolean
 *               compid:
 *                 type: integer
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *             required:
 *               - custid
 *               - custname
 *     responses:
 *       200:
 *         description: Record added or updated successfully
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.post('/api/SaveCustomer', authenticateToken, async (req, res) => {
    const {
      custid,
      custname,
      gsttreatmentid,
      currencycode,
      gstno,
      paytermid,
      placeofsupply,
      panno,
      phone,
      email,
      billcountryid,
      billstateid,
      billstreet1,
      billstreet2,
      billcity,
      billpin,
      shipcountryid,
      shipstateid,
      shipstreet1,
      shipstreet2,
      shipcity,
      shippin,
      isactive,
      compid,
      userid,
      isweb,
    } = req.body;
  
    if (!custname) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
    let custid1 = custid ? custid : 0;
    const updon = new Date();
    try {
      if (custid1 > 0) {
        const updateQuery = `
         UPDATE "Customer" SET
          custname = $2,
          gsttreatmentid = $3,
          currencycode = $4,
          gstno = $5,
          paytermid = $6,
          placeofsupply = $7,
          panno = $8,
          phone = $9,
          email = $10,
          billcountryid = $11,
          billstateid = $12,
          billstreet1 = $13,
          billstreet2 = $14,
          billcity = $15,
          billpin = $16,
          shipcountryid = $17,
          shipstateid = $18,
          shipstreet1 = $19,
          shipstreet2 = $20,
          shipcity = $21,
          shippin = $22,
          isactive = $23,
          compid = $24,
          userid = $25,
          updon = $26
          where custid = $1
          `;
        await pool.query(updateQuery, [
        custid1,
        custname,
        gsttreatmentid,
        currencycode,
        gstno,
        paytermid,
        placeofsupply,
        panno,
        phone,
        email,
        billcountryid,
        billstateid,
        billstreet1,
        billstreet2,
        billcity,
        billpin,
        shipcountryid,
        shipstateid,
        shipstreet1,
        shipstreet2,
        shipcity,
        shippin,
        isactive,
        compid,
        userid,
        updon
      ]);
      writeToUserLog(userid, 'Updated Customer - '+custname + '[' + toString(custid1) + ']', compid, isweb);
      return res.status(200).json({ message: 'Customer updated successfully' });
    }
    else {
      const insertQuery = `
        INSERT INTO "Customer" (
          custname, gsttreatmentid, currencycode, gstno, paytermid, placeofsupply,
          panno, phone, email, billcountryid, billstateid, billstreet1, billstreet2,
          billcity, billpin, shipcountryid, shipstateid, shipstreet1, shipstreet2,
          shipcity, shippin, isactive, compid, userid, updon
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        )
      `;
      await pool.query(insertQuery, [
        custname,
        gsttreatmentid,
        currencycode,
        gstno,
        paytermid,
        placeofsupply,
        panno,
        phone,
        email,
        billcountryid,
        billstateid,
        billstreet1,
        billstreet2,
        billcity,
        billpin,
        shipcountryid,
        shipstateid,
        shipstreet1,
        shipstreet2,
        shipcity,
        shippin,
        isactive,
        compid,
        userid,
        updon
      ]);
      writeToUserLog(userid, 'Created Customer - '+custname , compid, isweb);
      return res.status(200).json({ message: 'Customer added successfully' });

    }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
/**
 * @swagger
 * /api/GetCustPopup:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get list of active customers from the Customer table for a given compid
 *     tags: [Customer]
 *     parameters:
 *       - in: query
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Returns the list of active customers
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetCustPopup', authenticateToken, async (req, res) => {
    const { compid } = req.query;
  
    if (!compid) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = `
        SELECT custid, custname
        FROM "Customer"
        WHERE isactive = true AND compid = $1
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
 * /api/GetCustShipDet:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get customer shipping details from the Customer table based on custid
 *     tags: [Customer]
 *     parameters:
 *       - in: query
 *         name: custid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Returns the customer shipping details
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetCustShipDet', authenticateToken, async (req, res) => {
    const { custid } = req.query;
  
    if (!custid) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = `
        SELECT custid, shipcountryid, shipstateid, shipstreet1, shipstreet2, shipcity, shippin
        FROM "Customer"
        WHERE custid = $1
      `;
  
      const { rows } = await pool.query(query, [custid]);
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
  
      const customerShippingDetails = rows[0];
      return res.status(200).json(customerShippingDetails);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  module.exports = router;  
