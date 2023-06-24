const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     RoomType:
 *       type: object
 *       properties:
 *         roomtype:
 *           type: string
 *         typename:
 *           type: string
 */

/**
 * @swagger
 * /api/roomtypes:
 *   get:
 *     summary: Get all records from the RoomType table
 *     tags: [RoomType]
 *     responses:
 *       200:
 *         description: Returns all records from the RoomType table
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RoomType'
 */
router.get('/api/roomtypes', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT * FROM "RoomType";';
    const result = await pool.query(query);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Gender:
 *       type: object
 *       properties:
 *         gender:
 *           type: string
 *         gendername:
 *           type: string
 */

/**
 * @swagger
 * /api/genders:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get all records from the Gender table
 *     tags: [Gender]
 *     responses:
 *       200:
 *         description: Returns all records from the Gender table
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Gender'
 */
router.get('/api/genders', authenticateToken, async (req, res) => {
    try {
      const query = 'SELECT * FROM "Gender";';
      const result = await pool.query(query);
  
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

/**
 * @swagger
 * components:
 *   schemas:
 *     CollegeType:
 *       type: object
 *       properties:
 *         CollegeType:
 *           type: string
 *         TypeOfCollege:
 *           type: string
 */

/**
 * @swagger
 * /api/college-types:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get all records from the CollegeType table
 *     tags: [CollegeType]
 *     responses:
 *       200:
 *         description: Returns all records from the CollegeType table
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CollegeType'
 */
router.get('/api/college-types', authenticateToken, async (req, res) => {
    try {
      const query = 'SELECT * FROM "CollegeType";';
      const result = await pool.query(query);
  
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

/**
 * @swagger
 * components:
 *   schemas:
 *     SessionType:
 *       type: object
 *       properties:
 *         sessiontype:
 *           type: string
 *         sessiontypename:
 *           type: string
 */

/**
 * @swagger
 * /api/session-types:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get all records from the SessionType table
 *     tags: [SessionType]
 *     responses:
 *       200:
 *         description: Returns all records from the SessionType table
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SessionType'
 */
router.get('/api/session-types', authenticateToken, async (req, res) => {
    try {
      const query = 'SELECT sessiontype,sessiontypename FROM "SessionType";';
      const result = await pool.query(query);
  
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

module.exports = router;
