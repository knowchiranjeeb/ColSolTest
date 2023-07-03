const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Subject:
 *       type: object
 *       properties:
 *         SubjectID:
 *           type: integer
 *         SubjectName:
 *           type: string
 *         CourseID:
 *           type: integer
 */

/**
 * @swagger
 * /api/subjects:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get all subjects
 *     tags: [Subject]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Subject'
 *       500:
 *         description: An error occurred while retrieving subjects
 */
router.get('/api/subjects', authenticateToken, async (req, res) => {
  try {
    // Perform the select query
    const query = 'SELECT * FROM "Subjects";';
    const result = await pool.query(query);

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while retrieving subjects.');
  }
});

/**
 * @swagger
 * /api/subjects/{subjectname}:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get a subject by SubjectName
 *     tags: [Subject]
 *     parameters:
 *       - in: path
 *         name: subjectname
 *         required: true
 *         schema:
 *           type: string
 *         description: The SubjectName of the subject to retrieve
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subject'
 *       '404':
 *         description: Subject not found
 *       '500':
 *         description: An error occurred while retrieving the subject
 */
router.get('/api/subjects/:subjectname', authenticateToken, async (req, res) => {
  try {
    const subjectname = req.params.subjectname;

    const query = 'SELECT * FROM "Subjects" WHERE "SubjectName" = $1;';
    const values = [subjectname];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Subject record not found' });
    }

    res.json(result.rows[0]);
   
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while retrieving the subject.');
  }
});

/**
 * @swagger
 * /api/subjects:
 *   post:
 *     security:
 *       - BasicAuth: []
 *     summary: Create a new subject
 *     tags: [Subject]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Subject'
 *     responses:
 *       '201':
 *         description: Subject created successfully
 *       '500':
 *         description: An error occurred while creating the subject
 */
router.post('/api/subjects', authenticateToken, async (req, res) => {
  try {
    const { SubjectName, CourseID } = req.body;


    const query =
      'INSERT INTO "Subjects" ("SubjectName", "CourseID") VALUES ($1, $2) RETURNING *;';
    const values = [SubjectName, CourseID];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while creating the subject.');
  }
});

/**
 * @swagger
 * /api/subjects/{SubjectID}:
 *   put:
 *     security:
 *       - BasicAuth: []
 *     summary: Update a subject by SubjectID
 *     tags: [Subject]
 *     parameters:
 *       - in: path
 *         name: SubjectID
 *         required: true
 *         schema:
 *           type: integer
 *         description: The SubjectID of the subject to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Subject'
 *     responses:
 *       '200':
 *         description: Subject updated successfully
 *       '404':
 *         description: Subject not found
 *       '500':
 *         description: An error occurred while updating the subject
 */
router.put('/api/subjects/:SubjectID', authenticateToken, async (req, res) => {
    try {
        const SubjectID = parseInt(req.params.SubjectID);
        const { SubjectName, CourseID } = req.body;
    
        const query =
          'UPDATE "Subjects" SET "SubjectName" = $1, "CourseID" = $2 WHERE "SubjectID" = $3 RETURNING *;';
        const values = [SubjectName, CourseID, SubjectID];
        const result = await pool.query(query, values);
    
        if (result.rows.length === 0) {
          return res.status(404).json({ message: 'Subject record not found' });
        }
    
        res.json(result.rows[0]);
    
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred while updating the subject.');
    }
  });
  
  /**
   * @swagger
   * /api/subjects/{id}:
   *   delete:
   *     security:
   *       - BasicAuth: []
   *     summary: Delete a subject by SubjectID
   *     tags: [Subject]
   *     parameters:
   *       - in: path
   *         name: SubjectID
   *         required: true
   *         schema:
   *           type: integer
   *         description: The SubjectID of the subject to delete
   *     responses:
   *       '200':
   *         description: Subject deleted successfully
   *       '404':
   *         description: Subject not found
   *       '500':
   *         description: An error occurred while deleting the subject
   */
  router.delete('/api/subjects/:id', authenticateToken, async (req, res) => {
    try {
        const SubjectID = parseInt(req.params.SubjectID);

        const query = 'DELETE FROM "Subjects" WHERE "SubjectID" = $1;';
        const values = [SubjectID];
        await pool.query(query, values);
    
        res.sendStatus(204);
    
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred while deleting the subject.');
    }
  });
  
module.exports = router;
