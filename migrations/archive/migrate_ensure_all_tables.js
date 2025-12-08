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

    // 1. Create categories table
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

    // 2. Create tags table
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

    // 3. Create shopee_products table (if not exists)
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

    // 4. Create product_tags table
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

    // 5. Create category_keywords table
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

    // 6. Create banner_positions table
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

    // 7. Create banner_campaigns table
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

    // 8. Create banners table
    if (!existingTables.has('banners')) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS banners (
          id INT PRIMARY KEY AUTO_INCREMENT,
          position_id INT NOT NULL,
          campaign_id INT DEFAULT NULL,
          image_url TEXT NOT NULL,
          target_url TEXT,
          alt_text VARCHAR(255),
          title VARCHAR(255),
          description TEXT,
          sort_order INT DEFAULT 0,
          start_time DATETIME NULL,
          end_time DATETIME NULL,
          is_active BOOLEAN DEFAULT TRUE,
          open_new_tab BOOLEAN DEFAULT FALSE,
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

    // 9. Create roles table
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

    // 10. Create permissions table
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

    // 11. Create role_permissions table
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

    // 12. Create admin_activity_logs table
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

    // 13. Create social_media table
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
