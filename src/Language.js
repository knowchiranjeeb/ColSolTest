const express = require('express');
const pool = require('../db'); // Import the database connection
const authMiddleware = require('../authMiddleware'); // Import the authentication middleware
const router = express.Router();
const { writeToUserLog } = require('./common');

/**
 * @swagger
 * tags:
 *   name: Language
 *   description: API endpoints for Language
 */

/**
 * @swagger
 * /api/GetLang:
 *   get:
 *     summary: Get all Languages
 *     tags: [Language]
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all Languages
 *       500:
 *         description: An error occurred while retrieving the Languages
 */
router.get('/api/GetLang', authMiddleware, async (req, res) => {
  try {
    const languages = await pool.query('SELECT * FROM public."Language"');
    res.status(200).json(languages.rows);
  } catch (error) {
    console.error('Error retrieving Languages:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Languages' });
  }
});

/**
 * @swagger
 * /api/languages/{langcode}:
 *   get:
 *     summary: Get a single Language by langcode
 *     tags: [Language]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: langcode
 *         schema:
 *           type: string
 *         required: true
 *         description: Language Code
 *     responses:
 *       200:
 *         description: Successfully retrieved the Language
 *       404:
 *         description: Language not found
 *       500:
 *         description: An error occurred while retrieving the Language
 */
router.get('/api/languages/:langcode', authMiddleware, async (req, res) => {
  const { langcode } = req.params;

  try {
    const language = await pool.query('SELECT * FROM public."Language" WHERE langcode = $1', [langcode]);

    if (language.rows.length === 0) {
      res.status(404).json({ error: 'Language not found' });
    } else {
      res.status(200).json(language.rows[0]);
    }
  } catch (error) {
    console.error('Error retrieving Language:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the Language' });
  }
});

/**
 * @swagger
 * /api/languages/{langcode}:
 *   delete:
 *     summary: Delete a Language by langcode
 *     tags: [Language]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: langcode
 *         schema:
 *           type: string
 *         required: true
 *         description: Language Code
 *     responses:
 *       204:
 *         description: Language deleted successfully
 *       404:
 *         description: Language not found
 *       500:
 *         description: An error occurred while deleting the Language
 */
router.delete('/api/languages/:langcode', authMiddleware, async (req, res) => {
  const { langcode } = req.params;

  try {
    const deleteResult = await pool.query('DELETE FROM public."Language" WHERE langcode = $1', [langcode]);

    if (deleteResult.rowCount > 0) {
      res.sendStatus(204);
    } else {
      res.status(404).json({ error: 'Language not found' });
    }
  } catch (error) {
    console.error('Error deleting Language:', error);
    res.status(500).json({ error: 'An error occurred while deleting the Language' });
  }
});

/**
 * @swagger
 * /api/SaveLanguage:
 *   post:
 *     summary: Create or update a Language
 *     tags: [Language]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               langcode:
 *                 type: string
 *               language:
 *                 type: string
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Language created or updated successfully
 *       500:
 *         description: An error occurred while creating or updating the Language
 */
router.post('/api/SaveLanguage', authMiddleware, async (req, res) => {
  const { langcode, language, userid, isweb } = req.body;

  try {
    const languageExists = await pool.query('SELECT * FROM public."Language" WHERE TRIM(langcode) ILIKE $1', [langcode]);
    const compid=0;

    if (languageExists.rows.length > 0) {
      await pool.query('UPDATE public."Language" SET language = $1 WHERE TRIM(langcode) ILIKE $2', [language, langcode]);
      res.status(201).json({ message: 'Language updated successfully' });
      writeToUserLog(userid, 'Updated Language - '+language, compid, isweb);
    } else {
      await pool.query('INSERT INTO public."Language" (langcode, language) VALUES ($1, $2)', [langcode, language]);
      res.status(201).json({ message: 'Language created successfully' });
      writeToUserLog(userid, 'Created Language - '+language, compid, isweb);
    }
  } catch (error) {
    console.error('Error creating or updating Language:', error);
    res.status(500).json({ error: 'An error occurred while creating or updating the Language' });
  }
});

module.exports = router;
