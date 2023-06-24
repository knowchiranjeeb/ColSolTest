const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Topic:
 *       type: object
 *       properties:
 *         TopicID:
 *           type: integer
 *         TopicName:
 *           type: string
 *         ForEmp:
 *           type: boolean
 *         ForStaff:
 *           type: boolean
 *         ForStudent:
 *           type: boolean
 */

/**
 * @swagger
 * /api/topics:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get all records from the Topic table
 *     tags: [Topic]
 *     responses:
 *       200:
 *         description: Returns all records from the Topic table
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Topic'
 */
router.get('/api/topics', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT * FROM "Topic";';
    const result = await pool.query(query);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/topics/{topicname}:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get a record from the Topic table by TopicName
 *     tags: [Topic]
 *     parameters:
 *       - in: path
 *         name: topicname
 *         required: true
 *         description: Name of the Topic
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns the Topic record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Topic'
 *       404:
 *         description: Topic record not found
 */
router.get('/api/topics/:topicname', authenticateToken, async (req, res) => {
  try {
    const topicname = req.params.topicname;

    const query = 'SELECT * FROM "Topic" WHERE "TopicName" = $1;';
    const values = [topicname];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Topic record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/topics:
 *   post:
 *     security:
 *       - BasicAuth: []
 *     summary: Create a new record in the Topic table
 *     tags: [Topic]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Topic'
 *     responses:
 *       201:
 *         description: Returns the created Topic record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Topic'
 */
router.post('/api/topics', authenticateToken, async (req, res) => {
  try {
    const { TopicID, TopicName, ForEmp, ForStaff, ForStudent } = req.body;

    const query =
      'INSERT INTO "Topic" ("TopicID", "TopicName", "ForEmp", "ForStaff", "ForStudent") ' +
      'VALUES ($1, $2, $3, $4, $5) RETURNING *;';
    const values = [TopicID, TopicName, ForEmp, ForStaff, ForStudent];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/topics/{id}:
 *   put:
 *     security:
 *       - BasicAuth: []
 *     summary: Update a topic by TopicID
 *     tags: [Topic]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The TopicID of the topic to update
 *       - in: body
 *         name: topic
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             topicName:
 *               type: string
 *             forEmp:
 *               type: boolean
 *             forStaff:
 *               type: boolean
 *             forStudent:
 *               type: boolean
 *         description: The updated topic details
 *     responses:
 *       '200':
 *         description: Topic updated successfully
 *       '500':
 *         description: An error occurred while updating the topic
 */
router.put('/api/topics/:id', authenticateToken, (req, res) => {
  const topicId = req.params.id;
  const { topicName, forEmp, forStaff, forStudent } = req.body;

  // Perform the update query
  pool.query(
    'UPDATE "Topic" SET "TopicName" = $1, "ForEmp" = $2, "ForStaff" = $3, "ForStudent" = $4 WHERE "TopicID" = $5',
    [topicName, forEmp, forStaff, forStudent, topicId],
    (error, results) => {
      if (error) {
        console.error(error);
        res.status(500).send('An error occurred while updating the topic.');
      } else {
        res.status(200).send('Topic updated successfully.');
      }
    }
  );
});

/**
 * @swagger
 * /api/topics/{id}:
 *   delete:
 *     security:
 *       - BasicAuth: []
 *     summary: Delete a topic by TopicID
 *     tags: [Topic]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The TopicID of the topic to delete
 *     responses:
 *       '200':
 *         description: Topic deleted successfully
 *       '500':
 *         description: An error occurred while deleting the topic
 */
router.delete('/api/topics/:id', authenticateToken, (req, res) => {
  const topicId = req.params.id;

  // Perform the delete query
  pool.query('DELETE FROM "Topic" WHERE "TopicID" = $1', [topicId], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('An error occurred while deleting the topic.');
    } else {
      res.status(200).send('Topic deleted successfully.');
    }
  });
});

module.exports = router;
