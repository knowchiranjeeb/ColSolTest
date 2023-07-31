const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const authenticateToken = require('../authMiddleware');
const { generateOTP, sendEmail, sendSMS, savePicture, fetchPicture, writeToUserLog } = require('./common');

const upload = multer({ dest: 'uploads/' });

const siteadd = 'http://www.supergst.com'

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: API endpoints for Users
 */

/**
 * @swagger
 * /api/CheckCred/{userind}/{password}:
 *   get:
 *     summary: Check the Credential based on mobile number or email ID and Password
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: userind
 *         schema:
 *           type: string
 *         required: true
 *         description: User Identification
 *       - in: path
 *         name: password
 *         schema:
 *           type: string
 *         required: true
 *         description: User Password to Check
 *     responses:
 *       200:
 *         description: Returns the user ID if found and 0 if not found
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.get('/api/CheckCred/:userind/:password', authenticateToken, async (req, res) => {
  const { userind, password } = req.params;

  if (!userind || !password) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    let query;
    query = 'SELECT checkCred($1::text, $2::text) AS userid';

    const { rows } = await pool.query(query, [userind, password]);
    const { userid } = rows[0];

    if (userid) {
      return res.status(200).json({ userid });
    } else {
      return res.status(201).json({userid : 0});
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/SendOTP:
 *   post:
 *     summary: Generate OTP and OTP Link based on mobile number or email ID
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userInput:
 *                 type: string
 *             required:
 *               - userInput
 *     responses:
 *       200:
 *         description: Returns the email/mobile number and OTP Link with generated OTP
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/api/SendOTP', authenticateToken, async (req, res) => {
  const { userInput } = req.body;

  if (!userInput) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    let query;
    let otpType;
    if (userInput.includes('@')) {
      query = 'SELECT userid FROM "Users" WHERE emailid = $1';
      otpType = 'email';
    } else {
      query = 'SELECT userid FROM "Users" WHERE mobileno = $1';
      otpType = 'mob';
    }

    const { rows } = await pool.query(query, [userInput]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { userid } = rows[0];
    const otp = generateOTP(6);
    const otpLink = `${siteadd}/VerifyUserLink/${otpType}/${userid}/${otp}`;

    // Update the OTP and OTP Link in the Users table
    const updateQuery = `UPDATE "Users" SET ${otpType}otp = $1 WHERE userid = $2`;
    await pool.query(updateQuery, [otp, userid]);

    return res.status(200).json({ [otpType]: userInput, otpLink });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/SendEmailOTP:
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
 *         description: Returns a Message that the email send to the Email ID 
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: Email ID not found
 *       500:
 *         description: Internal server error
 */
router.post('/api/SendEmailOTP', authenticateToken, async (req, res) => {
  const { emailid } = req.body;

  if (!emailid) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {

    const query = 'SELECT userid, emailid as emailid1, fullname, emailotp FROM "Users" WHERE emailid = $1';

    const { rows } = await pool.query(query, [emailid]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Email ID not found' });
    }

    const { userid, fullname, emailid1, emailotp } = rows[0];
    const OTPLink = `${siteadd}api/VerifyOTP/email/${userid}/${emailotp}`;
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
 * /api/SendMobileOTP:
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
 *               - mobileno
 *     responses:
 *       200:
 *         description: Returns the Message that SMS send to the Mobile Number
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: Mobile Number not found
 *       500:
 *         description: Internal server error
 */
router.post('/api/SendMobileOTP', authenticateToken, async (req, res) => {
  const { mobileno } = req.body;

  if (!mobileno) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const query = 'SELECT u.userid, u.fullname, u.mobileno as mobileno1, u.mobotp, co.isdcode FROM "Users" u, "Company" c,"Country" co WHERE u.compid=c.compid and c.countryid=co.countryid and u.mobileno = $1';

    const { rows } = await pool.query(query, [mobileno]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Mobile Number not found' });
    }

    const { userid, fullname, mobileno1, mobotp, isdcode } = rows[0];
    const OTPLink = `${siteadd}api/VerifyOTP/mob/${userid}/${mobotp}`;
    const mobno =  toString(mobotp).trim() + toString(mobileno1).trim()
    const msg1 = 'Dear Customer, ' + mobotp + ' is your OTP from AmiBong.com Login. For security reasons, Do not share this OTP with anyone.'
    //const msg1 = 'Hi '+fullname+', Thanks you for Registering with Super GST Invoice. Click on the link ' + OTPLink+' to verify your Mobile Number. Thanks from SUPER GST Invoice Team. Happy Invoicing.'
    const ret = sendSMS(mobno,'Verify your Mobile Number for SuperGST Invoice Application',msg1)
    let msg = ''
    if (ret === 'SMS sent successfully') {
      msg = 'Please check your mobile. An SMS has been send to mobile number ' + toString(mobileno1) +', for a mobile number verification'; 
    }
    else {
      msg = 'Please try later. Could not send a verification message to ' + toString(mobileno1) ; 
    }
    return res.status(200).json({'Message': msg}) 
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/VerifyOTP/{otpType}/{userid}/{otp}:
 *   post:
 *     summary: Check OTP based on user ID, OTP, and OTP type (email or mobile)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: otpType
 *         schema:
 *           type: string
 *         required: true
 *         description: OTP Type (email-Email, mob-Mobile)
 *       - in: path
 *         name: userid
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID 
 *       - in: path
 *         name: otp
 *         schema:
 *           type: string
 *         required: true
 *         description: User OTP 
 *     responses:
 *       200:
 *         description: Returns Verification Message if the OTP is verified and updates the corresponding field to true
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/api/VerifyOTP/:otpType/:userid/:otp', async (req, res) => {
  const { otpType, userid, otp } = req.body;

  if (!userid || !otp || !otpType) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    let query, updateField;
    if (otpType === 'email') {
      query = 'SELECT emailotp, emailid FROM "Users" WHERE userid = $1';
      updateField = 'emailverified';
    } else if (otpType === 'mob') {
      query = 'SELECT mobotp, mobileno FROM "Users" WHERE userid = $1';
      updateField = 'mobileverified';
    } else {
      return res.status(400).json({ error: 'Invalid OTP type' });
    }

    const { rows } = await pool.query(query, [userid]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { emailotp, emailid, mobotp, mobileno } = rows[0];
    const otpField = otpType === 'email' ? emailotp : mobotp;
    const lastverField = otpType === 'email' ? 'lastveremail' : 'lastvermobile';
    const verField = otpType === 'email' ? emailid : mobileno;

    if (otp === otpField) {
      const updateQuery = `UPDATE "Users" SET ${updateField} = true, ${lastverField} = ${verField} WHERE userid = $1`;
      await pool.query(updateQuery, [userid]);
      const msg = otpType === 'email' ? 'You email has been verified Successfully. Login to Super GST Invoice to continue.' : 'Your Mobile Number has been verified Successfully. Login to Super GST Invoice to continue.';
      return res.status(200).json({ Message: msg });
    } else {
      return res.status(200).json({ Message: 'Your Credential could not be verified. Please contact Super GST Help for assistance.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/UpdatePassword:
 *   post:
 *     summary: Save password based on the userid in the Users table
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userid:
 *                 type: integer
 *               password:
 *                 type: string
 *             required:
 *               - userid
 *               - password
 *     responses:
 *       200:
 *         description: Password saved successfully
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.post('/api/UpdatePassword', authenticateToken, async (req, res) => {
  const { userid, password } = req.body;

  if (!userid || !password) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const updateQuery = 'UPDATE "Users" SET password = $1 WHERE userid = $2';
    await pool.query(updateQuery, [password, userid]);

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/GetUserDet/{userid}:
 *   get:
 *     summary: Get user details from the Users table based on the userid
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: userid
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: Returns the user details
 *         content:
 *           '*':
 *            schema:
 *               type: object
 *               properties:
 *                 picture:
 *                   type: string
 *                   format: binary 
 *                 company:
 *                   type: string
 *                   description: The Company name.
 *                 salid:
 *                   type: integer
 *                   description: Salutation ID.
 *                 fullname:
 *                   type: string
 *                   description: The user's full name.
 *                 emailid:
 *                   type: string
 *                   description: The user's email id.
 *                 isemailverified:
 *                   type: boolean
 *                   description: Is the user's email id verified.
 *                 mobileno:
 *                   type: string
 *                   description: The user's mobile no.
 *                 ismobileverified:
 *                   type: boolean
 *                   description: Is the user's mobile no. verified.
 *                 usertype:
 *                   type: string
 *                   description: The user type.
 *       500:
 *         description: Failed to fetch the user details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message.
 */
router.get('/api/GetUserDet/:userid', authenticateToken, async (req, res) => {
  const { userid } = req.params;

  if (!userid) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const query = 'SELECT company, salid, fullname, emailid, emailverified as isemailverified, mobileno, mobileverified as ismobileverified, usertype, picture FROM "Users" WHERE userid = $1';
    const { rows } = await pool.query(query, [userid]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    user = rows[0];
    let picname = '/profilepic/emptyface.jpg';
    if (user.picture != null) {
      picname = user.picture;
    }

    const extension = path.extname(picname).toLowerCase();
    let contentType = 'application/octet-stream'; // Default content type

    // Determine the content type based on the image extension
    if (extension === '.jpg' || extension === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (extension === '.png') {
      contentType = 'image/png';
    } else if (extension === '.gif') {
      contentType = 'image/gif';
    } else if (extension === '.webp') {
      contentType = 'image/webp';
    }


    const data  =  await fetchPicture(picname);
    res.set('Content-Type', contentType);
    res.set('company', user.company);
    res.set('salid', user.salid);
    res.set('Fullname', user.fullname);
    res.set('emailid', user.emailid);
    res.set('isemailverified', user.isemailverified);
    res.set('mobileno', user.mobileno);
    res.set('ismobileverified', user.ismobileverified);
    res.set('usertype', user.usertype);
    res.status(200).send(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/UpdateUserDet:
 *   put:
 *     summary: Update user details based on the userid in the Users table
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               picture:
 *                 type: string
 *                 format: binary 
 *               userid:
 *                 type: integer
 *               salid:
 *                 type: integer
 *               fullname:
 *                 type: string
 *               emailid:
 *                 type: string
 *               mobileno:
 *                 type: string
 *             required:
 *               - userid
 *     responses:
 *       200:
 *         description: User details updated successfully
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/api/UpdateUserDet', upload.single('picture'),  authenticateToken, async (req, res) => {
  const { userid, salid, fullname, emailid, mobileno } = req.body;

  if (!userid) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {

    const getUserQuery = 'SELECT emailid, mobileno, lastveremail, lastvermobile FROM "Users" WHERE userid = $1';
    const { rows } = await pool.query(getUserQuery, [userid]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { emailid: savedEmail, mobileno: savedMobile, lastveremail, lastvermobile } = rows[0];

    const extension = path.extname(req.file.originalname).toLowerCase();

    const pictureUrl = await savePicture(req.file, 'UP'+userid.toString()+extension);

    // Update the user details
    const updateQuery = `
      UPDATE "Users"
      SET salid = $1, fullname = $2, emailid = $3, mobileno = $4, picture = $5
      WHERE userid = $6
    `;

    await pool.query(updateQuery, [salid, fullname, emailid, mobileno, pictureUrl, userid]);

    // Check if the saved email matches the last verified email
    const emailverified = lastveremail === savedEmail;

    // Check if the saved mobile matches the last verified mobile
    const mobileverified = lastvermobile === savedMobile;

    // Update the emailverified and mobileverified fields accordingly
    const updateVerificationQuery = 'UPDATE "Users" SET emailverified = $1, mobileverified = $2 WHERE userid = $3';
    await pool.query(updateVerificationQuery, [emailverified, mobileverified, userid]);

    return res.status(200).json({ message: 'User details updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/SaveUser:
 *   post:
 *     summary: Add or update records in the Users table
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userid:
 *                 type: integer
 *               salid:
 *                 type: integer
 *               fullname:
 *                 type: string
 *               compid:
 *                 type: integer
 *               mobileno:
 *                 type: string
 *               emailid:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - userid
 *               - fullname
 *               - compid
 *               - mobileno
 *               - emailid
 *               - password
 *     responses:
 *       200:
 *         description: Record added or updated successfully
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.post('/api/SaveUser', authenticateToken, async (req, res) => {
  const { userid, salid, fullname, compid, mobileno, emailid, password } = req.body;

  if (!fullname || !compid || !mobileno || !emailid || !password) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const usertype = 'U';
    const getOtherUserQuery = 'SELECT company, location, countryid FROM "Users" WHERE usertype = $1 AND compid = $2';
    const { rows } = await pool.query(getOtherUserQuery, ['A', compid]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Other user not found' });
    }

    const { company, location, countryid } = rows[0];

    if (userid > 0) {
      const checkQuery = `
          SELECT COUNT(*) AS count FROM "Users" WHERE usertype='U' and userid = $1
      `;
      const checkResult = await pool.query(checkQuery, [userid]);
      const userExists = checkResult.rows[0].count > 0;
  
      if (userExists) {
          // Update the existing user
          const updateQuery = `
          UPDATE "Users"
          SET salid = $2, fullname = $3, compid = $4, mobileno = $5, emailid = $6, usertype = $7, company = $8, location = $9, countryid = $10 
          WHERE userid = $1
          `;
  
          await pool.query(updateQuery, [userid, salid, fullname, compid, mobileno, emailid, usertype, company, location, countryid]);
      } else {
          // Add a new user
          const insertQuery = `
          INSERT INTO "Users" (salid, fullname, compid, mobileno, emailid, usertype, company, location, countryid, password)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
          `;
  
          await pool.query(insertQuery, [salid, fullname, compid, mobileno, emailid, usertype, company, location, countryid, password]);
      }
    }  
   else {
    // Add a new user
    const insertQuery1 = `
    INSERT INTO "Users" (salid, fullname, compid, mobileno, emailid, usertype, company, location, countryid, password)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
    `;
    await pool.query(insertQuery1, [salid, fullname, compid, mobileno, emailid, usertype, company, location, countryid, password]);
}
return res.status(200).json({ message: 'Record added or updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/SaveUserRole:
 *   post:
 *     summary: Add or update records in the UserRole table based on the userid
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userid:
 *                 type: integer
 *               masters:
 *                 type: boolean
 *               invoice:
 *                 type: boolean
 *               payment:
 *                 type: boolean
 *               adjustment:
 *                 type: boolean
 *               reports:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *             required:
 *               - userid
 *     responses:
 *       200:
 *         description: Record added or updated successfully
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.post('/api/SaveUserRole', authenticateToken, async (req, res) => {
  const { userid, masters, invoice, payment, adjustment, reports, isActive } = req.body;

  if (!userid) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const upsertQuery = `
      INSERT INTO "UserRole" (userid, masters, invoice, payment, adjustment, reports, isActive)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (userid)
      DO UPDATE SET masters = $2, invoice = $3, payment = $4, adjustment = $5, reports = $6, isActive = $7
    `;

    await pool.query(upsertQuery, [userid, masters, invoice, payment, adjustment, reports, isActive]);

    return res.status(200).json({ message: 'Record added or updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/GetUserList/{compid}:
 *   get:
 *     summary: Get users (only Normal user list) by compid from the Users table
 *     tags: [Users]
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
 *         description: Returns the users for the provided compid
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetUserList/:compid', authenticateToken, async (req, res) => {
  const { compid } = req.params;

  if (!compid) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const query = 'SELECT userid, fullname, emailid, mobileno FROM "Users" WHERE usertype = $1 AND compid = $2';
    const { rows } = await pool.query(query, ['U', compid]);

    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/GetUserDetForHeader/{userid}:
 *   get:
 *     summary: Get users by compid from the Users table
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: userid
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: Returns the user details for the provided userid
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetUserDetForHeader/:userid', authenticateToken, async (req, res) => {
  const { userid } = req.params;

  if (!userid) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const query = 'SELECT userid, compid, fullname, usertype FROM "Users" WHERE userid = $1';
    const { rows } = await pool.query(query, [userid]);

    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;