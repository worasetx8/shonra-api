import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in server directory
dotenv.config({ path: path.join(__dirname, ".env") });

// Also try loading from parent directory (for development)
if (!process.env.DB_HOST && !process.env.DB_PASSWORD) {
  dotenv.config({ path: path.join(__dirname, "..", ".env") });
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "shopee_affiliate",
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+07:00", // Set timezone to Thailand (GMT+7)
  dateStrings: false, // Keep as Date objects, not strings
  // Connection timeout (valid option for mysql2)
  connectTimeout: 10000 // 10 seconds
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection function
export async function testConnection() {
  try {
    const Logger = (await import("../utils/logger.js")).default;
    
    // Debug: Show database configuration (without password)
    Logger.debug("Database Configuration:", {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port,
      password: dbConfig.password ? '***SET***' : '***NOT SET***'
    });
    
    const connection = await pool.getConnection();
    Logger.success("Database connected successfully!");
    connection.release();
    return true;
  } catch (error) {
    const Logger = (await import("../utils/logger.js")).default;
    
    // Enhanced error logging
    Logger.error("Database connection failed!", {
      code: error.code || 'UNKNOWN',
      message: error.message || 'No error message'
    });
    
    // Common error messages
    if (error.code === 'ECONNREFUSED') {
      Logger.warn("💡 Suggestion: MySQL server might not be running. Please start MySQL service.");
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      Logger.warn("💡 Suggestion: Database credentials are incorrect. Check DB_USER and DB_PASSWORD.");
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      Logger.warn("💡 Suggestion: Database does not exist. Check DB_NAME or create the database.");
    } else if (error.code === 'ETIMEDOUT') {
      Logger.warn("💡 Suggestion: Connection timeout. Check DB_HOST and network connectivity.");
    }
    
    return false;
  }
}

// Execute query function
export async function executeQuery(query, params = []) {
  try {
    // Debug logging (only when DEBUG_SQL=true)
    const isDevelopment = process.env.NODE_ENV === "development";
    const debugSql = process.env.DEBUG_SQL === "true";
    
    if (isDevelopment && debugSql) {
      const Logger = (await import("../utils/logger.js")).default;
      Logger.sql({
        query: query.trim().substring(0, 200) + (query.length > 200 ? "..." : ""),
        params,
        paramsTypes: params.map((p) => typeof p),
        paramsLength: params.length
      });
    }

    // Ensure all parameters are properly typed
    const sanitizedParams = params.map((param) => {
      if (param === null || param === undefined) {
        return null;
      }
      if (typeof param === "string") {
        return param;
      }
      if (typeof param === "number" && !isNaN(param)) {
        return param;
      }
      if (typeof param === "boolean") {
        return param ? 1 : 0;
      }
      return String(param);
    });

    // Get connection from pool
    const connection = await pool.getConnection();
    try {
      // Set timezone for this connection to ensure CURRENT_TIMESTAMP uses correct timezone
      await connection.execute("SET time_zone = '+07:00'");
      
      // Execute the actual query
      const [results] = await connection.execute(query, sanitizedParams);
      return { success: true, data: results };
    } finally {
      // Always release connection back to pool
      connection.release();
    }
  } catch (error) {
    // Don't log duplicate entry errors as they are often expected validation failures
    if (error.code !== 'ER_DUP_ENTRY') {
        const Logger = (await import("../utils/logger.js")).default;
        Logger.error("Database query error:", {
          message: error.message,
          code: error.code,
          query: query.substring(0, 200) + (query.length > 200 ? "..." : ""),
          paramsCount: params.length
        });
    }
    return { success: false, error: error.message };
  }
}

// Initialize database and create tables if they don't exist
export async function initializeDatabase() {
  // Set timezone for this session
  const setTimezone = `SET time_zone = '+07:00'`;

  const createProductsTable = `
    CREATE TABLE IF NOT EXISTS shopee_products (
      id INT PRIMARY KEY AUTO_INCREMENT,
      item_id VARCHAR(50) UNIQUE NOT NULL,
      product_name TEXT NOT NULL,
      shop_name VARCHAR(255),
      shop_id VARCHAR(50),
      
      price DECIMAL(10,2),
      price_min DECIMAL(10,2),
      price_max DECIMAL(10,2),
      
      commission_rate DECIMAL(5,4),
      seller_commission_rate DECIMAL(5,4),
      shopee_commission_rate DECIMAL(5,4),
      commission_amount DECIMAL(10,2),
      
      image_url TEXT,
      product_link TEXT,
      offer_link TEXT,
      
      rating_star DECIMAL(2,1),
      sales_count INT DEFAULT 0,
      discount_rate DECIMAL(5,2),
      
      period_start_time BIGINT,
      period_end_time BIGINT,
      campaign_active BOOLEAN DEFAULT TRUE,
      
      status ENUM('active', 'inactive') DEFAULT 'active',
      notes TEXT,
      
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;

  // Create admin_users table
  const createAdminUsersTable = `
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'super_admin', 'manager', 'editor') DEFAULT 'admin',
      full_name VARCHAR(100),
      email VARCHAR(100),
      is_active BOOLEAN DEFAULT TRUE,
      last_login_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;

  try {
    // Set timezone first (suppress debug logging for initialization)
    const originalDebugSql = process.env.DEBUG_SQL;
    process.env.DEBUG_SQL = "false";
    
    const Logger = (await import("../utils/logger.js")).default;
    
    await executeQuery(setTimezone);
    Logger.success("Timezone set to +07:00 (Asia/Bangkok)!");

    await executeQuery(createProductsTable);
    Logger.success("Products table initialized successfully!");

    await executeQuery(createAdminUsersTable);
    Logger.success("Admin users table initialized successfully!");

    // Create category_keywords table if not exists
    const createCategoryKeywordsTable = `
      CREATE TABLE IF NOT EXISTS category_keywords (
        id INT PRIMARY KEY AUTO_INCREMENT,
        category_id INT NOT NULL,
        keyword VARCHAR(255) NOT NULL,
        is_high_priority BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE KEY unique_category_keyword (category_id, keyword)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    try {
      await executeQuery(createCategoryKeywordsTable);
      const Logger2 = (await import("../utils/logger.js")).default;
      Logger2.success("Category keywords table initialized successfully!");
    } catch (error) {
      // If categories table doesn't exist yet, this will fail - that's okay
      const Logger2 = (await import("../utils/logger.js")).default;
      Logger2.warn("Category keywords table creation skipped (categories table may not exist yet)");
    }

    // Create default admin user if not exists
    await createDefaultAdmin();
    
    // Restore debug setting
    if (originalDebugSql !== undefined) {
      process.env.DEBUG_SQL = originalDebugSql;
    } else {
      delete process.env.DEBUG_SQL;
    }

    return true;
  } catch (error) {
    const Logger = (await import("../utils/logger.js")).default;
    Logger.error("Failed to initialize database:", error);
    // Restore debug setting even on error
    if (originalDebugSql !== undefined) {
      process.env.DEBUG_SQL = originalDebugSql;
    } else {
      delete process.env.DEBUG_SQL;
    }
    return false;
  }
}

// Create default admin user with hashed password
async function createDefaultAdmin() {
  try {
    // Check if any admin user exists
    const checkResult = await executeQuery("SELECT COUNT(*) as count FROM admin_users");

    if (checkResult.success && checkResult.data[0].count === 0) {
      // Hash the default password using Node.js built-in crypto
      const crypto = await import("crypto");
      const defaultPassword = "admin123";
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.pbkdf2Sync(defaultPassword, salt, 10000, 64, "sha512").toString("hex");
      const passwordHash = `${salt}:${hash}`;

      await executeQuery(
        `
        INSERT INTO admin_users (username, password_hash, role, full_name, email) 
        VALUES (?, ?, ?, ?, ?)
      `,
        ["admin", passwordHash, "super_admin", "System Administrator", "admin@example.com"]
      );

      const Logger = (await import("../utils/logger.js")).default;
      Logger.success("Default super admin user created successfully!");
      Logger.info("   Username: admin");
      Logger.info("   Password: admin123");
      Logger.info("   Role: super_admin");
    }
  } catch (error) {
    const Logger = (await import("../utils/logger.js")).default;
    Logger.error("Failed to create default admin:", error);
  }
}

export default pool;
