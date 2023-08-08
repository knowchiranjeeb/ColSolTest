const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const authenticateToken = require('../authMiddleware');
const { writeToUserLog, savePicture, fetchPicture, deleteFilesInFolder } = require('./common');

const upload = multer({ dest: 'uploads/' });

/**
 * @swagger
 * tags:
 *   name: Company
 *   description: API endpoints for Company
 */

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
 *           '*':
 *            schema:
 *               type: object
 *               properties:
 *                 logo:
 *                   type: string
 *                   format: binary 
 *       500:
 *         description: Failed to fetch the company details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message.
 */
router.get('/api/GetCompanyDetails/:compid', authenticateToken, async (req, res) => {
    const { compid } = req.params;
  
    if (!compid) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = 'SELECT compname, isgstreg, gstno, indtypeid, bustypeid, countryid, stateid, street1, street2, city, pincode, phone, email, website, fiscal, "language", dateformatid, panno, logofile FROM public."Company" WHERE compid = $1';
      const result = await pool.query(query, [compid]);
  
      if (result.rows.length > 0) {
        let picname = '/profilepic/demologo.jpg';
        const company = result.rows[0]    
        if (company.logofile != null && company.logofile.trim() != '') {
          picname = company.logofile;
        }
        const { contentType, data } =  await fetchPicture(picname);

        res.set('Content-Type', contentType);
        res.set('compname', company.compname);
        res.set('isgstreg', company.isgstreg);
        res.set('gstno', company.gstno);
        res.set('indtypeid', company.indtypeid);
        res.set('bustypeid', company.bustypeid);
        res.set('countryid', company.countryid);
        res.set('street1', company.street1);
        res.set('street2', company.street2);
        res.set('city', company.city);
        res.set('pincode', company.pincode);
        res.set('phone', company.phone);
        res.set('email', company.email);
        res.set('website', company.website);
        res.set('fiscal', company.fiscal);
        res.set('language', company.language);
        res.set('dateformatid', company.dateformatid);
        res.set('panno', company.panno);
        res.status(200).send(data);
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
  

    const extension = path.extname(req.file.originalname).toLowerCase();

    const logofile = await savePicture(req.file, 'CL'+compid.toString()+extension);

    const updateQuery = `
      UPDATE "Company"
      SET
        compname = $2,
        isgstreg = $3,
        gstno = $4,
        logofile = $5,
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
      logofile,
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

    console.log(upload.path);
    //deleteFilesInFolder(upload.path)
    //  .catch((err) => console.error(err));
    

    writeToUserLog(userid,'Updated Company - '+compname,compid,isweb);
    return res.status(200).json({ message: 'Company details updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;  
