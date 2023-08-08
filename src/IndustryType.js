const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');
const { writeToUserLog } = require('./common');

// Swagger documentation for IndustryType CRUD API
/**
 * @swagger
 * tags:
 *   name: IndustryType
 *   description: API endpoints for IndustryType
 */

// API route to create or update an IndustryType
/**
 * @swagger
 * /api/SaveIndustryType:
 *   post:
 *     security:
 *       - BasicAuth: []
 *     summary: Create or update an IndustryType
 *     tags: [IndustryType]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               indtypeid:
 *                 type: integer
 *               indtype:
 *                 type: string
 *                 maxLength: 150
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: IndustryType ID if Saved
 *       201:
 *         description: Successfully created a new IndustryType
 *       500:
 *         description: An error occurred while creating/updating the IndustryType
 */
router.post('/api/SaveIndustryType', authenticateToken, async (req, res) => {
    const { indtypeid, indtype, userid, isweb } = req.body;
  
    try {
      // Check if indtype already exists
      const checkQuery = 'SELECT * FROM public."IndustryType" WHERE TRIM(indtype) ILIKE $1';
      const checkResult = await pool.query(checkQuery, [indtype.trim()]);
      const compid = 0;

      if (checkResult.rows.length > 0) {
        // Update the existing indtype
        const updateQuery = 'UPDATE public."IndustryType" SET indtype = $2 WHERE TRIM(indtype) ILIKE $1 RETURNING indtypeid';
        const updateResult = await pool.query(updateQuery, [indtype.trim(), indtype]);
  
        res.status(200).json(updateResult.rows[0]);
        writeToUserLog(userid, 'Updated Industry Type - '+indtype, compid, isweb);
      } else {
        if (indtypeid > 0) {
          const checkQuery1 = 'SELECT * FROM public."IndustryType" WHERE indtypeid = $1';
          const checkResult1 = await pool.query(checkQuery1, [indtypeid]);
      
          if (checkResult1.rows.length > 0) {
              // Update the existing indtype
              const updateQuery = 'UPDATE public."IndustryType" SET indtype = $1 WHERE indtypeid = $2 RETURNING indtypeid';
              const updateResult = await pool.query(updateQuery, [indtype, indtypeid]);
        
              res.status(200).json(updateResult.rows[0]);
              writeToUserLog(userid, 'Updated Industry Type - '+indtypeid.toString(), compid, isweb);
            } else {
              // Create a new indtype
              const createQuery = 'INSERT INTO public."IndustryType" (indtype) VALUES ($1) RETURNING indtypeid';
              const createResult = await pool.query(createQuery, [indtype]);
        
              res.status(201).json(createResult.rows[0]);
              writeToUserLog(userid, 'Created Industry Type - '+indtype, compid, isweb);
            }
        }
       else {
        // Create a new indtype
          const createQuery1 = 'INSERT INTO public."IndustryType" (indtype) VALUES ($1) RETURNING indtypeid';
          const createResult1 = await pool.query(createQuery1, [indtype]);
    
          res.status(201).json(createResult1.rows[0]);
          writeToUserLog(userid, 'Created Industry Type - '+indtype, compid, isweb);
        }  
      }
    } catch (error) {
      console.error('Error creating/updating IndustryType:', error);
      res.status(500).json({ error: 'An error occurred while creating/updating the IndustryType' });
    }
  });
  
  // API route to get all IndustryTypes
  /**
   * @swagger
   * /api/GetIndustryType:
   *   get:
   *     security:
   *       - BasicAuth: []
   *     summary: Get all IndustryTypes
   *     tags: [IndustryType]
   *     responses:
   *       200:
   *         description: Successfully retrieved all IndustryTypes
   *       500:
   *         description: An error occurred while retrieving the IndustryTypes
   */
  router.get('/api/GetIndustryType', authenticateToken, async (req, res) => {
    try {
      const query = 'SELECT * FROM public."IndustryType"';
      const result = await pool.query(query);
  
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error retrieving IndustryTypes:', error);
      res.status(500).json({ error: 'An error occurred while retrieving the IndustryTypes' });
    }
  });
  
  // API route to get a single IndustryType by indtypeid
  /**
   * @swagger
   * /api/industry-types/{indtypeid}:
   *   get:
   *     security:
   *       - BasicAuth: []
   *     summary: Get a single IndustryType by indtypeid
   *     tags: [IndustryType]
   *     parameters:
   *       - in: path
   *         name: indtypeid
   *         schema:
   *           type: integer
   *         required: true
   *         description: IndustryType ID
   *     responses:
   *       200:
   *         description: Successfully retrieved the IndustryType
   *       404:
   *         description: IndustryType not found
   *       500:
   *         description: An error occurred while retrieving the IndustryType
   */
  router.get('/api/industry-types/:indtypeid', authenticateToken, async (req, res) => {
    const { indtypeid } = req.params;
  
    try {
      const query = 'SELECT * FROM public."IndustryType" WHERE indtypeid = $1';
      const result = await pool.query(query, [indtypeid]);
  
      if (result.rows.length > 0) {
        res.status(200).json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'IndustryType not found' });
      }
    } catch (error) {
      console.error('Error retrieving IndustryType:', error);
      res.status(500).json({ error: 'An error occurred while retrieving the IndustryType' });
    }
  });
  
  // API route to delete an IndustryType by indtypeid
  /**
   * @swagger
   * /api/industry-types/{indtypeid}:
   *   delete:
   *     security:
   *       - BasicAuth: []
   *     summary: Delete an IndustryType by indtypeid
   *     tags: [IndustryType]
   *     parameters:
   *       - in: path
   *         name: indtypeid
   *         schema:
   *           type: integer
   *         required: true
   *         description: IndustryType ID
   *     responses:
   *       204:
   *         description: IndustryType deleted successfully
   *       404:
   *         description: IndustryType not found
   *       500:
   *         description: An error occurred while deleting the IndustryType
   */
  router.delete('/api/industry-types/:indtypeid', authenticateToken, async (req, res) => {
    const { indtypeid } = req.params;
  
    try {
      const deleteQuery = 'DELETE FROM public."IndustryType" WHERE indtypeid = $1';
      const deleteResult = await pool.query(deleteQuery, [indtypeid]);
  
      if (deleteResult.rowCount > 0) {
        res.sendStatus(204);
      } else {
        res.status(404).json({ error: 'IndustryType not found' });
      }
    } catch (error) {
      console.error('Error deleting IndustryType:', error);
      res.status(500).json({ error: 'An error occurred while deleting the IndustryType' });
    }
  });

module.exports = router;
