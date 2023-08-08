const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');
const { writeToUserLog } = require('./common');

// Swagger documentation for Invoice API
/**
 * @swagger
 * tags:
 *   name: Invoice
 *   description: API endpoints for Invoice
 */

/**
 * @swagger
 * /api/GetInvoiceList:
 *   get:
 *     summary: Get the list of invoices from the Invoice Table for an Company
 *     tags: [Invoice]
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
 *         description: Returns the list of invoices with invid, invno, invdate, custname, and total.
 *       500:
 *         description: Internal server error.
 */
router.get('/api/GetInvoiceList', authenticateToken, async (req, res) => {
    const { compid } = req.query;
  
    if (!compid) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = `
        SELECT
          "Invoice".invid,
          "Invoice".invno,
          "Invoice".invdate,
          "Customer".custname,
          "Invoice".total
        FROM "Invoice"
        INNER JOIN "Customer" ON "Invoice".custid = "Customer".custid
        WHERE "Invoice".compid = $1
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
 * /api/SaveInvNo:
 *   post:
 *     summary: Create or update the InvoiceSetting table for compid, ismanual, invprefix, and nextno based on compid
 *     tags: [Invoice]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               compid:
 *                 type: integer
 *                 required: true
 *               ismanual:
 *                 type: boolean
 *                 required: true
 *               invprefix:
 *                 type: string
 *                 required: true
 *               nextno:
 *                 type: integer
 *                 required: true
 *               userid:
 *                 type: integer
 *                 required: true
 *               isweb:
 *                 type: boolean
 *                 required: true
 *     responses:
 *       200:
 *         description: InvoiceSetting record created or updated successfully.
 *       400:
 *         description: Invalid request or missing parameters.
 *       500:
 *         description: Internal server error.
 */
router.post('/api/SaveInvNo', authenticateToken, async (req, res) => {
    const { compid, ismanual, invprefix, nextno, userid, isweb } = req.body;
  
    if (!compid || typeof ismanual !== 'boolean' || !invprefix || typeof nextno !== 'number') {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = `
        INSERT INTO "InvoiceSetting" (compid, ismanual, invprefix, nextno)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (compid)
        DO UPDATE
        SET ismanual = $2, invprefix = $3, nextno = $4
      `;
  
      await pool.query(query, [compid, ismanual, invprefix, nextno]);
      writeToUserLog(userid, 'Updated the Invoice Number setting',compid, isweb)
      return res.status(200).json({ message: 'Invoice Setting record created or updated successfully.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
/**
 * @swagger
 * /api/GetNextInvNo:
 *   get:
 *     summary: Get invprefix and nextno from InvoiceSetting for a given compid
 *     tags: [Invoice]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: query
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID for which to fetch the invprefix and nextno.
 *     responses:
 *       200:
 *         description: Returns the invprefix and nextno for the specified compid.
 *       400:
 *         description: Invalid request or missing parameters.
 *       500:
 *         description: Internal server error.
 */
router.get('/api/GetNextInvNo', authenticateToken, async (req, res) => {
    const { compid } = req.query;
  
    if (!compid) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = `
        SELECT
          CASE WHEN ismanual = true THEN '' ELSE invprefix END AS invprefix,
          CASE WHEN ismanual = true THEN '' ELSE nextno::text END AS nextno
        FROM "InvoiceSetting"
        WHERE compid = $1
      `;
  
      const { rows } = await pool.query(query, [compid]);
  
      return res.status(200).json(rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
/**
 * @swagger
 * /api/GetInvoiceDet/{invid}:
 *   get:
 *     summary: Get a particular invoice from the Invoice Table
 *     tags: [Invoice]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: invid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Invoice ID for which to fetch the details.
 *     responses:
 *       200:
 *         description: Returns the invoice details for the specified invid.
 *       400:
 *         description: Invalid request or missing parameters.
 *       404:
 *         description: Invoice not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/api/GetInvoiceDet/:invid', authenticateToken, async (req, res) => {
    const invid = req.params.invid;
  
    if (!invid || isNaN(invid)) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = `
        SELECT
          invid,
          custid,
          invno,
          invdate,
          shipcountryid,
          shipstateid,
          shipstreet1,
          shipstreet2,
          shipcity,
          shippin,
          ordno,
          termid,
          duedate,
          subject,
          notes,
          tnc,
          stot,
          tdsamount,
          roundoff,
          total
        FROM "Invoice"
        WHERE invid = $1
      `;
  
      const { rows } = await pool.query(query, [invid]);
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
  
      return res.status(200).json(rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
/**
 * @swagger
 * /api/GetInvoiceItem/{invid}:
 *   get:
 *     summary: Get the list of invoice items from the InvoiceItem Table for a given Invoice ID (invid).
 *     tags: [Invoice]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: invid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Invoice ID for which to fetch the invoice items.
 *     responses:
 *       200:
 *         description: Returns the list of invoice items for the specified invid.
 *       400:
 *         description: Invalid request or missing parameters.
 *       404:
 *         description: Invoice not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/api/GetInvoiceItem/:invid', authenticateToken, async (req, res) => {
    const invid = req.params.invid;
  
    if (!invid || isNaN(invid)) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = `
        SELECT
          "InvoiceItem".itemid,
          "Items".itemname,
          "InvoiceItem".quantity,
          "InvoiceItem".rate,
          "InvoiceItem".discount,
          "InvoiceItem".taxtotal,
          "InvoiceItem".total
        FROM "InvoiceItem"
        INNER JOIN "Items" ON "InvoiceItem".itemid = "Items".itemid
        WHERE "InvoiceItem".invid = $1
      `;
  
      const { rows } = await pool.query(query, [invid]);
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
  
      return res.status(200).json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
/**
 * @swagger
 * /api/GetInvoiceTax/{invid}:
 *   get:
 *     summary: Get the tax details for an Invoice ID (invid).
 *     tags: [Invoice]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: invid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Invoice ID for which to fetch the tax details.
 *     responses:
 *       200:
 *         description: Returns the tax details for the specified invid.
 *       400:
 *         description: Invalid request or missing parameters.
 *       404:
 *         description: Invoice not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/api/GetInvoiceTax/:invid', authenticateToken, async (req, res) => {
    const invid = req.params.invid;
  
    if (!invid || isNaN(invid)) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = `
        SELECT
          sr,
          percentage,
          csgt,
          sgst,
          igst
        FROM "InvoiceTax"
        WHERE invid = $1
      `;
  
      const { rows } = await pool.query(query, [invid]);
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
  
      return res.status(200).json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
/**
 * @swagger
 * /api/SaveInvoiceDet:
 *   post:
 *     summary: Create or Update an invoice in the Invoice Table.
 *     tags: [Invoice]
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
 *               custid:
 *                 type: integer
 *               invno:
 *                 type: string
 *               invdate:
 *                 type: string
 *                 format: date
 *               shipcountryid:
 *                 type: integer
 *               shipstateid:
 *                 type: integer
 *               shipstreet1:
 *                 type: string
 *               shipstreet2:
 *                 type: string
 *               shipcity:
 *                 type: string
 *               shippin:
 *                 type: string
 *               ordno:
 *                 type: string
 *               paytermid:
 *                 type: integer
 *               duedate:
 *                 type: string
 *                 format: date
 *               subject:
 *                 type: string
 *               notes:
 *                 type: string
 *               tnc:
 *                 type: string
 *               stot:
 *                 type: number
 *               tdsamount:
 *                 type: number
 *               roundoff:
 *                 type: number
 *               total:
 *                 type: number
 *               cgst:
 *                 type: number
 *               sgst:
 *                 type: number
 *               igst:
 *                 type: number
 *               currencycode:
 *                 type: string
 *               userid:
 *                 type: integer
 *               compid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *             required:
 *               - invno
 *               - invdate
 *               - total
 *     responses:
 *       200:
 *         description: Returns the invid if the operation is successful, otherwise 0 if failed.
 *       400:
 *         description: Invalid request or missing parameters.
 *       500:
 *         description: Internal server error.
 */
router.post('/api/SaveInvoiceDet', authenticateToken, async (req, res) => {
  const {
    invid,
    custid,
    invno,
    invdate,
    shipcountryid,
    shipstateid,
    shipstreet1,
    shipstreet2,
    shipcity,
    shippin,
    ordno,
    paytermid,
    duedate,
    subject,
    notes,
    tnc,
    stot,
    tdsamount,
    roundoff,
    total, 
    cgst, 
    sgst, 
    igst, 
    currencycode,
    userid, 
    compid, 
    isweb, 
  } = req.body;

  if (!invno || !invdate ) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  const invid1 = invid ? invid : 0;

  try {
    let query;
    const updon = new Date();
    let queryParams = [
      invno,
      invdate,
      shipcountryid,
      shipstateid,
      shipstreet1,
      shipstreet2,
      shipcity,
      shippin,
      ordno,
      paytermid,
      duedate,
      subject,
      notes,
      tnc,
      stot,
      tdsamount,
      roundoff,
      total,
      cgst,
      sgst,
      igst,
      currencycode,
      userid,
      compid,
      custid,
      updon
    ];

    let updFlag = false;
    if (invid1 > 0) {
      query = `
        UPDATE "Invoice"
        SET
          invno = $1,
          invdate = $2,
          shipcountryid = $3,
          shipstate = $4,
          shipstreet1 = $5,
          shipstreet2 = $6,
          shipcity = $7,
          shippin = $8,
          ordno = $9,
          termid = $10,
          duedate = $11,
          subject = $12,
          notes = $13,
          tnc = $14,
          stot = $15,
          tdsamount = $16,
          roundoff = $17,
          total = $18,
          cgst = $19,
          sgst = $20,
          igst = $21,
          currencycode = $22,
          userid = $23,
          compid = $24,
          custid = $25,
          updon = $26
        WHERE invid = $27
        RETURNING invid;
      `;
      queryParams.push(invid1);
      updFlag=true;
    } else {
      query = `
        INSERT INTO "Invoice"
        (invno, invdate, shipcountryid, shipstate, shipstreet1, shipstreet2, shipcity, shippin, ordno, termid, duedate, subject, notes, tnc, stot, tdsamount, roundoff, total, cgst, sgst, igst, amtdue, currencycode, userid, compid, custid, updon)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $18, $22, $23, $24, $25, $26)
        RETURNING invid;
      `;
    }

    const { rows } = await pool.query(query, queryParams);

    if (rows.length === 0) {
      return res.status(500).json({ error: 'Failed to create or update the invoice' });
    }
    else {
      if (updFlag) {
        writeToUserLog(userid, 'Updated the Invoice ' + invno ,compid, isweb)
        query = 'Delete from "InvoiceItem" where invoiceid=$1';
        queryParams = [invid];
        await pool.query(query, queryParams);
        query = 'Delete from "InvoiceTax" where invid=$1';
        queryParams = [invid];
        await pool.query(query, queryParams);
      }
      else {
        writeToUserLog(userid, 'Created the Invoice ' + invno ,compid, isweb)
      }
    }

    return res.status(200).json({ invid: rows[0].invid });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/SaveInvoiceItem:
 *   post:
 *     summary: Create a row in InvoiceItem Table with calculated tax details.
 *     tags: [Invoice]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               invoiceid:
 *                 type: integer
 *               itemid:
 *                 type: integer
 *               quantity:
 *                 type: number
 *               rate:
 *                 type: number
 *               discount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Successfully created a row in the InvoiceItem Table.
 *       400:
 *         description: Invalid request or missing parameters.
 *       500:
 *         description: Internal server error.
 */
router.post('/api/SaveInvoiceItem', authenticateToken, async (req, res) => {
  const { invoiceid, itemid, quantity, rate, discount } = req.body;

  if (!invoiceid || !itemid || !quantity || !rate ) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    // Fetch compid and custid from the Invoice Table for the given invoiceid
    const queryInvoiceData = `
      SELECT compid, custid
      FROM "Invoice"
      WHERE invid = $1
    `;
    const { rows: invoiceDataRows } = await pool.query(queryInvoiceData, [invoiceid]);

    if (invoiceDataRows.length === 0) {
      return res.status(400).json({ error: 'No invoice found for the given invoiceid' });
    }

    const compid = invoiceDataRows[0].compid;
    const custid = invoiceDataRows[0].custid;

    // Get taxrate from the Items table for the given itemid
    const queryTaxRate = `
      SELECT taxrate
      FROM "Items"
      WHERE itemid = $1
    `;
    const { rows: taxRateRows } = await pool.query(queryTaxRate, [itemid]);
    const taxrate = taxRateRows.length ? taxRateRows[0].taxrate : 0;

    // Check the stateid from the Company table for the given compid
    const queryCompanyState = `
      SELECT stateid
      FROM "Company"
      WHERE compid = $1
    `;
    const { rows: companyStateRows } = await pool.query(queryCompanyState, [compid]);
    const stateid = companyStateRows.length ? companyStateRows[0].stateid : 0;

    // Check the billstateid from the Customer table for the given custid and invoiceid
    const queryCustomerState = `
      SELECT placeofsupply
      FROM "Customer"
      WHERE custid = $1 AND custid IN (
        SELECT custid
        FROM "Invoice"
        WHERE invid = $2
      )
    `;
    const { rows: customerStateRows } = await pool.query(queryCustomerState, [custid, invoiceid]);
    const placeofsupply = customerStateRows.length ? customerStateRows[0].placeofsupply : 0;

    // Calculate cgstper, sgstper, igstper based on the stateid and taxrate
    let cgstper, sgstper, igstper;
    if (stateid === placeofsupply) {
      cgstper = 0;
      sgstper = 0;
      igstper = taxrate;
    } else {
      cgstper = taxrate / 2;
      sgstper = taxrate / 2;
      igstper = 0;
    }

    // Calculate taxtotal and total
    const amount = quantity * rate;
    const taxtotal = ((amount - discount) * (cgstper / 100)) + (((quantity * rate) - discount) * (sgstper / 100)) + (((quantity * rate) - discount) * (igstper / 100));
    const total = amount - discount + taxtotal;

    // Insert row in InvoiceItem Table
    const queryInsertItem = `
      INSERT INTO "InvoiceItem" (invoiceid, itemid, quantity, rate, amount, discount, cgstper, sgstper, igstper, taxtotal, total)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;
    await pool.query(queryInsertItem, [invoiceid, itemid, quantity, rate, amount, discount, cgstper, sgstper, igstper, taxtotal, total]);

    return res.status(200).json({ message: 'Successfully created a row in the InvoiceItem Table' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/GetInvoiceItemTaxDetails:
 *   post:
 *     summary: Get the InvoiceItem calculated tax details.
 *     tags: [Invoice]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               compid:
 *                 type: integer
 *               custid:
 *                 type: integer
 *               itemid:
 *                 type: integer
 *               quantity:
 *                 type: number
 *               discount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Returns Amount, CGST, SGST, IGST Tax and Total.
 *       400:
 *         description: Invalid request or missing parameters.
 *       500:
 *         description: Internal server error.
 */
router.post('/api/GetInvoiceItemTaxDetails', authenticateToken, async (req, res) => {
  const { compid, custid, itemid, quantity, discount } = req.body;

  if (!compid || !custid || !itemid  ) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    // Get rate and taxrate from the Items table for the given itemid
    const query = `
      SELECT sellprice, taxrate
      FROM "Items"
      WHERE itemid = $1
    `;
    const { rows: itemRows } = await pool.query(query, [itemid]);
    const rate = itemRows.length ? itemRows[0].sellprice : 0;
    const taxrate = itemRows.length ? itemRows[0].taxrate : 0;

    // Check the stateid from the Company table for the given compid
    const queryCompanyState = `
      SELECT stateid
      FROM "Company"
      WHERE compid = $1
    `;
    const { rows: companyStateRows } = await pool.query(queryCompanyState, [compid]);
    const stateid = companyStateRows.length ? companyStateRows[0].stateid : 0;

    // Check the placeofsupply from the Customer table for the given custid and invoiceid
    const queryCustomerState = `
      SELECT placeofsupply
      FROM "Customer"
      WHERE custid = $1 
    `;
    const { rows: customerStateRows } = await pool.query(queryCustomerState, [custid]);
    const placeofsupply = customerStateRows.length ? customerStateRows[0].placeofsupply : 0;

    // Calculate cgstper, sgstper, igstper based on the stateid and taxrate
    let cgstper, sgstper, igstper;
    if (stateid === placeofsupply) {
      cgstper = 0;
      sgstper = 0;
      igstper = taxrate;
    } else {
      cgstper = taxrate / 2;
      sgstper = taxrate / 2;
      igstper = 0;
    }

    // Calculate taxtotal and total
    const amount = (quantity * rate);
    const cgst = (amount - discount) * (cgstper / 100);
    const sgst = (amount - discount) * (sgstper / 100);
    const igst = (amount - discount) * (igstper / 100);
    const taxtotal = cgst + sgst + igst;
    const total = amount - discount + taxtotal;

    return res.status(200).json({Rate: rate, Amount: amount, CGST: cgst , SGST: sgst, IGST: igst, TaxTotal: taxtotal, Total: total});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});



/**
 * @swagger
 * /api/SaveInvoiceTax/{invoiceid}:
 *   get:
 *     summary: Calculate Invoice Tax and create rows in InvoiceTax Table.
 *     tags: [Invoice]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceid
 *         required: true
 *         description: ID of the invoice for which to calculate tax.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully calculated tax and created rows in the InvoiceTax Table.
 *       400:
 *         description: Invalid request or missing parameters.
 *       500:
 *         description: Internal server error.
 */
router.get('/api/SaveInvoiceTax/:invoiceid', authenticateToken, async (req, res) => {
  const invoiceid = req.params.invoiceid;

  if (!invoiceid || isNaN(invoiceid)) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    // Fetch Invoice items with specified invoiceid from InvoiceItem Table
    const queryItems = `
    Select a.percentage,
    case when a.taxtype='CGST' then (a.percentage/100 * avg(a.total)) else 0 end cgst,
    case when a.taxtype='SGST' then (a.percentage/100 * avg(a.total)) else 0 end sgst,
    case when a.taxtype='IGST' then (a.percentage/100 * avg(a.total)) else 0 end igst
    from 
    (SELECT cgstper percentage, 'CGST' taxtype, amount-discount total
          FROM "InvoiceItem"
          WHERE invoiceid =$1 and cgstper>0
    union
    SELECT sgstper percentage, 'SGST' taxtype, amount-discount total
          FROM "InvoiceItem"
          WHERE invoiceid =$1 and sgstper>0
    union
    SELECT igstper percentage, 'IGST' taxtype, amount-discount total
          FROM "InvoiceItem"
          WHERE invoiceid =$1 and igstper>0) a
    group by a.percentage,a.taxtype;
          
    `;
    const { rows: invoiceItems } = await pool.query(queryItems, [invoiceid]);

    const groupedTaxData = {};
    invoiceItems.forEach((item) => {
      const { percentage, cgst, sgst, igst } = item;

      groupedTaxData[percentage] = { percentage, cgst, sgst, igst };
    });

    const taxRows = Object.values(groupedTaxData).map(({ percentage, cgst, sgst, igst }) => [
      percentage,
      cgst,
      sgst,
      igst,
    ]);

    if (taxRows.length === 0) {      
      return res.status(400).json({ error: 'No invoice items found for the given invoice id' });
    }

    // Create rows in InvoiceTax Table with running serial number for each invid
    const queryGetNextSerial = `
      SELECT COALESCE(MAX(sr), 0) + 1 AS next_serial
      FROM "InvoiceTax"
      WHERE invid = $1
    `;
    const { rows: nextSerialRows } = await pool.query(queryGetNextSerial, [invoiceid]);
    const nextSerial = nextSerialRows[0].next_serial;

    const queryInsertTax = `
      INSERT INTO "InvoiceTax" (invid, sr, percentage, cgst, sgst, igst)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const serialIds = [];
    for (const [index, row] of taxRows.entries()) {
      const serial = nextSerial + index;
      await pool.query(queryInsertTax, [invoiceid, serial, ...row]);
      serialIds.push(serial);
    }

    return res.status(200).json({ message: 'Successfully Saved Invoice Tax', serialIds });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/GetCompanyDet/{compid}:
 *   get:
 *     summary: Get company details by Company ID
 *     tags: [Invoice]
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
 *         description: Company not found
 */
router.get('/api/GetCompanyDet/:compid',authenticateToken, async (req, res) => {
  const { compid } = req.params;

  try {
    const query = `SELECT logofile, compname, street1, street2, city, stateid, countryid, pincode, phone, email FROM Company WHERE compid = $1`;
    const values = [compid];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const companyDetails = result.rows[0];
    return res.json(companyDetails);
  } catch (error) {
    console.error('Error fetching company details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/GetInvoiceDetForPrint/{invid}:
 *   get:
 *     summary: Get invoice details by Invoice ID
 *     tags: [Invoice]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: invid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Successful operation
 *       400:
 *         description: Invalid Invoice ID
 *       404:
 *         description: Invoice not found
 */
router.get('/api/GetInvoiceDetForPrint/:invid',authenticateToken, async (req, res) => {
  const { invid } = req.params;

  try {
    const query = `
      SELECT
        C.custname, C.billstreet1, C.billstreet2, C.billcity, 
        S1.statename AS billstate, Co1.countryname AS billcountry, C.billPin,
        I.shipstreet1, I.shipstreet2, I.shipcity,
        CASE WHEN C.billcountryid = I.shipcountryid THEN '' ELSE S2.statename END AS shipstate,
        CASE WHEN C.billcountryid = I.shipcountryid THEN '' ELSE Co2.countryname END AS shipcountry,
        CASE WHEN C.billcountryid = I.shipcountryid THEN '' ELSE I.ShipPin END AS ShipPin,
        I.invno, I.invdate, PT.payterm, I.duedate, I.notes, I.tnc,
        I.stot, I.tdsamount, I.roundoff, I.total, I.amtdue
      FROM
        Invoice I
        JOIN Customer C ON I.custid = C.custid
        JOIN States S1 ON C.billstateid = S1.stateid
        JOIN Country Co1 ON C.billcountryid = Co1.countryid
        LEFT JOIN States S2 ON I.shipstateid = S2.stateid
        LEFT JOIN Country Co2 ON I.shipcountryid = Co2.countryid
        JOIN PayTerms PT ON I.termid = PT.paytermid
      WHERE
        I.invid = $1
    `;

    const values = [invid];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const invoiceDetails = result.rows[0];
    return res.json(invoiceDetails);
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
/**
 * @swagger
 * /api/GetInvoiceHSN/{invoiceid}/hsn-details:
 *   get:
 *     summary: Get HSN wise invoice details by Invoice ID
 *     tags: [Invoice]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Successful operation
 *       400:
 *         description: Invalid Invoice ID
 *       404:
 *         description: Invoice not found
 */
router.get('/api/GetInvoiceHSN/:invoiceid/hsn-details', authenticateToken, async (req, res) => {
  const { invoiceid } = req.params;

  try {
    const query = `
      SELECT
        I.hsncode,
        SUM(II.total) AS totalSum,
        AVG(II.csgstper) AS avgCgstper,
        AVG(II.csgstper) * SUM(II.total) * 0.001 AS cgstAmount,
        AVG(II.ssgstper) AS avgSgstper,
        AVG(II.ssgstper) * SUM(II.total) * 0.001 AS sgstAmount,
        AVG(II.isgstper) AS avgIgstper,
        AVG(II.isgstper) * SUM(II.total) * 0.001 AS igstAmount,
        SUM(II.taxtotal) AS taxTotalSum
      FROM
        "InvoiceItem" II
        JOIN "Item" I ON II.itemid = I.itemid
      WHERE
        II.invoiceid = $1
      GROUP BY
        I.hsncode;
    `;

    const values = [invoiceid];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const hsnDetails = result.rows;
    return res.json(hsnDetails);
  } catch (error) {
    console.error('Error fetching HSN wise invoice details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/GetUnpaidInvoices/{payid}/{type}:
 *   get:
 *     summary: Get list of unpaid invoices by Customer ID, Unpaid Invoice Type, and Payment ID
 *     tags: [Invoice]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: payid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Payment ID
 *       - in: path
 *         name: type
 *         schema:
 *           type: string
 *           enum: [A, W, M, Y]
 *         required: true
 *         description: Unpaid Invoice Type
 *     responses:
 *       200:
 *         description: Successful operation
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: No unpaid invoices found for the given criteria
 */
router.get('/api/GetUnpaidInvoices/:payid/:type', authenticateToken, async (req, res) => {
  const { payid, type } = req.params;

  try {
    let query = '';

    const custQuery = `
      SELECT custid FROM Payments WHERE payid = $1;
    `;
    const custResult = await pool.query(custQuery, [payid]);
    const custid = custResult.rows[0];
    let values = [custid, payid];

    if (type === 'A') {
      query = `
        SELECT
          I.invid, I.invno, I.invdate, I.total, I.amtdue, A.adjustamt
        FROM Invoice I
        LEFT JOIN Adjustment A ON I.invid = A.invid AND A.payid = $2
        WHERE I.custid = $1 AND (I.amtdue > 0 OR A.adjustamt > 0);
      `;
    } else if (type === 'W') {
      query = `
        SELECT
          I.invid, I.invno, I.invdate, I.total, I.amtdue, A.adjustamt
        FROM Invoice I
        LEFT JOIN Adjustment A ON I.invid = A.invid AND A.payid = $2
        WHERE I.custid = $1 AND (I.amtdue > 0 AND (CURRENT_DATE - I.invdate) < 8 OR A.adjustamt > 0);
      `;
    } else if (type === 'M') {
      query = `
        SELECT
          I.invid, I.invno, I.invdate, I.total, I.amtdue, A.adjustamt
        FROM Invoice I
        LEFT JOIN Adjustment A ON I.invid = A.invid AND A.payid = $2
        WHERE I.custid = $1 AND (I.amtdue > 0 AND (CURRENT_DATE - I.invdate) < 31 OR A.adjustamt > 0);
      `;
    } else if (type === 'Y') {
      query = `
        SELECT
          I.invid, I.invno, I.invdate, I.total, I.amtdue, A.adjustamt
        FROM Invoice I
        LEFT JOIN Adjustment A ON I.invid = A.invid AND A.payid = $2
        WHERE I.custid = $1 AND (I.amtdue > 0 AND (CURRENT_DATE - I.invdate) < 366 OR A.adjustamt > 0);
      `;
    } else {
      return res.status(400).json({ message: 'Invalid parameters' });
    }

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No unpaid invoices found for the given criteria' });
    }

    const unpaidInvoices = result.rows;
    return res.json(unpaidInvoices);
  } catch (error) {
    console.error('Error fetching unpaid invoice details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;