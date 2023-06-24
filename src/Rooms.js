const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Room:
 *       type: object
 *       properties:
 *         RoomID:
 *           type: integer
 *         RoomName:
 *           type: string
 *         RoomType:
 *           type: string
 *         GPSLoc:
 *           type: object
 *           properties:
 *             lat:
 *               type: number
 *             lon:
 *               type: number
 */

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get all records from the Rooms table
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: Returns all records from the Rooms table
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 */
router.get('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT * FROM "Rooms";';
    const result = await pool.query(query);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/rooms/{roomname}:
 *   get:
 *     security:
 *       - BasicAuth: []
 *     summary: Get a record from the Rooms table by RoomName
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: roomname
 *         required: true
 *         description: Name of the Room
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns the Room record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       404:
 *         description: Room record not found
 */
router.get('/api/rooms/:roomname', authenticateToken, async (req, res) => {
  try {
    const roomname = req.params.roomname;

    const query = 'SELECT * FROM "Rooms" WHERE "RoomName" = $1;';
    const values = [roomname];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Room record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     security:
 *       - BasicAuth: []
 *     summary: Create a new record in the Rooms table
 *     tags: [Rooms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Room'
 *     responses:
 *       201:
 *         description: Returns the created Room record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 */
router.post('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const { RoomName, RoomType, GPSLoc} = req.body;

    const query =
      'INSERT INTO "Rooms" ("RoomName", "RoomType", "GPSLoc") VALUES ($1, $2, point($3, $4)) RETURNING *;';
    const values = [RoomName, RoomType, GPSLoc.lat, GPSLoc.lon];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/rooms/{id}:
 *   put:
 *     security:
 *       - BasicAuth: []
 *     summary: Update a room by RoomID
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The RoomID of the room to update
 *       - in: body
 *         name: room
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             roomName:
 *               type: string
 *             roomType:
 *               type: string
 *             gpsLoc:
 *               type: string
 *         description: The updated room details
 *     responses:
 *       '200':
 *         description: Room updated successfully
 *       '500':
 *         description: An error occurred while updating the room
 */
router.put('/api/rooms/:id', authenticateToken, (req, res) => {
  const roomId = req.params.id;
  const { roomName, roomType, gpsLoc } = req.body;

  // Perform the update query
  pool.query(
    'UPDATE "Rooms" SET "RoomName" = $1, "RoomType" = $2, "GPSLoc" = $3 WHERE "RoomID" = $4',
    [roomName, roomType, gpsLoc, roomId],
    (error, results) => {
      if (error) {
        console.error(error);
        res.status(500).send('An error occurred while updating the room.');
      } else {
        res.status(200).send('Room updated successfully.');
      }
    }
  );
});

/**
 * @swagger
 * /api/rooms/{id}:
 *   delete:
 *     security:
 *       - BasicAuth: []
 *     summary: Delete a room by RoomID
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The RoomID of the room to delete
 *     responses:
 *       '200':
 *         description: Room deleted successfully
 *       '500':
 *         description: An error occurred while deleting the room
 */
router.delete('/api/rooms/:id', authenticateToken, (req, res) => {
  const roomId = req.params.id;

  // Perform the delete query
  pool.query('DELETE FROM "Rooms" WHERE "RoomID" = $1', [roomId], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('An error occurred while deleting the room.');
    } else {
      res.status(200).send('Room deleted successfully.');
    }
  });
});

module.exports = router;
