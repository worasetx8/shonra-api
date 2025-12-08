import { executeQuery } from '../../config/database.js';

/**
 * Migration: Ensure All Tables Exist
 * This migration checks and creates all required tables if they don't exist
 * Useful for production databases that may be missing some tables
 * 
 * This should run FIRST before other migrations to ensure all base tables exist
 */
async function migrateEnsureAllTables() {
  try {
    console.log('🚀 Starting ensure all tables migration...');

    // Get database name
    const dbResult = await executeQuery("SELECT DATABASE() as db");
    const actualDbName = dbResult.data && dbResult.data[0] 
      ? (dbResult.data[0].db || dbResult.data[0].DB || process.env.DB_NAME || "shopee_affiliate")
      : (process.env.DB_NAME || "shopee_affiliate");
    console.log(`📊 Database: ${actualDbName}\n`);

    // Check existing tables
    const tablesResult = await executeQuery(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
      [actualDbName]
    );
    
    // Handle both lowercase and uppercase column names (MySQL version differences)
    const existingTables = new Set(
      (tablesResult.data || []).map(t => {
        const tableName = t.table_name || t.TABLE_NAME;
        return tableName ? tableName.toLowerCase() : null;
      }).filter(Boolean)
    );
    
    console.log(`📋 Found ${existingTables.size} existing tables\n`);

    let createdCount = 0;
    let skippedCount = 0;

    // 1. Create admin_users table (if not exists)
    if (!existingTables.has('admin_users')) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NULL,
          password_hash VARCHAR(255) NULL,
          role_id INT NULL,
          full_name VARCHAR(100),
          email VARCHAR(100),
          status ENUM('active', 'inactive') DEFAULT 'active',
          failed_login_attempts INT DEFAULT 0,
          locked_until TIMESTAMP NULL,
          last_login_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created admin_users table');
      createdCount++;
    } else {
      console.log('⏭️  admin_users table already exists');
      skippedCount++;
    }

    // 2. Create settings table
    if (!existingTables.has('settings')) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS settings (
          id INT PRIMARY KEY DEFAULT 1,
          website_name VARCHAR(255),
          logo_url LONGTEXT NULL,
          logo_backend_url LONGTEXT NULL,
          logo_client_url LONGTEXT NULL,
          maintenance_mode BOOLEAN DEFAULT FALSE,
          maintenance_bypass_token VARCHAR(255) DEFAULT NULL,
          version VARCHAR(20) DEFAULT 'v1.0.0',
          min_search_results INT DEFAULT 10 COMMENT 'Minimum search results before querying Shopee API',
          min_commission_rate DECIMAL(5,2) DEFAULT 10.00 COMMENT 'Minimum commission rate percentage for Shopee search',
          min_rating_star DECIMAL(2,1) DEFAULT 4.5 COMMENT 'Minimum rating star for Shopee search',
          site_url VARCHAR(255) DEFAULT 'https://shonra.com' COMMENT 'Website URL for SEO',
          sitemap_url VARCHAR(255) DEFAULT 'https://shonra.com/sitemap.xml' COMMENT 'Sitemap XML location',
          meta_description TEXT NULL COMMENT 'Default meta description for SEO',
          meta_keywords TEXT NULL COMMENT 'Default meta keywords (comma-separated)',
          meta_title_template VARCHAR(255) DEFAULT '%s | SHONRA' COMMENT 'Title template (%s will be replaced)',
          og_image_url VARCHAR(500) NULL COMMENT 'Open Graph image URL (1200x630px recommended)',
          og_title VARCHAR(255) NULL COMMENT 'Open Graph title (optional, uses default if empty)',
          og_description TEXT NULL COMMENT 'Open Graph description (optional, uses meta_description if empty)',
          twitter_handle VARCHAR(100) DEFAULT '@shonra' COMMENT 'Twitter account handle',
          google_verification_code VARCHAR(100) NULL COMMENT 'Google Search Console verification code',
          bing_verification_code VARCHAR(100) NULL COMMENT 'Bing Webmaster Tools verification code',
          enable_ai_seo BOOLEAN DEFAULT FALSE COMMENT 'Enable AI SEO features',
          gemini_api_key VARCHAR(255) NULL COMMENT 'Google Gemini API Key (stored in database, not env)',
          ai_seo_language VARCHAR(10) DEFAULT 'th' COMMENT 'Default language for AI SEO (th/en)',
          canonical_url VARCHAR(255) NULL COMMENT 'Canonical URL (optional, uses site_url if empty)',
          robots_meta VARCHAR(100) DEFAULT 'index, follow' COMMENT 'Robots meta tag value',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      // Initialize default settings
      await executeQuery(`
        INSERT IGNORE INTO settings (id, website_name, maintenance_mode)
        VALUES (1, 'SHONRA', FALSE)
      `);
      console.log('✅ Created settings table');
      createdCount++;
    } else {
      console.log('⏭️  settings table already exists');
      skippedCount++;
      
      // Check and add missing columns if table exists
      const missingColumns = [
        { name: 'enable_ai_seo', definition: "BOOLEAN DEFAULT FALSE COMMENT 'Enable AI SEO features'" },
        { name: 'gemini_api_key', definition: "VARCHAR(255) NULL COMMENT 'Google Gemini API Key (stored in database, not env)'" },
        { name: 'ai_seo_language', definition: "VARCHAR(10) DEFAULT 'th' COMMENT 'Default language for AI SEO (th/en)'" },
        { name: 'canonical_url', definition: "VARCHAR(255) NULL COMMENT 'Canonical URL (optional, uses site_url if empty)'" },
        { name: 'robots_meta', definition: "VARCHAR(100) DEFAULT 'index, follow' COMMENT 'Robots meta tag value'" },
        { name: 'site_url', definition: "VARCHAR(255) DEFAULT 'https://shonra.com' COMMENT 'Website URL for SEO'" },
        { name: 'sitemap_url', definition: "VARCHAR(255) DEFAULT 'https://shonra.com/sitemap.xml' COMMENT 'Sitemap XML location'" },
        { name: 'meta_description', definition: "TEXT NULL COMMENT 'Default meta description for SEO'" },
        { name: 'meta_keywords', definition: "TEXT NULL COMMENT 'Default meta keywords (comma-separated)'" },
        { name: 'meta_title_template', definition: "VARCHAR(255) DEFAULT '%s | SHONRA' COMMENT 'Title template (%s will be replaced)'" },
        { name: 'og_image_url', definition: "VARCHAR(500) NULL COMMENT 'Open Graph image URL (1200x630px recommended)'" },
        { name: 'og_title', definition: "VARCHAR(255) NULL COMMENT 'Open Graph title (optional, uses default if empty)'" },
        { name: 'og_description', definition: "TEXT NULL COMMENT 'Open Graph description (optional, uses meta_description if empty)'" },
        { name: 'twitter_handle', definition: "VARCHAR(100) DEFAULT '@shonra' COMMENT 'Twitter account handle'" },
        { name: 'google_verification_code', definition: "VARCHAR(100) NULL COMMENT 'Google Search Console verification code'" },
        { name: 'bing_verification_code', definition: "VARCHAR(100) NULL COMMENT 'Bing Webmaster Tools verification code'" }
      ];
      
      for (const column of missingColumns) {
        try {
          const checkResult = await executeQuery(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'settings' 
            AND COLUMN_NAME = ?
          `, [column.name]);
          
          // Handle both lowercase and uppercase column names (MySQL version differences)
          const hasColumn = checkResult.success && checkResult.data && checkResult.data.length > 0 && 
            (checkResult.data[0].COLUMN_NAME || checkResult.data[0].column_name);
          
          if (!hasColumn) {
            await executeQuery(`ALTER TABLE settings ADD COLUMN ${column.name} ${column.definition}`);
            console.log(`✅ Added missing column: ${column.name} to settings table`);
          }
        } catch (error) {
          // Column might already exist or other error, skip
          if (!error.message.includes('Duplicate column name')) {
            console.log(`⏭️  Skipped adding column ${column.name}: ${error.message}`);
          }
        }
      }
    }

    // 3. Create categories table
    if (!existingTables.has('categories')) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created categories table');
      createdCount++;
    } else {
      console.log('⏭️  categories table already exists');
      skippedCount++;
    }

    // 4. Create tags table
    if (!existingTables.has('tags')) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS tags (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL UNIQUE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created tags table');
      createdCount++;
    } else {
      console.log('⏭️  tags table already exists');
      skippedCount++;
    }

    // 5. Create shopee_products table (if not exists)
    if (!existingTables.has('shopee_products')) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS shopee_products (
          id INT PRIMARY KEY AUTO_INCREMENT,
          item_id VARCHAR(50) UNIQUE NOT NULL,
          category_id INT DEFAULT NULL,
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
          is_flash_sale BOOLEAN DEFAULT FALSE,
          status ENUM('active', 'inactive') DEFAULT 'active',
          source VARCHAR(20) DEFAULT 'backend' COMMENT 'frontend or backend',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        )
      `);
      console.log('✅ Created shopee_products table');
      createdCount++;
    } else {
      console.log('⏭️  shopee_products table already exists');
      skippedCount++;
    }

    // 6. Create product_tags table
    if (!existingTables.has('product_tags')) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS product_tags (
          product_item_id VARCHAR(50) NOT NULL,
          tag_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (product_item_id, tag_id),
          FOREIGN KEY (product_item_id) REFERENCES shopee_products(item_id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Created product_tags table');
      createdCount++;
    } else {
      console.log('⏭️  product_tags table already exists');
      skippedCount++;
    }

    // 7. Create category_keywords table
    if (!existingTables.has('category_keywords')) {
      await executeQuery(`
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
      `);
      console.log('✅ Created category_keywords table');
      createdCount++;
    } else {
      console.log('⏭️  category_keywords table already exists');
      skippedCount++;
    }

    // 8. Create banner_positions table
    if (!existingTables.has('banner_positions')) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS banner_positions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL UNIQUE,
          width INT NOT NULL,
          height INT NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created banner_positions table');
      createdCount++;
    } else {
      console.log('⏭️  banner_positions table already exists');
      skippedCount++;
    }

    // 9. Create banner_campaigns table
    if (!existingTables.has('banner_campaigns')) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS banner_campaigns (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          start_time DATETIME NULL,
          end_time DATETIME NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created banner_campaigns table');
      createdCount++;
    } else {
      console.log('⏭️  banner_campaigns table already exists');
      skippedCount++;
    }

    // 10. Create banners table
    if (!existingTables.has('banners')) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS banners (
          id INT PRIMARY KEY AUTO_INCREMENT,
          position_id INT NOT NULL,
          campaign_id INT DEFAULT NULL,
          image_url LONGTEXT NOT NULL,
          target_url TEXT,
          alt_text VARCHAR(255),
          title VARCHAR(255),
          description TEXT,
          sort_order INT DEFAULT 0,
          open_new_tab BOOLEAN DEFAULT FALSE,
          start_time DATETIME NULL,
          end_time DATETIME NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (position_id) REFERENCES banner_positions(id),
          FOREIGN KEY (campaign_id) REFERENCES banner_campaigns(id) ON DELETE SET NULL
        )
      `);
      console.log('✅ Created banners table');
      createdCount++;
    } else {
      console.log('⏭️  banners table already exists');
      skippedCount++;
    }

    // 11. Create roles table
    if (!existingTables.has('roles')) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS roles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) UNIQUE NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created roles table');
      createdCount++;
    } else {
      console.log('⏭️  roles table already exists');
      skippedCount++;
    }

    // 12. Create permissions table
    if (!existingTables.has('permissions')) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS permissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          slug VARCHAR(100) UNIQUE NOT NULL,
          description TEXT,
          group_name VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created permissions table');
      createdCount++;
    } else {
      console.log('⏭️  permissions table already exists');
      skippedCount++;
    }

    // 13. Create role_permissions table
    if (!existingTables.has('role_permissions')) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          role_id INT,
          permission_id INT,
          PRIMARY KEY (role_id, permission_id),
          FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
          FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Created role_permissions table');
      createdCount++;
    } else {
      console.log('⏭️  role_permissions table already exists');
      skippedCount++;
    }

    // 14. Create admin_activity_logs table
    if (!existingTables.has('admin_activity_logs')) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS admin_activity_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          admin_user_id INT,
          action VARCHAR(255) NOT NULL,
          details TEXT,
          ip_address VARCHAR(45),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL
        )
      `);
      console.log('✅ Created admin_activity_logs table');
      createdCount++;
    } else {
      console.log('⏭️  admin_activity_logs table already exists');
      skippedCount++;
    }

    // 15. Create social_media table
    if (!existingTables.has('social_media')) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS social_media (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255),
          icon_url LONGTEXT,
          url TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created social_media table');
      createdCount++;
    } else {
      console.log('⏭️  social_media table already exists');
      skippedCount++;
    }

    // Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Table Creation Summary:");
    console.log(`   ✅ Created: ${createdCount} tables`);
    console.log(`   ⏭️  Skipped: ${skippedCount} tables (already exist)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("🎉 Ensure all tables migration completed successfully!");

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Only call process.exit if run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateEnsureAllTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  migrateEnsureAllTables();
}
