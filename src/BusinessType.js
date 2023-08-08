const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');
const { writeToUserLog } = require('./common');

// Swagger documentation for BusinessType CRUD API
/**
 * @swagger
 * tags:
 *   name: BusinessType
 *   description: API endpoints for BusinessType
 */

// API route to create or update a BusinessType
/**
 * @swagger
 * /api/SaveBusinessType:
 *   post:
 *     security:
 *       - BasicAuth: []
 *     summary: Create or update a BusinessType
 *     tags: [BusinessType]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bustypeid:
 *                 type: integer
 *               bustype:
 *                 type: string
 *                 maxLength: 150
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: BusinessType ID if Saved
 *       201:
 *         description: Successfully created a new BusinessType
 *       500:
 *         description: An error occurred while creating/updating the BusinessType
 */
router.post('/api/SaveBusinessType', authenticateToken, async (req, res) => {
    const { bustypeid, bustype, userid, compid, isweb } = req.body;
  
    try {
      // Check if bustype already exists
      const checkQuery = 'SELECT * FROM public."BusinessType" WHERE TRIM(bustype) ILIKE $1';
      const checkResult = await pool.query(checkQuery, [bustype.trim()]);
      const compid = 0;

      if (checkResult.rows.length > 0) {
        // Update the existing bustype
        const updateQuery = 'UPDATE public."BusinessType" SET bustype = $2 where TRIM(bustype) ILIKE $1 RETURNING bustypeid';
        const updateResult = await pool.query(updateQuery, [bustype.trim(), bustype]);
  
        res.status(200).json(updateResult.rows[0]);
        writeToUserLog(userid, 'Updated Business Type - '+bustype, compid, isweb);
      } else {
        if (bustypeid > 0) {
          const checkQuery1 = 'SELECT * FROM public."BusinessType" WHERE bustypeid = $1';
          const checkResult1 = await pool.query(checkQuery1, [bustypeid]);
          if (checkResult1.rows.length > 0) {
              const updateQuery1 = 'UPDATE public."BusinessType" SET bustype = $1 where bustypeid = $2 RETURNING bustypeid';
              const updateResult1 = await pool.query(updateQuery1, [bustype, bustypeid]);
        
              res.status(200).json(updateResult1.rows[0]);
              writeToUserLog(userid, 'Updated Business Type - '+toString(bustypeid), compid, isweb);
              } else {
          // Create a new bustype
              const createQuery = 'INSERT INTO public."BusinessType" (bustype) VALUES ($1) RETURNING bustypeid';
              const createResult = await pool.query(createQuery, [bustype]);
        
              res.status(201).json(createResult.rows[0]);
              writeToUserLog(userid, 'Created Business Type - '+bustype, compid, isweb);
            }
        }
       else {
        // Create a new bustype
            const createQuery1 = 'INSERT INTO public."BusinessType" (bustype) VALUES ($1) RETURNING bustypeid';
            const createResult1 = await pool.query(createQuery1, [bustype]);
      
            res.status(201).json(createResult1.rows[0]);
            writeToUserLog(userid, 'Created Business Type - '+bustype, compid, isweb);
          }
      }
    } catch (error) {
      console.error('Error creating/updating BusinessType:', error);
      res.status(500).json({ error: 'An error occurred while creating/updating the BusinessType' });
    }
  });

// API route to get all BusinessTypes
/**
 * @swagger
 * /api/GetBusinessType:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get all BusinessTypes
 *     tags: [BusinessType]
 *     responses:
 *       200:
 *         description: Successfully retrieved all BusinessTypes
 *       500:
 *         description: An error occurred while retrieving BusinessTypes
 */
router.get('/api/GetBusinessType', authenticateToken, async (req, res) => {
    try {
      const query = 'SELECT * FROM public."BusinessType"';
  
      const result = await pool.query(query);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error retrieving BusinessTypes:', error);
      res.status(500).json({ error: 'An error occurred while retrieving BusinessTypes' });
    }
  });
  
  // API route to get a single BusinessType by ID
  /**
   * @swagger
   * /api/business-types/{id}:
   *   get:
   *     security:
   *       - BasicAuth: []
   *     summary: Get a BusinessType by ID
   *     tags: [BusinessType]
   *     parameters:
   *       - in: path
   *         name: id
   *         description: ID of the BusinessType
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Successfully retrieved the BusinessType
   *       404:
   *         description: BusinessType not found
   *       500:
   *         description: An error occurred while retrieving the BusinessType
   */
  router.get('/api/business-types/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const query = 'SELECT * FROM public."BusinessType" WHERE bustypeid = $1';
      const values = [id];
  
      const result = await pool.query(query, values);
  
      if (result.rows.length > 0) {
        res.status(200).json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'BusinessType not found' });
      }
    } catch (error) {
      console.error('Error retrieving BusinessType:', error);
      res.status(500).json({ error: 'An error occurred while retrieving the BusinessType' });
    }
  });

  // API route to delete a BusinessType by ID
/**
 * @swagger
 * /api/business-types/{id}:
 *   delete:
 *     security:
 *       - BasicAuth: []
 *     summary: Delete a BusinessType by ID
 *     tags: [BusinessType]
 *     parameters:
 *       - in: path
 *         name: id
 *         description: ID of the BusinessType
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully deleted the BusinessType
 *       404:
 *         description: BusinessType not found
 *       500:
 *         description: An error occurred while deleting the BusinessType
 */
router.delete('/api/business-types/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const query = 'DELETE FROM public."BusinessType" WHERE bustypeid = $1 RETURNING *';
      const values = [id];
  
      const result = await pool.query(query, values);
  
      if (result.rows.length > 0) {
        res.status(200).json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'BusinessType not found' });
      }
    } catch (error) {
      console.error('Error deleting BusinessType:', error);
      res.status(500).json({ error: 'An error occurred while deleting the BusinessType' });
    }
  });

  module.exports = router;