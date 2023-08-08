const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../authMiddleware');
const { writeToUserLog } = require('./common');

// Swagger documentation for Item API
/**
 * @swagger
 * tags:
 *   name: Items
 *   description: API endpoints for Items
 */

/**
 * @swagger
 * /api/GetItemList:
 *   get:
 *     summary: Get list of items from the Items table for a given compid
 *     tags: [Items]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: query
 *         name: compid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Returns the list of items
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetItemList', authMiddleware, async (req, res) => {
    const { compid } = req.query;
  
    if (!compid) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = `
        SELECT itemid, itemtype, itemname, hsncode
        FROM "Items"
        WHERE compid = $1
      `;
  
      const { rows } = await pool.query(query, [compid]);
  
      return res.status(200).json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
/**
 * @swagger
 * /api/GetItemDetails:
 *   get:
 *     summary: Get item details from the Items table for a given itemid
 *     tags: [Items]
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: query
 *         name: itemid
 *         schema:
 *           type: integer
 *         required: true
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Returns the item details
 *       400:
 *         description: Invalid request or missing parameters
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.get('/api/GetItemDetails', authMiddleware, async (req, res) => {
    const { itemid } = req.query;
  
    if (!itemid) {
      return res.status(400).json({ error: 'Invalid request or missing parameters' });
    }
  
    try {
      const query = `
        SELECT i.itemid, i.itemtype, i.itemname, i.sku, i.hsncode, h.codedesc, i.unitid,
               i.sellprice, i.currencycode, i.taxprefid, i.taxrate, i.isactive
        FROM "Items" i
        LEFT JOIN "HSNSAC" h ON i.hsncode = h.hsncode
        WHERE i.itemid = $1
      `;
  
      const { rows } = await pool.query(query, [itemid]);
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }
  
      const itemDetails = rows[0];
      return res.status(200).json(itemDetails);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
/**
 * @swagger
 * /api/SaveItem:
 *   post:
 *     summary: Update or add an item record in the Items table
 *     tags: [Items]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemid:
 *                 type: integer
 *               compid:
 *                 type: integer
 *               itemtype:
 *                 type: string
 *               itemname:
 *                 type: string
 *               sku:
 *                 type: string
 *               hsncode:
 *                 type: string
 *               unitid:
 *                 type: integer
 *               sellprice:
 *                 type: number
 *               currencycode:
 *                 type: string
 *               taxprefid:
 *                 type: integer
 *               taxrate:
 *                 type: number
 *               isactive:
 *                 type: boolean
 *               userid:
 *                 type: integer
 *               isweb:
 *                 type: boolean
 *             required:
 *               - itemid
 *     responses:
 *       200:
 *         description: Item record updated or added successfully
 *       400:
 *         description: Invalid request or missing parameters
 *       500:
 *         description: Internal server error
 */
router.post('/api/SaveItem', authMiddleware, async (req, res) => {
    const {
      itemid,
      compid,
      itemtype,
      itemname,
      sku,
      hsncode,
      unitid,
      sellprice,
      currencycode,
      taxprefid,
      taxrate,
      isactive,
      userid,
      isweb,
    } = req.body;
  
    //if (!itemid) {
    //  return res.status(400).json({ error: 'Invalid request or missing parameters' });
    //}
  
    try {
      // Check if the item already exists in the database

      const iExists = await pool.query('SELECT * FROM public."Items" WHERE TRIM(itemname) ILIKE $1 and compid = $2', [itemname.trim(), compid]);

      if (iExists.rows.length > 0) {
        await pool.query('UPDATE "Items" SET itemtype = $2, itemname = $3, sku = $4, hsncode = $5, unitid = $6, sellprice = $7, currencycode = $8, taxprefid = $9, taxrate = $10, isactive = $11, userid = $12, updon = NOW() WHERE TRIM(itemname) ILIKE $3 and compid = $1', [compid, itemtype, itemname.trim(), sku, hsncode, unitid, sellprice, currencycode, taxprefid, taxrate, isactive, userid]);
        res.status(201).json({ message: 'Item updated successfully' });
        writeToUserLog(userid, 'Updated Item - '+itemname, compid, isweb);
        return res.status(200).json({ message: 'Item record updated successfully' });
      } else {
        if (itemid > 0) {
            const checkQuery = `
                SELECT COUNT(*) AS count FROM "Items" WHERE itemid = $1
            `;
        
            const checkResult = await pool.query(checkQuery, [itemid]);
            const itemExists = checkResult.rows[0].count > 0;
        
            if (itemExists) {
                // Update the existing item
                const updateQuery = `
                UPDATE "Items"
                SET
                    itemtype = $2,
                    itemname = $3,
                    sku = $4,
                    hsncode = $5,
                    unitid = $6,
                    sellprice = $7,
                    currencycode = $8,
                    taxprefid = $9,
                    taxrate = $10,
                    isactive = $11,
                    updon = NOW() 
                WHERE itemid = $1
                `;
        
                await pool.query(updateQuery, [
                itemid,
                itemtype,
                itemname,
                sku,
                hsncode,
                unitid,
                sellprice,
                currencycode,
                taxprefid,
                taxrate,
                isactive,
                ]);
                writeToUserLog(userid, 'Updated Item - '+itemid.toString(), compid, isweb);
                return res.status(200).json({ message: 'Item record updated successfully' });
              } else {
                // Add a new item if itemid=0
                const insertQuery = `
                INSERT INTO "Items" ( itemtype, itemname, sku, hsncode, unitid, sellprice, currencycode, taxprefid, taxrate, isactive, compid, userid)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `;
        
                await pool.query(insertQuery, [
                itemtype,
                itemname,
                sku,
                hsncode,
                unitid,
                sellprice,
                currencycode,
                taxprefid,
                taxrate,
                isactive,
                compid,
                userid,
                ]);
            }
            writeToUserLog(userid, 'Created Item - '+itemname, compid, isweb);
            return res.status(200).json({ message: 'Item record added successfully' });
          } else {
            // Add a new item
        const insertQuery1 = `
            INSERT INTO "Items" ( itemtype, itemname, sku, hsncode, unitid, sellprice, currencycode, taxprefid, taxrate, isactive, compid, userid)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `;

        await pool.query(insertQuery1, [
        itemtype,
        itemname,
        sku,
        hsncode,
        unitid,
        sellprice,
        currencycode,
        taxprefid,
        taxrate,
        isactive,
        compid,
        userid,
        ]);
      }
      writeToUserLog(userid, 'Created Item - '+itemname, compid, isweb);
      return res.status(200).json({ message: 'Item record added successfully' });
    }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
module.exports = router;