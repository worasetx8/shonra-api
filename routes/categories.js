import express from "express";
import { executeQuery } from "../config/database.js";
import { formatResponse } from "../utils/helpers.js";
import { requireAuth } from "./auth.js";
import { sanitizeObject } from "../utils/sanitize.js";
import Logger from "../utils/logger.js";
import { handleErrorWithFormat } from "../utils/errorHandler.js";
import { rateLimiter } from "../middleware/rateLimiter.js";
import { validateRequest } from "../middleware/requestValidator.js";
import { clearCategoryCache } from "./products.js";

const router = express.Router();

// Get allowed origins and referers from environment
const allowedOrigins = process.env.CLIENT_URL 
  ? [process.env.CLIENT_URL, "http://localhost:3000"]
  : ["http://localhost:3000"];

const allowedReferers = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, "http://localhost:3000"]
  : ["http://localhost:3000"];

// Get all categories (public endpoint for client)
// Apply rate limiting and request validation
router.get("/public", 
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 30 }), // 30 requests per minute
  validateRequest({
    allowedOrigins,
    requireReferer: process.env.NODE_ENV === 'production', // Only require in production
    allowedReferers,
    allowNoReferer: true // Allow direct browser access
  }),
  async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id, c.name, c.is_active, c.created_at, c.updated_at,
        COUNT(sp.id) as product_count 
      FROM categories c 
      LEFT JOIN shopee_products sp ON c.id = sp.category_id AND sp.status = 'active'
      WHERE c.is_active = 1
      GROUP BY c.id 
      ORDER BY c.name ASC
    `;
    const result = await executeQuery(query);

    if (result.success) {
      res.json(formatResponse(true, result.data, "Categories retrieved successfully"));
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    return handleErrorWithFormat(error, res, "Failed to retrieve categories", 500, formatResponse);
  }
});

// Get all categories (admin endpoint)
router.get("/", requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id, c.name, c.is_active, c.created_at, c.updated_at,
        COUNT(sp.id) as product_count 
      FROM categories c 
      LEFT JOIN shopee_products sp ON c.id = sp.category_id 
      GROUP BY c.id 
      ORDER BY c.name ASC
    `;
    const result = await executeQuery(query);

    if (result.success) {
      res.json(formatResponse(true, result.data, "Categories retrieved successfully"));
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    return handleErrorWithFormat(error, res, "Failed to retrieve categories", 500, formatResponse);
  }
});

// Create new category
router.post("/", requireAuth, async (req, res) => {
  try {
    // Sanitize input
    req.body = sanitizeObject(req.body);
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json(formatResponse(false, null, "Category name is required"));
    }

    const result = await executeQuery(
      "INSERT INTO categories (name, is_active) VALUES (?, 1)",
      [name.trim()]
    );

    if (result.success) {
      clearCategoryCache();
      res.status(201).json(formatResponse(true, { id: result.data.insertId, name, is_active: 1 }, "Category created successfully"));
    } else {
      if (result.error && result.error.includes("Duplicate entry")) {
        return res.status(409).json(formatResponse(false, null, "Category name already exists"));
      }
      throw new Error(result.error);
    }
  } catch (error) {
    return handleErrorWithFormat(error, res, "Failed to create category", 500, formatResponse);
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage = isDevelopment ? error.message : "Failed to create category. Please try again.";
    res.status(500).json(formatResponse(false, null, "Failed to create category", errorMessage));
  }
});

// Update category (Name)
router.put("/:id", requireAuth, async (req, res) => {
  try {
    // Sanitize input
    req.body = sanitizeObject(req.body);
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json(formatResponse(false, null, "Category name is required"));
    }

    const result = await executeQuery(
      "UPDATE categories SET name = ? WHERE id = ?",
      [name.trim(), id]
    );

    if (result.success) {
      clearCategoryCache();
      res.json(formatResponse(true, { id, name }, "Category updated successfully"));
    } else {
      if (result.error && result.error.includes("Duplicate entry")) {
        return res.status(409).json(formatResponse(false, null, "Category name already exists"));
      }
      throw new Error(result.error);
    }
  } catch (error) {
    return handleErrorWithFormat(error, res, "Failed to update category", 500, formatResponse);
  }
});

// Update category status (Active/Inactive)
router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    // Sanitize input
    req.body = sanitizeObject(req.body);
    const { id } = req.params;
    const { is_active } = req.body;

    // If setting to inactive (false), we might want to check for products, 
    // but the requirement says "modal must force user to reassign...". 
    // The frontend should check this count first via another endpoint or the list data.
    // However, for safety, let's check if there are products when deactivating.
    // If 'force' is not true (or handled by logic), we return specific info.
    // Actually, the frontend will just handle the reassignment logic FIRST, then call this.
    // So if we receive a deactivate request, we assume the user has cleared the category or is allowed to deactivate.
    // But to be safe and support the UI flow, let's check.

    if (is_active === false) {
        const checkResult = await executeQuery(
            "SELECT COUNT(*) as count FROM shopee_products WHERE category_id = ?",
            [id]
        );
        
        if (checkResult.success && checkResult.data[0].count > 0) {
            // Return a specific code or message so frontend knows to show the modal
            // if frontend didn't check beforehand.
            return res.json(formatResponse(false, { hasProducts: true, count: checkResult.data[0].count }, "Category has assigned products. Please reassign them first."));
        }
    }

    const result = await executeQuery(
      "UPDATE categories SET is_active = ? WHERE id = ?",
      [is_active ? 1 : 0, id]
    );

    if (result.success) {      clearCategoryCache();      res.json(formatResponse(true, { id, is_active }, "Category status updated successfully"));
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    return handleErrorWithFormat(error, res, "Failed to update category status", 500, formatResponse);
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage = isDevelopment ? error.message : "Failed to update category status. Please try again.";
    res.status(500).json(formatResponse(false, null, "Failed to update category status", errorMessage));
  }
});

// Delete category
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if any products are linked to this category
    const checkResult = await executeQuery(
      "SELECT COUNT(*) as count FROM shopee_products WHERE category_id = ?",
      [id]
    );

    if (checkResult.success && checkResult.data[0].count > 0) {
      return res.status(400).json(formatResponse(false, null, "Cannot delete category because it has assigned products"));
    }

    const result = await executeQuery(
      "DELETE FROM categories WHERE id = ?",
      [id]
    );

    if (result.success) {
      clearCategoryCache();
      res.json(formatResponse(true, null, "Category deleted successfully"));
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    return handleErrorWithFormat(error, res, "Failed to delete category", 500, formatResponse);
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage = isDevelopment ? error.message : "Failed to delete category. Please try again.";
    res.status(500).json(formatResponse(false, null, "Failed to delete category", errorMessage));
  }
});

// Get products by category
router.get("/:id/products", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      "SELECT item_id, product_name, image_url, price, status FROM shopee_products WHERE category_id = ? ORDER BY product_name ASC",
      [id]
    );

    if (result.success) {
      res.json(formatResponse(true, result.data, "Category products retrieved successfully"));
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    return handleErrorWithFormat(error, res, "Failed to retrieve category products", 500, formatResponse);
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage = isDevelopment ? error.message : "Failed to retrieve category products. Please try again.";
    res.status(500).json(formatResponse(false, null, "Failed to retrieve category products", errorMessage));
  }
});

// Get unassigned products (for assigning to category)
router.get("/products/unassigned", requireAuth, async (req, res) => {
  try {
    const result = await executeQuery(
      "SELECT item_id, product_name, image_url, price, status FROM shopee_products WHERE category_id IS NULL ORDER BY product_name ASC"
    );

    if (result.success) {
      res.json(formatResponse(true, result.data, "Unassigned products retrieved successfully"));
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    return handleErrorWithFormat(error, res, "Failed to retrieve unassigned products", 500, formatResponse);
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage = isDevelopment ? error.message : "Failed to retrieve unassigned products. Please try again.";
    res.status(500).json(formatResponse(false, null, "Failed to retrieve unassigned products", errorMessage));
  }
});

// Unassign products (set category_id to NULL)
router.post("/unassign", requireAuth, async (req, res) => {
  try {
    // Sanitize input
    req.body = sanitizeObject(req.body);
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json(formatResponse(false, null, "No products selected"));
    }

    const placeholders = productIds.map(() => '?').join(',');
    const query = `UPDATE shopee_products SET category_id = NULL WHERE item_id IN (${placeholders})`;
    
    const result = await executeQuery(query, productIds);

    if (result.success) {
      res.json(formatResponse(true, { updated: result.data.affectedRows }, "Products unassigned successfully"));
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    return handleErrorWithFormat(error, res, "Failed to unassign products", 500, formatResponse);
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage = isDevelopment ? error.message : "Failed to unassign products. Please try again.";
    res.status(500).json(formatResponse(false, null, "Failed to unassign products", errorMessage));
  }
});

// Assign products to category
router.post("/:id/assign", requireAuth, async (req, res) => {
  try {
    // Sanitize input
    req.body = sanitizeObject(req.body);
    const { id } = req.params;
    const { productIds } = req.body; // Array of item_ids

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json(formatResponse(false, null, "No products selected"));
    }

    // Using IN clause with parameterized query is tricky with executeQuery wrapper if it doesn't support array directly
    // We'll construct the query manually with placeholders
    const placeholders = productIds.map(() => '?').join(',');
    const query = `UPDATE shopee_products SET category_id = ? WHERE item_id IN (${placeholders})`;
    
    const result = await executeQuery(query, [id, ...productIds]);

    if (result.success) {
      res.json(formatResponse(true, { updated: result.data.affectedRows }, "Products assigned successfully"));
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    return handleErrorWithFormat(error, res, "Failed to assign products", 500, formatResponse);
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage = isDevelopment ? error.message : "Failed to assign products. Please try again.";
    res.status(500).json(formatResponse(false, null, "Failed to assign products", errorMessage));
  }
});

// Remove product from category (set category_id to NULL)
router.post("/:id/remove-product", requireAuth, async (req, res) => {
    try {
      // Sanitize input
      req.body = sanitizeObject(req.body);
      const { id } = req.params;
      const { itemId } = req.body;
  
      if (!itemId) {
        return res.status(400).json(formatResponse(false, null, "Item ID is required"));
      }
  
      const result = await executeQuery(
        "UPDATE shopee_products SET category_id = NULL WHERE item_id = ? AND category_id = ?",
        [itemId, id]
      );
  
      if (result.success) {
        res.json(formatResponse(true, { updated: result.data.affectedRows }, "Product removed from category successfully"));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      return handleErrorWithFormat(error, res, "Failed to remove product from category", 500, formatResponse);
      const isDevelopment = process.env.NODE_ENV === "development";
      const errorMessage = isDevelopment ? error.message : "Failed to remove product from category. Please try again.";
      res.status(500).json(formatResponse(false, null, "Failed to remove product from category", errorMessage));
    }
  });

// Bulk move products from one category to another
router.post("/:id/move-products", requireAuth, async (req, res) => {
    try {
        // Sanitize input
        req.body = sanitizeObject(req.body);
        const { id } = req.params; // Source Category ID
        const { targetCategoryId } = req.body;

        if (!targetCategoryId) {
            return res.status(400).json(formatResponse(false, null, "Target category ID is required"));
        }

        const result = await executeQuery(
            "UPDATE shopee_products SET category_id = ? WHERE category_id = ?",
            [targetCategoryId, id]
        );

        if (result.success) {
            res.json(formatResponse(true, { updated: result.data.affectedRows }, "Products moved successfully"));
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        return handleErrorWithFormat(error, res, "Failed to move products", 500, formatResponse);
        const isDevelopment = process.env.NODE_ENV === "development";
        const errorMessage = isDevelopment ? error.message : "Failed to move products. Please try again.";
        res.status(500).json(formatResponse(false, null, "Failed to move products", errorMessage));
    }
});

export default router;
