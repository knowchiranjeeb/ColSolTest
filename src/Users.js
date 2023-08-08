const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const authenticateToken = require('../authMiddleware');
const { generateOTP, sendEmail, sendSMS, deleteTempFiles, getPicFromUploads, savePicToUploads } = require('./common');

const upload = multer({ dest: 'uploads/' });

const siteadd = 'https://orca-app-czm5x.ondigitalocean.app/'

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
 *         description: User Identification (Email or Mobile Number [Without country Code])
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

    const query = 'SELECT userid, emailid as emailid1, fullname FROM "Users" WHERE emailid = $1';

    const { rows } = await pool.query(query, [emailid]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Email ID not found' });
    }

    const eOTP = generateOTP(6);
    
    const updOTP = 'Update "Users" set emailotp=$1 where emailid = $2';

    await pool.query(updOTP, [eOTP, emailid]);

    const { userid, fullname, emailid1 } = rows[0];
    const OTPLink = `${siteadd}api/VerifyOTP/email/${userid}/${eOTP}`;
    const ret = sendEmail(emailid1,'Verify your Email ID for SuperGST Invoice Application','Hi '+fullname+', Thanks you for Registering with Super GST Invoice. Click on the link ' + OTPLink+' to verify your Email. Good Luck from SUPER GST Invoice Team. Happy Invoicing.');
    let msg = '';
    if (ret === 'Email sent successfully') {
      msg='Please check your email - ' + emailid1 +' for a verification email'; 
    }
    else {
      msg='Please try later.Could not send a verification email to ' + emailid1 ; 
    }
    return res.status(200).json({'Message': msg}); 
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
    const query = 'SELECT u.userid, u.fullname, u.mobileno as mobileno1, co.isdcode FROM "Users" u, "Country" co WHERE u.countryid=co.countryid and u.mobileno = $1';

    const { rows } = await pool.query(query, [mobileno]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Mobile Number not found' });
    }

    const mOTP = generateOTP(6);
    
    const updOTP = 'Update "Users" set mobotp=$1 where mobileno = $2';

    await pool.query(updOTP, [mOTP, mobileno]);

    const { userid, fullname, mobileno1, isdcode } = rows[0];
    const OTPLink = `${siteadd}api/VerifyOTP/mob/${userid}/${mOTP}`;
    const mobno =  isdcode.toString().trim() + mobileno1.toString().trim();
    //const msg1 = 'Dear Customer, ' + mOTP.toString() + ' is your OTP from AmiBong.com Login. For security reasons, Do not share this OTP with anyone.';
    const msg1 = 'Dear Customer, ' + mOTP.toString() + ' is your OTP from AmiBong.com Login. For security reasons, Do not share this OTP with anyone.';
    const ret = sendSMS(msg1, mobno);
    let msg = ''
    console.log(ret);
    if (ret === 'SMS sent successfully') {
      msg = 'Please check your mobile. An SMS has been send to mobile number ' + mobileno1.toString() +', for a mobile number verification'; 
    }
    else {
      msg = 'Please try later. Could not send a verification message to ' + mobileno1.toString() ; 
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
 *   get:
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
router.get('/api/VerifyOTP/:otpType/:userid/:otp', async (req, res) => {
  const { otpType, userid, otp } = req.params;

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
      const updateQuery = `UPDATE "Users" SET ${updateField} = true, ${lastverField} = '${verField}' WHERE userid = $1`;
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
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetUserDet/:userid', authenticateToken, async (req, res) => {
  const { userid } = req.params;

  if (!userid) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const query = 'SELECT company, salid, fullname, emailid, emailverified as isemailverified, mobileno, mobileverified as ismobileverified, usertype FROM "Users" WHERE userid = $1';
    const { rows } = await pool.query(query, [userid]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/GetUserPicture/{userid}:
 *   get:
 *     summary: Get user profile picture from the Users table based on the userid
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
 *       '200':
 *         description: Successful operation. Returns the user's profile picture as a jpg image.
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       '404':
 *         description: User profile picture not found.
 */
router.get('/api/GetUserPicture/:userid', authenticateToken, async (req, res) => {
  const { userid } = req.params;

  if (!userid) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }


  try {

    const folderPath = 'uploads';
    deleteTempFiles(folderPath);
  
    const query = 'SELECT profilepic FROM "Users" WHERE userid = $1';
    const { rows } = await pool.query(query, [userid]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    user = rows[0];
    const pictureData = user.profilepic;

    if (pictureData === null) {
      return res.status(400).send('No profile picture available for the user.');
    }
    const picturePath = await savePicToUploads(userid, pictureData, "User");
    if (picturePath === null) {
      res.status(405).json({ error: 'Profile Picture not found' });
    }
    else
    {
      const picData = await getPicFromUploads(userid,"User");
      if (picData === null) {
        res.status(404).json({ error: 'Profile Picture not found' });
      } else {
        res.contentType('image/jpeg'); 
        res.end(picData); 
      }
    }
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

    const tempPath = req.file.path;

    const pictureData = await sharp(tempPath).resize(90, 90).toBuffer();

    // Update the user details
    const updateQuery = `
      UPDATE "Users"
      SET salid = $1, fullname = $2, emailid = $3, mobileno = $4, profilepic = $5
      WHERE userid = $6
    `;

    await pool.query(updateQuery, [salid, fullname, emailid, mobileno, pictureData, userid]);

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
 *     summary: Get users by userid to display in the header and set user permission
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

/**
 * @swagger
 * /api/GetUserRoles:
 *   get:
 *     summary: Get user details from the Users and UserRole tables based on the userid
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: query
 *         name: userid
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: Returns the user details
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetUserRoles', authenticateToken, async (req, res) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const query = `
          SELECT u.salid, u.fullname,u.usertype,  u.emailid, u.mobileno, u.compid,
		  COALESCE(ur.masters,case when u.usertype='U' then false else true end) as masters, 
		  COALESCE(ur.invoice,case when u.usertype='U' then false else true end) as invoice, 
		  COALESCE(ur.payment,case when u.usertype='U' then false else true end) as payment,  
		  COALESCE(ur.adjustment,case when u.usertype='U' then false else true end) as adjustment,  
		  COALESCE(ur.isactive,true) as isactive
          COALESCE(ur.isactive,true)
          FROM "Users" AS u
          LEFT OUTER JOIN "UserRole" AS ur ON u.userid = ur.userid
          WHERE u.userid = $1
    `;

    const { rows } = await pool.query(query, [userid]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDetails = rows[0];
    return res.status(200).json(userDetails);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/GetUserPerm:
 *   get:
 *     summary: Get user permission details from the Users and UserRole tables based on the userid
 *     tags: [Users]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: query
 *         name: userid
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: Returns the user permission details
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetUserPerm', authenticateToken, async (req, res) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const query = `
      SELECT u.usertype, u.fullname, ur.masters, ur.invoice, ur.payment, ur.adjustment
      FROM "Users" AS u
      JOIN "UserRole" AS ur ON u.userid = ur.userid
      WHERE u.userid = $1
    `;

    const { rows } = await pool.query(query, [userid]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDetails = rows[0];
    return res.status(200).json(userDetails);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/SaveLog:
 *   post:
 *     summary: Create a new user log record in the UserLog table
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
 *               logdate:
 *                 type: string
 *                 format: date
 *               logtime:
 *                 type: string
 *               logaction:
 *                 type: string
 *               compid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *             required:
 *               - userid
 *               - logdate
 *               - logtime
 *               - logaction
 *               - compid
 *               - isweb
 *     responses:
 *       200:
 *         description: User log record created successfully
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.post('/api/SaveLog', authenticateToken, async (req, res) => {
  const { userid, logdate, logtime, logaction, compid, isweb } = req.body;

  if (!userid || !logdate || !logtime || !logaction || !compid || !isweb) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const insertQuery = 'INSERT INTO "Userlog" (userid, logdate, logtime, logaction, compid, isweb) VALUES ($1, $2, $3, $4, $5, $6)';

    await pool.query(insertQuery, [userid, logdate, logtime, logaction, compid, isweb]);

    return res.status(200).json({ message: 'User log record created successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/UpdateUserStat:
 *   put:
 *     summary: Reverse the isactive value in the UserRole table based on userid
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
 *             required:
 *               - userid
 *     responses:
 *       200:
 *         description: UserRole isactive value reversed successfully
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: User not found in UserRole table
 *       500:
 *         description: Internal server error
 */
router.put('/api/UpdateUserStat', authenticateToken, async (req, res) => {
  const { userid } = req.body;

  if (!userid) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
    const selectQuery = `
      SELECT isactive FROM "UserRole" WHERE userid = $1
    `;

    const { rows } = await pool.query(selectQuery, [userid]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found in UserRole table' });
    }

    const currentIsActive = rows[0].isactive;
    const newIsActive = !currentIsActive;

    const updateQuery = `
      UPDATE "UserRole"
      SET isactive = $1
      WHERE userid = $2
    `;

    await pool.query(updateQuery, [newIsActive, userid]);

    return res.status(200).json({ message: 'User Is Active value reversed successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;