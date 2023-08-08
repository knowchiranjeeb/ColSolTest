const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');
const { generateOTP, sendEmail, sendSMS } = require('./common');

const siteadd = 'http://www.supergst.com'

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [App Health]
 *     summary: Check the health of the API
 *     responses:
 *       200:
 *         description: Returns the status and message indicating the API is healthy.
 *       500:
 *         description: Internal server error.
 */
router.get('/api/health', (req, res) => {
  try {
    res.status(200).json({ status: 'Healthy', message: 'KF Invoice API is up and running!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'API Down', message: 'Internal server error' });
  }
});


/**
 * @swagger
 * tags:
 *   name: Users
 *   description: API endpoints for Users
 */

/**
 * @swagger
 * /api/SaveReg:
 *   post:
 *     summary: Create a new entry in the Registration table
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *               emailid:
 *                 type: string
 *               mobileno:
 *                 type: string
 *               password:
 *                 type: string
 *               company:
 *                 type: string
 *               location:
 *                 type: string
 *               countryid:
 *                 type: integer
 *             required:
 *               - fullname
 *               - emailid
 *               - mobileno
 *               - password
 *               - company
 *               - location
 *     responses:
 *       200:
 *         description: Successfully created a new entry
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.post('/api/SaveReg', authenticateToken, async (req, res) => {
  const { fullname, emailid, mobileno, password, company, location, countryid } = req.body;
  const emailotp = generateOTP(10);
  const mobileotp = generateOTP(10);
  const emailverified = false;
  const mobileverified = false;
  const userverified = false;
  const userid = 0;

  if (!fullname || !emailid || !mobileno || !password || !company || !location) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const query = `INSERT INTO "Registration" (fullname, emailid, mobileno, password, company, location, countryid, emailotp, mobileotp, emailverified, mobileverified, userverified, userid)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;

    await pool.query(query, [
      fullname,
      emailid,
      mobileno,
      password,
      company,
      location,
      countryid,
      emailotp,
      mobileotp,
      emailverified,
      mobileverified,
      userverified,
      userid
    ]);

    const query1 = 'SELECT regid FROM "Registration" WHERE emailid = $1';

    const { rows } = await pool.query(query1, [emailid]);

    if (rows.length > 0) {
      const { regid } = rows[0];
      return res.status(200).json({ regid });
    }
    else
    {
      return res.status(200).json({ regid: 0 });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/CheckDupEmail:
 *   post:
 *     summary: Check if an email ID already exists in the Registration table
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailid:
 *                 type: string
 *             required:
 *               - emailid
 *     responses:
 *       200:
 *         description: Returns true if the email ID already exists, false otherwise
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.post('/api/CheckDupEmail', authenticateToken,async (req, res) => {
  const { emailid } = req.body;

  if (!emailid) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const query = 'SELECT EXISTS(SELECT 1 FROM "Registration" WHERE emailid ILIKE $1)';

    const { rows } = await pool.query(query, [emailid]);
    const exists = rows[0].exists;

    return res.status(200).json({ exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/CheckDupMobile:
 *   post:
 *     summary: Check if a mobile number already exists in the Registration table
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobileno:
 *                 type: string
 *             required:
 *               - mobileno
 *     responses:
 *       200:
 *         description: Returns true if the mobile number already exists, false otherwise
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.post('/api/CheckDupMobile', authenticateToken, async (req, res) => {
  const { mobileno } = req.body;

  if (!mobileno) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const query = 'SELECT EXISTS(SELECT 1 FROM "Registration" WHERE mobileno = $1)';

    const { rows } = await pool.query(query, [mobileno]);
    const exists = rows[0].exists;

    return res.status(200).json({ exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/CheckDupComp:
 *   post:
 *     summary: Check if a company number already exists in the Registration table
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company:
 *                 type: string
 *             required:
 *               - company
 *     responses:
 *       200:
 *         description: Returns true if the company number already exists, false otherwise
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.post('/api/CheckDupComp', authenticateToken, async (req, res) => {
  const { company } = req.body;

  if (!company) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const query = 'SELECT EXISTS(SELECT 1 FROM "Registration" WHERE company ILIKE $1)';

    const { rows } = await pool.query(query, [company]);
    const exists = rows[0].exists;

    return res.status(200).json({ exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/GetRegEmailOTP:
 *   post:
 *     summary: Get Email OTPLink based on email ID
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailid:
 *                 type: string
 *             required:
 *               - emailid
 *     responses:
 *       200:
 *         description: Returns the Email ID and OTPLink if found
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: Email ID not found
 *       500:
 *         description: Internal server error
 */
router.post('/api/GetRegEmailOTP', authenticateToken, async (req, res) => {
  const { emailid } = req.body;

  if (!emailid) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {

    const query = 'SELECT regid, emailid, fullname, emailotp FROM "Registration" WHERE emailid ILIKE $1';

    const { rows } = await pool.query(query, [emailid]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Email ID not found' });
    }

    const { regid, fullname, emailid1, emailotp } = rows[0];
    const OTPLink = `${siteadd}/verifyemailotp/${regid}/${emailotp}`;
    const ret = sendEmail(emailid1,'Verify your Email ID for SuperGST Invoice Application','Hi '+fullname+', Thanks you for Registering with Super GST Invoice. Click on the link ' + OTPLink+' to verify your Email. Thanks SUPER GST Invoice. Happy Invoicing.')
    let msg = ''
    if (ret === 'Email sent successfully') {
      msg='Please check your email - ' + emailid1 +' for a verification email'; 
    }
    else {
      msg='Please try later.Could not send a verification email to ' + emailid1 ; 
    }
    return res.status(200).json({'Message': msg}) 
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/GetRegMobileOTP:
 *   post:
 *     summary: Get Mobile OTPLink based on mobile number
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobileno:
 *                 type: string
 *             required:
 *               - emailid
 *     responses:
 *       200:
 *         description: Returns the Mobile Number and Mobile OTPLink if found
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: Mobile Number not found
 *       500:
 *         description: Internal server error
 */
router.post('/api/GetRegMobileOTP', authenticateToken, async (req, res) => {
  const { mobileno } = req.body;

  if (!mobileno) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const query = 'SELECT regid, fullname, mobileno, mobileotp FROM "Registration" WHERE mobileno = $1';

    const { rows } = await pool.query(query, [mobileno]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Mobile Number not found' });
    }

    const { regid, fullname, mobileno1, mobileotp } = rows[0];
    const OTPLink = `${siteadd}/verifymobileotp/${regid}/${mobileotp}`;
    const msg1 = 'Dear Customer, ' + mobileotp + ' is your OTP from AmiBong.com Login. For security reasons, Do not share this OTP with anyone.'
    //const msg1 = 'Hi '+fullname+', Thanks you for Registering with Super GST Invoice. Click on the link ' + OTPLink+' to verify your Mobile Number. Thanks from SUPER GST Invoice Team. Happy Invoicing.'
    const ret = sendSMS(mobileno1,'Verify your Mobile Number for SuperGST Invoice Application',msg1)
    let msg = ''
    if (ret === 'SMS sent successfully') {
      msg='Please check your mobile. An SMS has been send to - ' + mobileno1 +' for a mobile number verification'; 
    }
    else {
      msg='Please try later.Could not send a verification message to ' + mobileno1 ; 
    }
    return res.status(200).json({'Message': msg}) 

    return res.status(200).json({ OTPLink, mobileno1 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/VerifyEmailOTP:
 *   post:
 *     summary: Verify Email OTP by regid and OTP
 *     tags: [Users]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               regid:
 *                 type: integer
 *               otp:
 *                 type: string
 *             required:
 *               - regid
 *               - otp
 *     responses:
 *       200:
 *         description: Returns true if the Email OTP is verified and updated successfully
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: Registration ID not found
 *       500:
 *         description: Internal server error
 */
router.post('/api/VerifyEmailOTP', async (req, res) => {
  const { regid, otp } = req.body;

  if (!regid || !otp) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const query = 'SELECT emailotp, emailverified FROM "Registration" WHERE regid = $1';

    const { rows } = await pool.query(query, [regid]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Registration ID not found' });
    }

    const { emailotp, emailverified } = rows[0];
    if (emailotp === otp) {
      if (!emailverified) {
        await pool.query('UPDATE "Registration" SET emailverified = true WHERE regid = $1', [regid]);
        createUserAndCompany(regid, 'E');
      }
      return res.status(200).json({ verified: true });
    } else {
      return res.status(200).json({ verified: false });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/VerifyMobileOTP:
 *   post:
 *     summary: Verify Mobile OTP by regid and OTP
 *     tags: [Users]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               regid:
 *                 type: integer
 *               otp:
 *                 type: string
 *             required:
 *               - regid
 *               - otp
 *     responses:
 *       200:
 *         description: Returns true if the Mobile OTP is verified and updated successfully
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: Registration ID not found
 *       500:
 *         description: Internal server error
 */
router.post('/api/VerifyMobileOTP', async (req, res) => {
  const { regid, otp } = req.body;

  if (!regid || !otp) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const query = 'SELECT mobileotp, mobileverified FROM "Registration" WHERE regid = $1';

    const { rows } = await pool.query(query, [regid]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Registration ID not found' });
    }

    const { mobileotp, mobileverified } = rows[0];
    if (mobileotp === otp) {
      if (!mobileverified) {
        await pool.query('UPDATE "Registration" SET mobileverified = true WHERE regid = $1', [regid]);
        createUserAndCompany(regid, 'M');
      }
      return res.status(200).json({ verified: true });
    } else {
      return res.status(200).json({ verified: false });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to Create User and Company
async function createUserAndCompany(registration_regid, ver_type) {
  try {
    const regQuery = 'SELECT fullname, emailid, mobileno, password, company, location, countryid FROM "Registration" WHERE regid = $1';
    const regResult = await pool.query(regQuery, [registration_regid]);

    if (regResult.rows.length === 0) {
      throw new Error('Registration ID not found');
    }

    const { fullname, emailid, mobileno, password, company, location, countryid } = regResult.rows[0];

    const usertype = 'A';
    let emailver, mobver, lveremail, lvermob;
    if (ver_type === 'M') {
      emailver = true;
      mobver = false;
      lveremail = emailid;
      lvermob = '';
    }
    if (ver_type === 'E') {
      emailver = false;
      mobver = true;
      lveremail = '';
      lvermob = mobileno;
    }

    const userQuery = 'INSERT INTO "Users" (fullname, emailid, mobileno, password, company, location, countryid, usertype, emailverified, mobileverified, lastveremail, lastvermobile) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING userid';
    const userResult = await pool.query(userQuery, [fullname, emailid, mobileno, password, company, location, countryid, usertype, emailver, mobver, lveremail, lvermob]);

    const userId = userResult.rows[0].userid;

    const companyQuery = 'INSERT INTO "Company" (compname) VALUES ($1) RETURNING compid';
    const companyResult = await pool.query(companyQuery, [company]);

    const companyId = companyResult.rows[0].compid;

    const updateQuery = 'UPDATE "Users" SET compid = $1 WHERE userid = $2';
    await pool.query(updateQuery, [companyId, userId]);

    const updateQuery1 = 'UPDATE "Registration" SET userid = $1 WHERE regid = $2';
    await pool.query(updateQuery1, [userId, registration_regid]);

    console.log('User and Company records created successfully');
  } catch (err) {
    console.error(err);
  }
}

module.exports = router;