const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       properties:
 *         CourseID:
 *           type: integer
 *         CourseName:
 *           type: string
 *         NoOfPrd:
 *           type: integer
 *         sessiontype:
 *           type: string
 */

/**
 * @swagger
 * /api/courses:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get all records from the Courses table
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: Returns all records from the Courses table
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 */
router.get('/api/courses', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT * FROM "Courses";';
    const result = await pool.query(query);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/courses/{coursename}:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get a record from the Courses table by CourseName
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: coursename
 *         required: true
 *         description: Name of the Course
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns the Course record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       404:
 *         description: Course record not found
 */
router.get('/api/courses/:coursename', authenticateToken, async (req, res) => {
  try {
    const coursename = req.params.coursename;

    const query = 'SELECT * FROM "Courses" WHERE "CourseName" = $1;';
    const values = [coursename];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Course record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/courses:
 *   post:
 *     security:
 *       - BasicAuth: []
 *     summary: Create a new record in the Courses table
 *     tags: [Courses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Course'
 *     responses:
 *       201:
 *         description: Returns the created Course record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 */
router.post('/api/courses', authenticateToken, async (req, res) => {
  try {
    const { CourseName, NoOfPrd, sessiontype } = req.body;

    const query =
      'INSERT INTO "Courses" ("CourseName", "NoOfPrd", "sessiontype") VALUES ($1, $2, $3) RETURNING *;';
    const values = [CourseName, NoOfPrd, sessiontype];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/courses/{courseid}:
 *   put:
 *     security:
 *       - BasicAuth: []
 *     summary: Update a record in the Courses table by CourseID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseid
 *         required: true
 *         description: ID of the Course
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Course'
 *     responses:
 *       200:
 *         description: Returns the updated Course record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       404:
 *         description: Course record not found
 */
router.put('/api/courses/:courseid', authenticateToken, async (req, res) => {
  try {
    const courseid = parseInt(req.params.courseid);
    const { CourseName, NoOfPrd, sessiontype } = req.body;

    const query =
      'UPDATE "Courses" SET "CourseName" = $1, "NoOfPrd" = $2, "sessiontype" = $3 WHERE "CourseID" = $4 RETURNING *;';
    const values = [CourseName, NoOfPrd, sessiontype, courseid];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Course record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/courses/{courseid}:
 *   delete:
 *     security:
 *       - BasicAuth: []
 *     summary: Delete a record from the Courses table by CourseID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseid
 *         required: true
 *         description: ID of the Course
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Course record deleted successfully
 */
router.delete('/api/courses/:courseid', authenticateToken, async (req, res) => {
  try {
    const courseid = parseInt(req.params.courseid);

    const query = 'DELETE FROM "Courses" WHERE "CourseID" = $1;';
    const values = [courseid];
    await pool.query(query, values);

    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
