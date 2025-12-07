import express from "express";
import { strictRateLimit } from "../middleware/rateLimiter.js";
import { executeQuery } from "../config/database.js";
import { verifyPassword, createSession, getSession, deleteSession, hashPassword } from "../utils/auth.js";
import { formatResponse, validateRequiredFields } from "../utils/helpers.js";
import Logger from "../utils/logger.js";
import { handleErrorWithFormat } from "../utils/errorHandler.js";

const router = express.Router();

// Login endpoint with rate limiting
router.post("/login", strictRateLimit(), async (req, res) => {
  try {
    const { username, password } = req.body;

    const missing = validateRequiredFields(req.body, ["username", "password"]);
    if (missing.length > 0) {
      return res.status(400).json(formatResponse(false, null, `Missing required fields: ${missing.join(", ")}`));
    }

    // Find user in database with role info
    const userResult = await executeQuery(`
      SELECT u.id, u.username, u.password, u.password_hash, u.full_name, u.email, u.status, u.role_id, r.name as role_name 
      FROM admin_users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.username = ?
    `, [username]);

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(401).json(formatResponse(false, null, "Invalid username or password"));
    }

    const user = userResult.data[0];

    // Check if user is active
    if (user.status !== "active") {
      return res.status(401).json(formatResponse(false, null, "Account is disabled"));
    }

    // Check if password_hash is null (force password change scenario)
    if (!user.password_hash) {
      // Return special response code to indicate force password change
      // We'll create a temporary session for password change
      const tempUserData = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role_id: user.role_id,
        role: user.role_name || 'Viewer',
        permissions: [],
        requiresPasswordChange: true
      };
      
      const tempSessionToken = createSession(user.id, tempUserData);
      
      return res.status(403).json(
        formatResponse(
          false,
          {
            requiresPasswordChange: true,
            token: tempSessionToken,
            user: tempUserData
          },
          "Password change required. Please set a new password."
        )
      );
    }

    const isValidPassword = verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      // Increment failed login attempts (if column exists)
      // await executeQuery("UPDATE admin_users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?", [user.id]);
      return res.status(401).json(formatResponse(false, null, "Invalid username or password"));
    }

    // Reset failed attempts on success
    // await executeQuery("UPDATE admin_users SET failed_login_attempts = 0 WHERE id = ?", [user.id]);

    // Fetch Permissions
    let permissions = [];
    if (user.role_id) {
        const permRes = await executeQuery(`
            SELECT p.slug 
            FROM permissions p 
            JOIN role_permissions rp ON p.id = rp.permission_id 
            WHERE rp.role_id = ?
        `, [user.role_id]);
        if (permRes.success) {
            permissions = permRes.data.map(p => p.slug);
        }
    }

    // Create session
    const userData = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role_id: user.role_id,
      role: user.role_name || 'Viewer', // Fallback role name
      permissions
    };

    const sessionToken = createSession(user.id, userData);

    res.json(
      formatResponse(
        true,
        {
          user: userData,
          token: sessionToken
        },
        "Login successful"
      )
    );
  } catch (error) {
    Logger.error("Login error:", error);
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage = isDevelopment ? error.message : "Login failed. Please try again.";
    res.status(500).json(formatResponse(false, null, "Login failed", errorMessage));
  }
});

// Logout endpoint
router.post("/logout", (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      deleteSession(token);
    }

    res.json(formatResponse(true, null, "Logout successful"));
  } catch (error) {
    Logger.error("Logout error:", error);
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage = isDevelopment ? error.message : "Logout failed. Please try again.";
    res.status(500).json(formatResponse(false, null, "Logout failed", errorMessage));
  }
});

// Get current user info
router.get("/me", (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json(formatResponse(false, null, "No token provided"));
    }

    const session = getSession(token);
    if (!session) {
      return res.status(401).json(formatResponse(false, null, "Invalid or expired session"));
    }

    res.json(formatResponse(true, session.userData, "User info retrieved successfully"));
  } catch (error) {
    return handleErrorWithFormat(error, res, "Failed to retrieve user information", 500, formatResponse);
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage = isDevelopment ? error.message : "Failed to retrieve user information.";
    res.status(500).json(formatResponse(false, null, "Failed to get user info", errorMessage));
  }
});

// Change password endpoint (for logged-in users)
router.put("/change-password", requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Validate new password is required
    if (!newPassword) {
      return res.status(400).json(formatResponse(false, null, "New password is required"));
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json(formatResponse(false, null, "New password must be at least 6 characters"));
    }

    const userId = req.user.id;

    // Get current user from database
    const userResult = await executeQuery(`
      SELECT id, password_hash 
      FROM admin_users 
      WHERE id = ?
    `, [userId]);

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json(formatResponse(false, null, "User not found"));
    }

    const user = userResult.data[0];

    // If password_hash is null, this is a force password change scenario
    // In this case, we skip old password verification (oldPassword is not required)
    if (user.password_hash) {
      // Normal password change - old password is required
      if (!oldPassword) {
        return res.status(400).json(formatResponse(false, null, "Current password is required"));
      }
      
      // Verify old password
      const isValidOldPassword = verifyPassword(oldPassword, user.password_hash);
      if (!isValidOldPassword) {
        return res.status(401).json(formatResponse(false, null, "Current password is incorrect"));
      }
    }
    // If password_hash is null, skip old password verification (force change)

    // Hash new password
    const newPasswordHash = hashPassword(newPassword);

    // Update password
    const updateResult = await executeQuery(
      "UPDATE admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newPasswordHash, userId]
    );

    if (updateResult.success && updateResult.data.affectedRows > 0) {
      res.json(formatResponse(true, null, "Password changed successfully"));
    } else {
      throw new Error("Failed to update password");
    }
  } catch (error) {
    return handleErrorWithFormat(error, res, "Failed to change password", 500, formatResponse);
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage = isDevelopment ? error.message : "Failed to change password. Please try again.";
    res.status(500).json(formatResponse(false, null, "Failed to change password", errorMessage));
  }
});

// Middleware to check authentication
export function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json(formatResponse(false, null, "Authentication required"));
    }

    const session = getSession(token);
    if (!session) {
      return res.status(401).json(formatResponse(false, null, "Invalid or expired session"));
    }

    req.user = session.userData;
    next();
  } catch (error) {
    Logger.error("Auth middleware error:", error);
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage = isDevelopment ? error.message : "Authentication error. Please login again.";
    res.status(500).json(formatResponse(false, null, "Authentication error", errorMessage));
  }
}

export default router;
