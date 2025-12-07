import { executeQuery } from '../../config/database.js';

/**
 * Complete Settings Migration
 * Combines all settings-related migrations:
 * - migrate_settings.js (base table)
 * - migrate_seo_settings.js (SEO columns)
 * - migrate_client_search_settings.js (search settings)
 * - migrate_logo_separation.js (logo columns)
 * - migrate_maintenance_bypass.js (maintenance bypass token)
 */
async function migrateSettingsComplete() {
  try {
    console.log('🚀 Starting complete settings migration...');

    // 1. Create settings table (base)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT PRIMARY KEY DEFAULT 1,
        website_name VARCHAR(255),
        logo_url LONGTEXT,
        maintenance_mode BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Settings table created or already exists.');

    // Initialize default settings if not exists
    await executeQuery(`
      INSERT IGNORE INTO settings (id, website_name, maintenance_mode)
      VALUES (1, 'My Website', FALSE)
    `);
    console.log('✅ Default settings initialized.');

    // 2. Create social_media table
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
    console.log('✅ Social media table created or already exists.');

    // 3. Add SEO Settings columns
    const seoColumns = [
      {
        name: 'site_url',
        definition: "VARCHAR(255) DEFAULT 'https://shonra.com' COMMENT 'Website URL for SEO (replaces NEXT_PUBLIC_SITE_URL)'"
      },
      {
        name: 'sitemap_url',
        definition: "VARCHAR(255) DEFAULT 'https://shonra.com/sitemap.xml' COMMENT 'Sitemap XML location'"
      },
      {
        name: 'meta_description',
        definition: "TEXT NULL COMMENT 'Default meta description for SEO'"
      },
      {
        name: 'meta_keywords',
        definition: "TEXT NULL COMMENT 'Default meta keywords (comma-separated)'"
      },
      {
        name: 'meta_title_template',
        definition: "VARCHAR(255) DEFAULT '%s | SHONRA' COMMENT 'Title template (%s will be replaced)'"
      },
      {
        name: 'og_image_url',
        definition: "VARCHAR(500) NULL COMMENT 'Open Graph image URL (1200x630px recommended)'"
      },
      {
        name: 'og_title',
        definition: "VARCHAR(255) NULL COMMENT 'Open Graph title (optional, uses default if empty)'"
      },
      {
        name: 'og_description',
        definition: "TEXT NULL COMMENT 'Open Graph description (optional, uses meta_description if empty)'"
      },
      {
        name: 'twitter_handle',
        definition: "VARCHAR(100) DEFAULT '@shonra' COMMENT 'Twitter account handle'"
      },
      {
        name: 'google_verification_code',
        definition: "VARCHAR(100) NULL COMMENT 'Google Search Console verification code'"
      },
      {
        name: 'bing_verification_code',
        definition: "VARCHAR(100) NULL COMMENT 'Bing Webmaster Tools verification code'"
      },
      {
        name: 'enable_ai_seo',
        definition: "BOOLEAN DEFAULT FALSE COMMENT 'Enable AI SEO features'"
      },
      {
        name: 'gemini_api_key',
        definition: "VARCHAR(255) NULL COMMENT 'Google Gemini API Key (stored in database, not env)'"
      },
      {
        name: 'ai_seo_language',
        definition: "VARCHAR(10) DEFAULT 'th' COMMENT 'Default language for AI SEO (th/en)'"
      },
      {
        name: 'canonical_url',
        definition: "VARCHAR(255) NULL COMMENT 'Canonical URL (optional, uses site_url if empty)'"
      },
      {
        name: 'robots_meta',
        definition: "VARCHAR(100) DEFAULT 'index, follow' COMMENT 'Robots meta tag value'"
      }
    ];

    for (const column of seoColumns) {
      try {
        const checkQuery = `
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'settings' 
          AND COLUMN_NAME = ?
        `;
        
        const checkResult = await executeQuery(checkQuery, [column.name]);
        
        if (checkResult.success && checkResult.data[0].count === 0) {
          const alterQuery = `ALTER TABLE settings ADD COLUMN ${column.name} ${column.definition}`;
          await executeQuery(alterQuery);
          console.log(`✅ Added SEO column: ${column.name}`);
        }
      } catch (error) {
        console.log(`⏭️  SEO column ${column.name} already exists or error: ${error.message}`);
      }
    }

    // 4. Add Client Search Settings columns
    const searchColumns = [
      {
        name: 'min_search_results',
        definition: "INT DEFAULT 10 COMMENT 'Minimum search results before querying Shopee API'"
      },
      {
        name: 'min_commission_rate',
        definition: "DECIMAL(5,2) DEFAULT 10.00 COMMENT 'Minimum commission rate percentage for Shopee search'"
      },
      {
        name: 'min_rating_star',
        definition: "DECIMAL(2,1) DEFAULT 4.5 COMMENT 'Minimum rating star for Shopee search'"
      }
    ];

    for (const column of searchColumns) {
      try {
        const checkQuery = `
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'settings' 
          AND COLUMN_NAME = ?
        `;
        
        const checkResult = await executeQuery(checkQuery, [column.name]);
        
        if (checkResult.success && (!checkResult.data || checkResult.data.length === 0)) {
          const alterQuery = `ALTER TABLE settings ADD COLUMN ${column.name} ${column.definition}`;
          await executeQuery(alterQuery);
          console.log(`✅ Added search settings column: ${column.name}`);
        }
      } catch (error) {
        console.log(`⏭️  Search column ${column.name} already exists or error: ${error.message}`);
      }
    }

    // Update existing row with default values
    await executeQuery(`
      UPDATE settings 
      SET 
        min_search_results = COALESCE(min_search_results, 10),
        min_commission_rate = COALESCE(min_commission_rate, 10.00),
        min_rating_star = COALESCE(min_rating_star, 4.5)
      WHERE id = 1
    `);

    // 5. Add Logo Separation columns
    const logoColumns = [
      {
        name: 'logo_backend_url',
        definition: "LONGTEXT NULL"
      },
      {
        name: 'logo_client_url',
        definition: "LONGTEXT NULL"
      }
    ];

    for (const column of logoColumns) {
      try {
        const checkResult = await executeQuery(`SHOW COLUMNS FROM settings LIKE '${column.name}'`);
        
        if (checkResult.success && (!checkResult.data || checkResult.data.length === 0)) {
          const afterColumn = column.name === 'logo_backend_url' ? 'AFTER logo_url' : 'AFTER logo_backend_url';
          await executeQuery(`ALTER TABLE settings ADD COLUMN ${column.name} ${column.definition} ${afterColumn}`);
          console.log(`✅ Added logo column: ${column.name}`);
        }
      } catch (error) {
        console.log(`⏭️  Logo column ${column.name} already exists or error: ${error.message}`);
      }
    }

    // Migrate existing logo_url to both columns if needed
    const existingSettings = await executeQuery('SELECT logo_url, logo_backend_url, logo_client_url FROM settings WHERE id = 1');
    if (existingSettings.success && existingSettings.data.length > 0) {
      const settings = existingSettings.data[0];
      if (settings.logo_url && (!settings.logo_backend_url && !settings.logo_client_url)) {
        await executeQuery(`
          UPDATE settings 
          SET logo_backend_url = ?, logo_client_url = ? 
          WHERE id = 1
        `, [settings.logo_url, settings.logo_url]);
        console.log('✅ Migrated existing logo_url to both logo_backend_url and logo_client_url');
      }
    }

    // 6. Add Maintenance Bypass Token
    try {
      const checkResult = await executeQuery(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'settings' 
        AND COLUMN_NAME = 'maintenance_bypass_token'
      `);

      if (!checkResult.success || !checkResult.data || checkResult.data.length === 0) {
        await executeQuery(`
          ALTER TABLE settings 
          ADD COLUMN maintenance_bypass_token VARCHAR(255) DEFAULT NULL
        `);
        console.log('✅ Added maintenance_bypass_token column.');
      }

      // Generate a default token if not exists
      const tokenCheck = await executeQuery('SELECT maintenance_bypass_token FROM settings WHERE id = 1');
      if (tokenCheck.success && tokenCheck.data && tokenCheck.data.length > 0) {
        const currentToken = tokenCheck.data[0].maintenance_bypass_token;
        if (!currentToken) {
          const crypto = await import('crypto');
          const defaultToken = crypto.randomBytes(32).toString('hex');
          await executeQuery(
            'UPDATE settings SET maintenance_bypass_token = ? WHERE id = 1',
            [defaultToken]
          );
          console.log('✅ Generated default maintenance bypass token.');
        }
      }
    } catch (error) {
      console.log(`⏭️  Maintenance bypass token already exists or error: ${error.message}`);
    }

    console.log('🎉 Complete settings migration finished successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Only call process.exit if run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateSettingsComplete()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  migrateSettingsComplete();
}

