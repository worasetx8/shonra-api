import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
// From server/migrations/archive/ -> server/.env
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
if (!process.env.DB_HOST && !process.env.DB_PASSWORD) {
  // Try parent directory
  dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });
}

/**
 * Migration: Add Performance Indexes
 * This migration adds indexes to improve database query performance
 */
async function migrateAddIndexes() {
  let connection;
  
  try {
    console.log('🚀 Starting performance indexes migration...');

    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "shopee_affiliate",
      multipleStatements: true
    });

    // Get database connection info for logging
    const dbName = process.env.DB_NAME || "shopee_affiliate";
    const [currentDb] = await connection.execute("SELECT DATABASE() as db");
    // Handle both lowercase and uppercase column names (MySQL version differences)
    const actualDbName = currentDb[0].db || currentDb[0].DB;
    console.log(`📊 Database: ${actualDbName}\n`);

    // Wait a bit to ensure tables created by previous migration are visible
    // This helps with connection isolation issues
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check existing tables
    const [tables] = await connection.execute(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
      [actualDbName]
    );
    // Handle both lowercase and uppercase column names (MySQL version differences)
    const existingTables = new Set(tables.map(t => {
      const tableName = t.table_name || t.TABLE_NAME;
      return tableName ? tableName.toLowerCase() : null;
    }).filter(Boolean));
    console.log(`📋 Found ${existingTables.size} tables in database`);
    
    // List tables if found
    if (existingTables.size > 0) {
      console.log(`   📝 Tables: ${Array.from(existingTables).sort().join(', ')}\n`);
    } else {
      console.log(`   ⚠️  No tables found! This might indicate a connection or database issue.\n`);
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Define all indexes to create (matching actual database structure)
    const indexes = [
      // shopee_products indexes (from actual database)
      {
        name: 'idx_item_id',
        table: 'shopee_products',
        columns: ['item_id'],
        description: 'Index on item_id column'
      },
      {
        name: 'idx_shop_id',
        table: 'shopee_products',
        columns: ['shop_id'],
        description: 'Index on shop_id column'
      },
      {
        name: 'idx_status',
        table: 'shopee_products',
        columns: ['status'],
        description: 'Index on status column'
      },
      {
        name: 'idx_commission',
        table: 'shopee_products',
        columns: ['seller_commission_rate'],
        description: 'Index on seller_commission_rate column'
      },
      {
        name: 'idx_created_at',
        table: 'shopee_products',
        columns: ['created_at'],
        description: 'Index on created_at column'
      },
      {
        name: 'idx_updated_at',
        table: 'shopee_products',
        columns: ['updated_at'],
        description: 'Index on updated_at column'
      },
      {
        name: 'idx_product_name',
        table: 'shopee_products',
        columns: ['product_name(100)'],
        description: 'Index on product_name column (prefix length 100)',
        isPrefix: true
      },
      {
        name: 'idx_is_flash_sale',
        table: 'shopee_products',
        columns: ['is_flash_sale'],
        description: 'Index on is_flash_sale column'
      },
      {
        name: 'idx_shopee_products_status',
        table: 'shopee_products',
        columns: ['status'],
        description: 'Index on status column (duplicate name but exists in DB)'
      },
      {
        name: 'idx_shopee_products_category',
        table: 'shopee_products',
        columns: ['category_id'],
        description: 'Index on category_id column'
      },
      {
        name: 'idx_shopee_products_item_id',
        table: 'shopee_products',
        columns: ['item_id'],
        description: 'Index on item_id column (duplicate name but exists in DB)'
      },
      {
        name: 'idx_shopee_products_is_flash_sale',
        table: 'shopee_products',
        columns: ['is_flash_sale'],
        description: 'Index on is_flash_sale column (duplicate name but exists in DB)'
      },
      {
        name: 'idx_shopee_products_created_at',
        table: 'shopee_products',
        columns: ['created_at'],
        description: 'Index on created_at column (duplicate name but exists in DB)'
      },
      // product_tags indexes (from actual database)
      {
        name: 'idx_product_item_id',
        table: 'product_tags',
        columns: ['product_item_id'],
        description: 'Index on product_item_id column'
      },
      {
        name: 'idx_product_tags_tag_id',
        table: 'product_tags',
        columns: ['tag_id'],
        description: 'Index on tag_id column'
      },
      {
        name: 'idx_product_tags_item_id',
        table: 'product_tags',
        columns: ['product_item_id'],
        description: 'Index on product_item_id column (duplicate name but exists in DB)'
      },
      {
        name: 'idx_product_tags_composite',
        table: 'product_tags',
        columns: ['tag_id', 'product_item_id'],
        description: 'Composite index on tag_id and product_item_id'
      },
      // banners indexes (from actual database)
      {
        name: 'campaign_id',
        table: 'banners',
        columns: ['campaign_id'],
        description: 'Index on campaign_id column (no idx_ prefix)'
      },
      {
        name: 'idx_banners_position_id',
        table: 'banners',
        columns: ['position_id'],
        description: 'Index on position_id column'
      },
      {
        name: 'idx_banners_is_active',
        table: 'banners',
        columns: ['is_active'],
        description: 'Index on is_active column'
      },
      {
        name: 'idx_banners_composite',
        table: 'banners',
        columns: ['position_id', 'is_active'],
        description: 'Composite index on position_id and is_active'
      },
      // categories indexes (from actual database)
      {
        name: 'idx_categories_is_active',
        table: 'categories',
        columns: ['is_active'],
        description: 'Index on is_active column'
      },
      // tags indexes (from actual database)
      {
        name: 'idx_tags_is_active',
        table: 'tags',
        columns: ['is_active'],
        description: 'Index on is_active column'
      },
      // admin_users indexes (from actual database)
      {
        name: 'idx_admin_users_username',
        table: 'admin_users',
        columns: ['username'],
        description: 'Index on username column'
      },
      {
        name: 'idx_admin_users_role_id',
        table: 'admin_users',
        columns: ['role_id'],
        description: 'Index on role_id column'
      },
      {
        name: 'idx_admin_users_status',
        table: 'admin_users',
        columns: ['status'],
        description: 'Index on status column'
      },
      // role_permissions indexes (from actual database)
      {
        name: 'permission_id',
        table: 'role_permissions',
        columns: ['permission_id'],
        description: 'Index on permission_id column (no idx_ prefix)'
      },
      {
        name: 'idx_role_id',
        table: 'role_permissions',
        columns: ['role_id'],
        description: 'Index on role_id column'
      },
      // admin_activity_logs indexes (from actual database)
      {
        name: 'admin_user_id',
        table: 'admin_activity_logs',
        columns: ['admin_user_id'],
        description: 'Index on admin_user_id column (no idx_ prefix)'
      }
    ];

    console.log(`📦 Processing ${indexes.length} indexes...\n`);

    // Process each index
    for (const index of indexes) {
      const tableNameLower = index.table.toLowerCase();
      
      // Check if table exists
      if (!existingTables.has(tableNameLower)) {
        console.log(`⏭️  Table '${index.table}' doesn't exist, skipping index '${index.name}'...`);
        skipCount++;
        continue;
      }

      try {
        // Check if index already exists
        const [existingIndexes] = await connection.execute(
          `SHOW INDEX FROM ${index.table} WHERE Key_name = ?`,
          [index.name]
        );
        
        if (existingIndexes.length > 0) {
          console.log(`⏭️  Index '${index.name}' already exists on '${index.table}', skipping...`);
          skipCount++;
          continue;
        }

        // Check if columns exist (handle prefix length for TEXT columns)
        const columnNames = index.columns.map(col => {
          // Handle prefix length like 'product_name(100)'
          if (col.includes('(')) {
            return col.split('(')[0];
          }
          return col;
        });
        
        const placeholders = columnNames.map(() => '?').join(',');
        const [columns] = await connection.execute(
          `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME IN (${placeholders})`,
          [actualDbName, index.table, ...columnNames]
        );
        
        // Handle both lowercase and uppercase column names (MySQL version differences)
        const existingColumns = new Set(columns.map(c => {
          const colName = c.COLUMN_NAME || c.column_name;
          return colName ? colName.toLowerCase() : null;
        }).filter(Boolean));
        const missingColumns = columnNames.filter(col => !existingColumns.has(col.toLowerCase()));
        
        if (missingColumns.length > 0) {
          console.log(`⏭️  Column(s) [${missingColumns.join(', ')}] don't exist in '${index.table}', skipping index '${index.name}'...`);
          console.log(`   💡 Hint: Run other migrations first to add missing columns`);
          skipCount++;
          continue;
        }

        // Create index (preserve prefix length if specified)
        const columnsStr = index.columns.join(', ');
        const createIndexSQL = `CREATE INDEX ${index.name} ON ${index.table}(${columnsStr})`;
        
        await connection.execute(createIndexSQL);
        console.log(`✅ Index created: ${index.name} on ${index.table} (${columnsStr})`);
        successCount++;
      } catch (error) {
        if (error.code === "ER_DUP_KEYNAME" || 
            error.message.includes("Duplicate key name") ||
            error.message.includes("already exists")) {
          console.log(`⏭️  Index '${index.name}' already exists on '${index.table}', skipping...`);
          skipCount++;
        } else if (error.code === "ER_NO_SUCH_TABLE" || 
                   error.message.includes("doesn't exist")) {
          console.log(`⏭️  Table '${index.table}' doesn't exist, skipping index '${index.name}'...`);
          skipCount++;
        } else if (error.code === "ER_KEY_COLUMN_DOES_NOT_EXITS" || 
                   (error.message.includes("Key column") && error.message.includes("doesn't exist"))) {
          console.log(`⏭️  Column doesn't exist in table '${index.table}', skipping index '${index.name}'...`);
          console.log(`   💡 Hint: Run migrations to add missing columns`);
          skipCount++;
        } else {
          console.error(`❌ Error creating index '${index.name}' on '${index.table}': ${error.message}`);
          errorCount++;
        }
      }
    }

    // Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Index Migration Summary:");
    console.log(`   ✅ Created: ${successCount} indexes`);
    console.log(`   ⏭️  Skipped: ${skipCount} indexes (already exist or prerequisites missing)`);
    console.log(`   ❌ Errors: ${errorCount} indexes`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (errorCount === 0) {
      console.log("🎉 Index migration completed successfully!");
    } else {
      console.warn(`⚠️  Some indexes failed to create. Check errors above.`);
    }

    if (errorCount > 0) {
      throw new Error(`${errorCount} indexes failed to create`);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Only call process.exit if run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAddIndexes()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  migrateAddIndexes();
}

