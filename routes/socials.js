import express from 'express';
import { executeQuery } from '../config/database.js';
import Logger from '../utils/logger.js';
import { handleError } from '../utils/errorHandler.js';

const router = express.Router();

// Get all social links
router.get('/', async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT id, name, icon_url, url, is_active, sort_order, created_at, updated_at
      FROM social_media 
      ORDER BY sort_order ASC, created_at DESC
    `);
    if (result.success) {
      const socials = result.data.map(s => ({
        ...s,
        is_active: !!s.is_active
      }));
      res.json({ success: true, data: socials });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    return handleError(error, res, "Failed to retrieve social media links", 500);
  }
});

// Create new social link
router.post('/', async (req, res) => {
  const { name, icon_url, url, is_active, sort_order } = req.body;
  
  if (!url || !icon_url) {
    return res.status(400).json({ success: false, message: 'URL and Icon are required' });
  }

  try {
    const query = `
      INSERT INTO social_media (name, icon_url, url, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      name || '', 
      icon_url, 
      url, 
      is_active ? 1 : 0, 
      sort_order || 0
    ];
    
    const result = await executeQuery(query, params);
    
    if (result.success) {
      res.json({ success: true, data: { id: result.data.insertId, ...req.body } });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    return handleError(error, res, "Failed to create social media link", 500);
  }
});

// Update social link
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, icon_url, url, is_active, sort_order } = req.body;

  try {
    const query = `
      UPDATE social_media 
      SET name = ?, icon_url = ?, url = ?, is_active = ?, sort_order = ?
      WHERE id = ?
    `;
    const params = [
      name || '', 
      icon_url, 
      url, 
      is_active ? 1 : 0, 
      sort_order || 0,
      id
    ];

    const result = await executeQuery(query, params);
    
    if (result.success) {
      res.json({ success: true, message: 'Social link updated successfully' });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    return handleError(error, res, "Failed to update social media link", 500);
  }
});

// Delete social link
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await executeQuery('DELETE FROM social_media WHERE id = ?', [id]);
    
    if (result.success) {
      res.json({ success: true, message: 'Social link deleted successfully' });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    return handleError(error, res, "Failed to delete social media link", 500);
  }
});

// Toggle status
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  try {
    const result = await executeQuery(
      'UPDATE social_media SET is_active = ? WHERE id = ?',
      [is_active ? 1 : 0, id]
    );

    if (result.success) {
      res.json({ success: true, message: 'Status updated successfully' });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    return handleError(error, res, "Failed to update social media link status", 500);
  }
});

export default router;

