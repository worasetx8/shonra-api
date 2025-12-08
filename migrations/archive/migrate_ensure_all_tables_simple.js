import { executeQuery } from '../../config/database.js';

/**
 * Migration: Ensure All Tables Exist (Simplified Version)
 * This migration creates all required tables in one run
 * Uses CREATE TABLE IF NOT EXISTS so it's safe to run multiple times
 * 
 * This should run FIRST before other migrations to ensure all base tables exist
 */

// Helper function to execute query and check result
async function executeAndCheck(query, tableName) {
  const result = await executeQuery(query);
  if (!result.success) {
    const errorMsg = `Failed to create ${tableName} table: ${result.error}`;
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }
  return result;
}

async function migrateEnsureAllTables() {
  try {
    console.log('🚀 Starting ensure all tables migration...');

    // Get database name
    const dbResult = await executeQuery("SELECT DATABASE() as db");
    const actualDbName = dbResult.data && dbResult.data[0] 
      ? (dbResult.data[0].db || dbResult.data[0].DB || process.env.DB_NAME || "shopee_affiliate")
      : (process.env.DB_NAME || "shopee_affiliate");
    console.log(`📊 Database: ${actualDbName}\n`);

    // Create all tables (CREATE TABLE IF NOT EXISTS will skip if exists)
    // This ensures all tables are created in one run, even if some already exist
    
    console.log('📦 Creating all tables...\n');

    // 1. Create admin_users table
    await executeAndCheck(`
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
    `, 'admin_users');
    console.log('✅ admin_users table');

    // 2. Create settings table
    await executeAndCheck(`
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
    `, 'settings');
    // Initialize default settings
    await executeQuery(`
      INSERT IGNORE INTO settings (id, website_name, maintenance_mode)
      VALUES (1, 'SHONRA', FALSE)
    `);
    console.log('✅ settings table');

    // 3. Create categories table
    await executeAndCheck(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `, 'categories');
    console.log('✅ categories table');

    // 4. Create tags table
    await executeAndCheck(`
      CREATE TABLE IF NOT EXISTS tags (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `, 'tags');
    console.log('✅ tags table');

    // 5. Create shopee_products table
    await executeAndCheck(`
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
    `, 'shopee_products');
    console.log('✅ shopee_products table');

    // 6. Create product_tags table
    await executeAndCheck(`
      CREATE TABLE IF NOT EXISTS product_tags (
        product_item_id VARCHAR(50) NOT NULL,
        tag_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (product_item_id, tag_id),
        FOREIGN KEY (product_item_id) REFERENCES shopee_products(item_id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `, 'product_tags');
    console.log('✅ product_tags table');

    // 7. Create category_keywords table
    await executeAndCheck(`
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
    `, 'category_keywords');
    console.log('✅ category_keywords table');

    // 8. Create banner_positions table
    await executeAndCheck(`
      CREATE TABLE IF NOT EXISTS banner_positions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        width INT NOT NULL,
        height INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `, 'banner_positions');
    console.log('✅ banner_positions table');

    // 9. Create banner_campaigns table
    await executeAndCheck(`
      CREATE TABLE IF NOT EXISTS banner_campaigns (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        start_time DATETIME NULL,
        end_time DATETIME NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `, 'banner_campaigns');
    console.log('✅ banner_campaigns table');

    // 10. Create banners table
    await executeAndCheck(`
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
    `, 'banners');
    console.log('✅ banners table');

    // 11. Create roles table
    await executeAndCheck(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `, 'roles');
    console.log('✅ roles table');

    // 12. Create permissions table
    await executeAndCheck(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        group_name VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, 'permissions');
    console.log('✅ permissions table');

    // 13. Create role_permissions table
    await executeAndCheck(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INT,
        permission_id INT,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      )
    `, 'role_permissions');
    console.log('✅ role_permissions table');

    // 14. Create admin_activity_logs table
    await executeAndCheck(`
      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_user_id INT,
        action VARCHAR(255) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL
      )
    `, 'admin_activity_logs');
    console.log('✅ admin_activity_logs table');

    // 15. Create social_media table
    await executeAndCheck(`
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
    `, 'social_media');
    console.log('✅ social_media table');

    // Verify tables were created
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const verifyTablesResult = await executeQuery(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
      [actualDbName]
    );
    
    const verifiedTables = new Set(
      (verifyTablesResult.data || []).map(t => {
        const tableName = t.table_name || t.TABLE_NAME;
        return tableName ? tableName.toLowerCase() : null;
      }).filter(Boolean)
    );

    // Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Table Creation Summary:");
    console.log(`   ✅ Created/Verified: ${verifiedTables.size} tables exist in database`);
    console.log(`   📝 Tables: ${Array.from(verifiedTables).sort().join(', ')}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (verifiedTables.size < 15) {
      console.warn(`⚠️  WARNING: Expected 15 tables but found ${verifiedTables.size} tables!`);
      const missingTables = ['admin_users', 'settings', 'categories', 'tags', 'shopee_products',
        'product_tags', 'category_keywords', 'banner_positions', 'banner_campaigns',
        'banners', 'roles', 'permissions', 'role_permissions', 'admin_activity_logs', 'social_media']
        .filter(t => !verifiedTables.has(t));
      if (missingTables.length > 0) {
        console.warn(`   Missing tables: ${missingTables.join(', ')}`);
      }
    }

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

