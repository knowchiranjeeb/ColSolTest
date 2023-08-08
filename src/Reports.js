const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../authMiddleware');

// Swagger documentation for Report API
/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: API endpoints for Reports
 */

/**
 * @swagger
 * /api/GetUserListRep:
 *   get:
 *     summary: Get report data from the Users table for a particular compid
 *     tags: [Reports]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: query
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID for which to fetch the report data.
 *     responses:
 *       200:
 *         description: Returns the report data for the specified compid.
 *       400:
 *         description: Invalid request or missing parameters.
 *       500:
 *         description: Internal server error.
 */
router.get('/api/GetUserListRep', authMiddleware, async (req, res) => {
    const { compid } = req.query;
  
    if (!compid) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = `
        SELECT
        u.userid,
        u.fullname,
        CASE WHEN u.usertype = 'A' THEN 'Admin' ELSE 'Normal User' END AS usertype,
        TO_CHAR(u.updon,'dd-Mon-yyyy') updon,
        TO_CHAR(COALESCE(max(ul.logdate),u.updon),'dd-Mon-yyyy') lasttranon,
        case when COALESCE(ur.isactive,true)=true then 'Active' else 'Inactive' end status
            FROM "Users" u
            left outer join "Userlog" ul on u.userid=ul.userid
            left outer join  "UserRole" ur on u.userid=ur.userid
            WHERE u.compid = $1
            group by u.userid,u.fullname,u.usertype, u.updon, ur.isactive
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
 * /api/GetUserLog:
 *   get:
 *     summary: Get report data from UserLog and Users tables for a particular compid and logdate between a particular period
 *     tags: [Reports]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: query
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID for which to fetch the report data.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *         required: true
 *         description: Start date of the logdate period (YYYY-MM-DD format).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *         required: true
 *         description: End date of the logdate period (YYYY-MM-DD format).
 *     responses:
 *       200:
 *         description: Returns the report data for the specified compid and logdate period.
 *       400:
 *         description: Invalid request or missing parameters.
 *       500:
 *         description: Internal server error.
 */
router.get('/api/GetUserLog', authMiddleware, async (req, res) => {
    const { compid, startDate, endDate } = req.query;
  
    if (!compid || !startDate || !endDate) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = `
        SELECT
          "Users".userid,
          "Users".fullname,
          CASE WHEN "Users".usertype = 'A' THEN 'Admin' ELSE 'Normal User' END AS usertype,
          "Users".compid,
          "Userlog".logaction,
          "Userlog".logdate,
          "Userlog".logtime,
          CASE WHEN "Userlog".isWeb = true THEN 'Web' ELSE 'Mobile' END AS workedon
        FROM "Users"
        JOIN "Userlog" ON "Users".userid = "Userlog".userid
        WHERE "Users".compid = $1 AND "Userlog".logdate BETWEEN $2 AND $3
      `;
  
      const { rows } = await pool.query(query, [compid, startDate, endDate]);
  
      return res.status(200).json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

/**
 * @swagger
 * /api/GetCustomerList:
 *   get:
 *     summary: Get report data from Customer, States, and Invoice tables for a given compid, partial billcity, and billstateid
 *     tags: [Reports]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: query
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID for which to fetch the report data.
 *       - in: query
 *         name: billcity
 *         schema:
 *           type: string
 *         description: Partial billcity to search for.
 *       - in: query
 *         name: billstateid
 *         schema:
 *           type: integer
 *         description: Bill state ID to search for.
 *     responses:
 *       200:
 *         description: Returns the report data for the specified parameters.
 *       400:
 *         description: Invalid request or missing parameters.
 *       500:
 *         description: Internal server error.
 */
router.get('/api/GetCustomerList', authMiddleware, async (req, res) => {
    const { compid, billcity, billstateid } = req.query;
  
    if (!compid) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      // Check if any parameter is 0 or blank
      if (billcity === 0 || billcity === '') delete req.query.billcity;
      if (billstateid === 0 || billstateid === '') delete req.query.billstateid;
  
      const query = `
        SELECT
          "Customer".custname,
          "Company".compname,
          "Customer".billcity,
          "States".statename,
          "Customer".phone,
          "Customer".email,
          "Customer".gstno,
          "Customer".panno,
          MAX("Invoice".invdate) AS lastTranDate
        FROM "Customer"
        JOIN "Company" ON "Customer".compid = "Company".compid
        LEFT JOIN "States" ON "Customer".billstateid = "States".stateid
        LEFT JOIN "Invoice" ON "Customer".custid = "Invoice".custid
        WHERE "Customer".compid = $1
        ${billcity ? 'AND "Customer".billcity ILIKE $2' : ''}
        ${billstateid ? 'AND "Customer".billstateid = $3' : ''}
        GROUP BY
          "Customer".custname,
          "Company".compname,
          "Customer".billcity,
          "States".statename,
          "Customer".phone,
          "Customer".email,
          "Customer".gstno,
          "Customer".panno
      `;
  
      const params = [compid];
      if (billcity) params.push(`%${billcity}%`);
      if (billstateid) params.push(billstateid);
  
      const { rows } = await pool.query(query, params);
  
      return res.status(200).json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
/**
 * @swagger
 * /api/GetSaleByCust:
 *   get:
 *     summary: Get report data for a given period and company ID
 *     tags: [Reports]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date of the period (e.g., 2023-07-01)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date of the period (e.g., 2023-07-31)
 *       - in: query
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Successful operation
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetSaleByCust', authMiddleware, async (req, res) => {
  const { startDate, endDate, compid } = req.query;

  try {
    // Get the report data for the given period and company ID
    const getReportDataQuery = `
      SELECT
        C.custname,
        COUNT(I.invid) AS "InvoiceCount",
        SUM(I.total) AS "TotalSales"
      FROM
        "Customer" C
        LEFT JOIN "Invoice" I ON C.custid = I.custid
      WHERE
        I.invdate >= $1 AND I.invdate <= $2 AND I.compid = $3
      GROUP BY
        C.custname;
    `;

    const values = [startDate, endDate, compid];
    const result = await pool.query(getReportDataQuery, values);

    const reportData = result.rows;
    return res.json(reportData);
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
* @swagger
* /api/GetSaleByItem:
*   get:
*     summary: Get report data for a given period and company ID
*     tags: [Reports]
*     security:
*       - basicAuth: []
*     parameters:
*       - in: query
*         name: startDate
*         schema:
*           type: string
*           format: date
*         required: true
*         description: Start date of the period (e.g., 2023-07-01)
*       - in: query
*         name: endDate
*         schema:
*           type: string
*           format: date
*         required: true
*         description: End date of the period (e.g., 2023-07-31)
*       - in: query
*         name: compid
*         schema:
*           type: integer
*         required: true
*         description: Company ID
*     responses:
*       200:
*         description: Successful operation
*       500:
*         description: Internal server error
*/
router.get('/api/GetSaleByItem', authMiddleware, async (req, res) => {
 const { startDate, endDate, compid } = req.query;

 try {
   // Get the report data for the given period and company ID
   const getReportDataQuery = `
     SELECT
       I.itemname,
       SUM(II.quantity) AS "TotalQuantity",
       SUM(II.rate * II.quantity) / SUM(II.quantity) AS "AverageRate",
       SUM(II.total) AS "TotalSales"
     FROM
       "Invoice" I
       INNER JOIN "InvoiceItem" II ON I.invid = II.invid
     WHERE
       I.invdate >= $1 AND I.invdate <= $2 AND I.compid = $3
     GROUP BY
       I.itemname;
   `;

   const values = [startDate, endDate, compid];
   const result = await pool.query(getReportDataQuery, values);

   const reportData = result.rows;
   return res.json(reportData);
 } catch (error) {
   console.error('Error fetching report data:', error);
   res.status(500).json({ message: 'Internal server error' });
 }
});

/**
 * @swagger
 * /api/GetCustBalance/{compid}:
 *   get:
 *     summary: Get report data for a given company ID
 *     tags: [Reports]
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
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetCustBalance/:compid', authMiddleware, async (req, res) => {
  const { compid } = req.params;

  try {
    // Get the report data for the given company ID
    const getReportDataQuery = `
      SELECT
        C.custname,
        SUM(I.total) AS "invbalance (FCY)",
        SUM(P.totalamt) AS "AvailableCredit (FCY)",
        SUM(I.total) - SUM(P.totalamt) AS "Balance (FCY)",
        SUM(I.total * CC.convrate) - SUM(P.totalamt * CC.convrate) AS "Balance (BCY)"
      FROM
        "Customer" C
        LEFT JOIN "Invoice" I ON C.custid = I.custid AND I.compid = $1
        LEFT JOIN "Payments" P ON C.custid = P.custid AND P.compid = $1
        LEFT JOIN "CurConv" CC ON I.currencycode = CC.currencycode AND P.currencycode = CC.currencycode
      GROUP BY
        C.custname;
    `;

    const values = [compid];
    const result = await pool.query(getReportDataQuery, values);

    const reportData = result.rows;
    return res.json(reportData);
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/GetInvDetails/{compid}:
 *   get:
 *     summary: Get report data for a given company ID and invoice date range
 *     tags: [Reports]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date of the invoice date range (e.g., 2023-07-01)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date of the invoice date range (e.g., 2023-07-31)
 *     responses:
 *       200:
 *         description: Successful operation
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetInvDetails/:compid', authMiddleware, async (req, res) => {
  const { compid } = req.params;
  const { startDate, endDate } = req.query;

  try {
    // Get the report data for the given company ID and invoice date range
    const getReportDataQuery = `
      SELECT
        CASE
          WHEN I.total = I.amtdue THEN 'Not paid'
          WHEN I.amtdue > 0 AND I.amtdue < I.total THEN 'Partial Paid'
          ELSE 'Paid'
        END AS "Status",
        I.invdate,
        I.duedate,
        I.invno,
        I.ordno,
        C.custname,
        I.total
      FROM
        "Invoice" I
        INNER JOIN "Customer" C ON I.custid = C.custid AND I.compid = C.compid
      WHERE
        I.compid = $1 AND I.invdate >= $2 AND I.invdate <= $3;
    `;

    const values = [compid, startDate, endDate];
    const result = await pool.query(getReportDataQuery, values);

    const reportData = result.rows;
    return res.json(reportData);
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/GetRecSum/{compid}:
 *   get:
 *     summary: Get report data for a particular company ID and invoice date range
 *     tags: [Reports]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date of the invoice date range (e.g., 2023-07-01)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date of the invoice date range (e.g., 2023-07-31)
 *     responses:
 *       200:
 *         description: Successful operation
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetRecSum/:compid', authMiddleware, async (req, res) => {
  const { compid } = req.params;
  const { startDate, endDate } = req.query;

  try {
    // Get the report data for the particular company ID and invoice date range
    const getReportDataQuery = `
      SELECT
        C.custname,
        I.invdate,
        I.invid,
        I.invno,
        CASE
          WHEN I.total = I.amtdue THEN 'Not Paid'
          WHEN I.amtdue > 0 AND I.total < I.amtdue THEN 'Partially Paid'
          ELSE 'Fully Paid'
        END AS "Status",
        'Invoice' AS "TranType",
        I.total AS "Total (BCY)",
        (P.totalamt - I.amtdue) * CC.convrate AS "Balance (BCY)",
        P.totalamt - I.amtdue AS "Balance (FCY)"
      FROM
        "Invoice" I
        INNER JOIN "Customer" C ON I.custid = C.custid AND I.compid = C.compid
        LEFT JOIN "Payments" P ON I.invid = P.invid AND I.custid = P.custid AND I.compid = P.compid
        LEFT JOIN "Company" CO ON I.compid = CO.compid
        LEFT JOIN "CurConv" CC ON P.currencycode = CC.fcurcode and CO.currencycode=CC.bcurcode
      WHERE
        I.compid = $1 AND I.invdate >= $2 AND I.invdate <= $3;
    `;

    const values = [compid, startDate, endDate];
    const result = await pool.query(getReportDataQuery, values);

    const reportData = result.rows;
    return res.json(reportData);
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/GetRecDet/{compid}/{custid}:
 *   get:
 *     summary: Get report data for a particular company ID, customer ID, and invoice date range
 *     tags: [Reports]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *       - in: path
 *         name: custid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Customer ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date of the invoice date range (e.g., 2023-07-01)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date of the invoice date range (e.g., 2023-07-31)
 *     responses:
 *       200:
 *         description: Successful operation
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetRecDet/:compid/:custid', authMiddleware, async (req, res) => {
  const { compid, custid } = req.params;
  const { startDate, endDate } = req.query;

  try {
    // Get the report data for the particular company ID, customer ID, and invoice date range
    const getReportDataQuery = `
      SELECT
        C.custname,
        I.invdate,
        I.invid,
        I.invno,
        It.itemname,
        II.quantity,
        It.rate * CC.convrate AS "Item Price (BCY)",
        It.rate * II.quantity * CC.convrate AS "Total (BCY)"
      FROM
        Invoice I
        INNER JOIN Customer C ON I.custid = C.custid AND I.compid = C.compid
        INNER JOIN InvoiceItem II ON I.invid = II.invid
        INNER JOIN Items It ON II.itemid = It.itemid
        LEFT JOIN CurConv CC ON It.currencycode = CC.currencycode
      WHERE
        I.compid = $1 AND I.custid = $2 AND I.invdate >= $3 AND I.invdate <= $4;
    `;

    const values = [compid, custid, startDate, endDate];
    const result = await pool.query(getReportDataQuery, values);

    const reportData = result.rows;
    return res.json(reportData);
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/GetPayRec/{compid}/{custid}:
 *   get:
 *     summary: Get report data for a particular company ID, customer ID, and payment date range
 *     tags: [Reports]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *       - in: path
 *         name: custid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Customer ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date of the payment date range (e.g., 2023-07-01)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date of the payment date range (e.g., 2023-07-31)
 *     responses:
 *       200:
 *         description: Successful operation
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetPayRec/:compid/:custid', authMiddleware, async (req, res) => {
  const { compid, custid } = req.params;
  const { startDate, endDate } = req.query;

  try {
    // Get the report data for the particular company ID, customer ID, and payment date range
    const getReportDataQuery = `
      SELECT
        P.payrefid,
        P.paydate,
        C.custname,
        PM.paymodename,
        P.remarks,
        I.invno,
        P.totalamt AS "Amount (FCY)",
        P.unadjustamt AS "Unadjusted Amount (FCY)",
        P.unadjustamt * CC.convrate AS "Amount (BCY)"
      FROM
        Payments P
        INNER JOIN Customer C ON P.custid = C.custid AND P.compid = C.compid
        LEFT JOIN PayMode PM ON P.paymodeid = PM.paymodeid
        LEFT JOIN Invoice I ON P.invid = I.invid AND P.custid = I.custid AND P.compid = I.compid
        LEFT JOIN CurConv CC ON P.currencycode = CC.currencycode
      WHERE
        P.compid = $1 AND P.custid = $2 AND P.paydate >= $3 AND P.paydate <= $4;
    `;

    const values = [compid, custid, startDate, endDate];
    const result = await pool.query(getReportDataQuery, values);

    const reportData = result.rows;
    return res.json(reportData);
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/GetTaxSum/{compid}:
 *   get:
 *     summary: Get report data in tabular form for a particular company ID and invoice date range
 *     tags: [Reports]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date of the invoice date range (e.g., 2023-07-01)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date of the invoice date range (e.g., 2023-07-31)
 *     responses:
 *       200:
 *         description: Successful operation
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetTaxSum/:compid', authMiddleware, async (req, res) => {
  const { compid } = req.params;
  const { startDate, endDate } = req.query;

  try {
    // Get the report data in tabular form for the particular company ID and invoice date range
    const getReportDataQuery = `
      SELECT
        IT.taxname AS "TaxName",
        IT.taxpercentage AS "TaxPercentage",
        SUM(IT.taxableamount) AS "TaxableAmount",
        SUM(IT.taxamount) AS "TaxAmount"
      FROM
        Invoice I
        INNER JOIN InvoiceTax IT ON I.invid = IT.invid AND I.custid = IT.custid AND I.compid = IT.compid
      WHERE
        I.compid = $1 AND I.invdate >= $2 AND I.invdate <= $3
      GROUP BY
        IT.taxname, IT.taxpercentage;
    `;

    const values = [compid, startDate, endDate];
    const result = await pool.query(getReportDataQuery, values);

    const reportData = result.rows;
    return res.json(reportData);
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/GetFormNo27EQ/{compid}:
 *   get:
 *     summary: Get report data for a particular company ID, report basis, and date range
 *     tags: [Reports]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *       - in: query
 *         name: reportBasis
 *         schema:
 *           type: string
 *           enum: [Party, Invoice, Payment]
 *         required: true
 *         description: Report basis (Party, Invoice, or Payment)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date of the date range (e.g., 2023-07-01)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date of the date range (e.g., 2023-07-31)
 *     responses:
 *       200:
 *         description: Successful operation
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetFormNo27EQ/:compid', authMiddleware, async (req, res) => {
  const { compid } = req.params;
  const { reportBasis, startDate, endDate } = req.query;

  try {
    // Get the report data for the particular company ID, report basis, and date range
    let getReportDataQuery = '';
    let values = [compid, startDate, endDate];

    if (reportBasis === 'Party') {
      getReportDataQuery = `
        SELECT
          C.pan_number AS "Party PAN No.",
          C.custname AS "Party Name",
          I.invno AS "Invoice #",
          IT.taxvalue AS "Tax Value",
          P.payrefid AS "Payment #",
          P.totalamt AS "Amount Received",
          P.paydate AS "Collection Date",
          P.remarks AS "Reason for Collection & Heigher Rate",
          P.paymodename AS "Payment Mode (%)"
        FROM
          Payments P
          INNER JOIN Customer C ON P.custid = C.custid AND P.compid = C.compid
          LEFT JOIN Invoice I ON P.invid = I.invid AND P.custid = I.custid AND P.compid = I.compid
          LEFT JOIN InvoiceTax IT ON I.invid = IT.invid AND I.custid = IT.custid AND I.compid = IT.compid
        WHERE
          P.compid = $1 AND P.paydate >= $2 AND P.paydate <= $3;
      `;
    } else if (reportBasis === 'Invoice') {
      getReportDataQuery = `
        SELECT
          C.pan_number AS "Party PAN No.",
          C.custname AS "Party Name",
          I.invno AS "Invoice #",
          IT.taxvalue AS "Tax Value",
          P.payrefid AS "Payment #",
          P.totalamt AS "Amount Received",
          P.paydate AS "Collection Date",
          P.remarks AS "Reason for Collection & Heigher Rate",
          P.paymodename AS "Payment Mode (%)"
        FROM
          Invoice I
          INNER JOIN Customer C ON I.custid = C.custid AND I.compid = C.compid
          LEFT JOIN InvoiceTax IT ON I.invid = IT.invid AND I.custid = IT.custid AND I.compid = IT.compid
          LEFT JOIN Payments P ON I.invid = P.invid AND I.custid = P.custid AND I.compid = P.compid
        WHERE
          I.compid = $1 AND I.invdate >= $2 AND I.invdate <= $3;
      `;
    } else if (reportBasis === 'Payment') {
      getReportDataQuery = `
        SELECT
          C.pan_number AS "Party PAN No.",
          C.custname AS "Party Name",
          I.invno AS "Invoice #",
          IT.taxvalue AS "Tax Value",
          P.payrefid AS "Payment #",
          P.totalamt AS "Amount Received",
          P.paydate AS "Collection Date",
          P.remarks AS "Reason for Collection & Heigher Rate",
          P.paymodename AS "Payment Mode (%)"
        FROM
          Payments P
          INNER JOIN Customer C ON P.custid = C.custid AND P.compid = C.compid
          LEFT JOIN Invoice I ON P.invid = I.invid AND P.custid = I.custid AND P.compid = I.compid
          LEFT JOIN InvoiceTax IT ON I.invid = IT.invid AND I.custid = IT.custid AND I.compid = IT.compid
        WHERE
          P.compid = $1 AND P.paydate >= $2 AND P.paydate <= $3;
      `;
    } else {
      return res.status(400).json({ message: 'Invalid report basis. Valid values are "Party", "Invoice", or "Payment".' });
    }

    const result = await pool.query(getReportDataQuery, values);
    const reportData = result.rows;
    return res.json(reportData);
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;