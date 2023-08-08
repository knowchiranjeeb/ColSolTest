const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const authenticateToken = require('../authMiddleware');
const { writeToUserLog, deleteTempFiles, getPicFromUploads, savePicToUploads } = require('./common');


const upload = multer({ dest: 'uploads/' });

/**
 * @swagger
 * tags:
 *   name: Company
 *   description: API endpoints for Company
 */

/**
 * @swagger
 * /api/GetCompanyLogo/{compid}:
 *   get:
 *     summary: Get user profile picture from the Users table based on the userid
 *     tags: [Company]
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
 *       '200':
 *         description: Successful operation. Returns the company's logo as a jpg image.
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       '400':
 *         description: Invalid request or missing parameters.
 *       '404':
 *         description: Company not found.
 *       '408':
 *         description: No logo available for the company.
 */
router.get('/api/GetCompanyLogo/:compid', authenticateToken, async (req, res) => {
  const { compid } = req.params;

  if (!compid) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {

    const folderPath = 'uploads';
    deleteTempFiles(folderPath);

    const query = 'SELECT logo FROM "Company" WHERE compid = $1';
    const { rows } = await pool.query(query, [compid]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    company = rows[0];
    const pictureData = company.logo;

    if (pictureData === null) {
      return res.status(408).send('No logo available for the company.');
    }

    const picturePath = await savePicToUploads(compid, pictureData, "Company");

    if (picturePath === null) {
      res.status(405).json({ error: 'Logo not found' });
    }
    else
    {
      const picData = await getPicFromUploads(compid,"Company");
      if (picData === null) {
        res.status(404).json({ error: 'Logo not found' });
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
 * /api/GetCompanyDetails/{compid}:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get company details from the Company table based on compid
 *     tags: [Company]
 *     parameters:
 *       - in: path
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Returns the company details
 *         content:
 *           compname:
 *             type: string
 *           isgstreg:
 *             type: boolean
 *           gstno:
 *             type: string
 *           indtypeid:
 *             type: integer
 *           bustypeid:
 *             type: integer
 *           countryid:
 *             type: integer
 *           stateid:
 *             type: integer
 *           street1:
 *             type: string
 *           street2:
 *             type: string
 *           city:
 *             type: string
 *           pincode:
 *             type: string
 *           phone:
 *             type: string
 *           email:
 *             type: string
 *           website:
 *             type: string
 *           fiscal:
 *             type: integer
 *           language:
 *             type: string
 *           dateformatid:
 *             type: integer
 *           panno:
 *             type: string
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: Company Not Found
 *       500:
 *         description: Failed to fetch the company details.
 */
router.get('/api/GetCompanyDetails/:compid', authenticateToken, async (req, res) => {
    const { compid } = req.params;
  
    if (!compid) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = 'SELECT compname, isgstreg, gstno, indtypeid, bustypeid, countryid, stateid, street1, street2, city, pincode, phone, email, website, fiscal, "language", dateformatid, panno, logo FROM public."Company" WHERE compid = $1';
      const result = await pool.query(query, [compid]);
  
      if (result.rows.length > 0) {
        return res.status(200).json(rows);
      }
      else {
        return res.status(404).json({ error: 'Company not found' });
      }  
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

/**
 * @swagger
 * /api/UpdComp:
 *   put:
 *     security:
 *       - BasicAuth: []
 *     summary: Update company details in the Company table based on compid
 *     tags: [Company]
 *     parameters:
 *       - in: query
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary 
 *               compname:
 *                 type: string
 *               isgstreg:
 *                 type: boolean
 *               gstno:
 *                 type: string
 *                 maxLength: 15
 *               indtypeid:
 *                 type: integer
 *               bustypeid:
 *                 type: integer
 *               countryid:
 *                 type: integer
 *               stateid:
 *                 type: integer
 *               street1:
 *                 type: string
 *                 maxLength: 250
 *               street2:
 *                 type: string
 *                 maxLength: 250
 *               city:
 *                 type: string
 *                 maxLength: 100
 *               pincode:
 *                 type: string
 *                 maxLength: 20
 *               phone:
 *                 type: string
 *                 maxLength: 30
 *               email:
 *                 type: string
 *                 maxLength: 150
 *               website:
 *                 type: string
 *                 maxLength: 150
 *               fiscal:
 *                 type: integer
 *               language:
 *                 type: string
 *                 maxLength: 2
 *               dateformatid:
 *                 type: integer
 *               panno:
 *                 type: string
 *                 maxLength: 10
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *             required:
 *               - compname
 *     responses:
 *       200:
 *         description: Company details updated successfully
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: Company not found
 *       500:
 *         description: Internal server error
 */
router.put('/api/UpdComp', upload.single('logo'), authenticateToken, async (req, res) => {
  const { compid } = req.query;
  const {
    compname,
    isgstreg,
    gstno,
    indtypeid,
    bustypeid,
    countryid,
    stateid,
    street1,
    street2,
    city,
    pincode,
    phone,
    email,
    website,
    fiscal,
    language,
    dateformatid,
    panno,
    userid,
    isweb,
  } = req.body;

  if (!compid || !compname) {
    return res.status(400).json({ error: 'Invalid request or missing parameters' });
  }

  try {
  
    const tempPath = req.file.path;

    const pictureData = await sharp(tempPath).resize(90, 90).toBuffer();
    
    const updateQuery = `
      UPDATE "Company"
      SET
        compname = $2,
        isgstreg = $3,
        gstno = $4,
        logo = $5,
        indtypeid = $6,
        bustypeid = $7,
        countryid = $8,
        stateid = $9,
        street1 = $10,
        street2 = $11,
        city = $12,
        pincode = $13,
        phone = $14,
        email = $15,
        website = $16,
        fiscal = $17,
        language = $18,
        dateformatid = $19,
        panno = $20,
        updon = NOW() 
      WHERE compid = $1
    `;

    const result = await pool.query(updateQuery, [
      compid,
      compname,
      isgstreg,
      gstno,
      pictureData,
      indtypeid,
      bustypeid,
      countryid,
      stateid,
      street1,
      street2,
      city,
      pincode,
      phone,
      email,
      website,
      fiscal,
      language,
      dateformatid,
      panno,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    writeToUserLog(userid,'Updated Company - '+compname,compid,isweb);
    return res.status(200).json({ message: 'Company details updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;  
