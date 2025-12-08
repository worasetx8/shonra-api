import { executeQuery } from '../../config/database.js';

/**
 * Complete Shopee Products Migration
 * Combines all shopee_products-related migrations:
 * - migrate_add_source.js (add source column)
 */
async function migrateShopeeProductsComplete() {
  try {
    console.log('🚀 Starting complete shopee_products migration...');

    // Add source column
    const checkColumn = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'shopee_products' 
      AND COLUMN_NAME = 'source'
    `);
    
    // Handle both lowercase and uppercase column names (MySQL version differences)
    const hasColumn = checkColumn.success && checkColumn.data && checkColumn.data.length > 0 && 
      (checkColumn.data[0].COLUMN_NAME || checkColumn.data[0].column_name);
    
    if (hasColumn) {
      console.log('✅ Column "source" already exists');
    } else {
      // Add source column
      const result = await executeQuery(`
        ALTER TABLE shopee_products 
        ADD COLUMN source VARCHAR(20) DEFAULT 'backend' 
        COMMENT 'frontend or backend'
      `);
      
      if (result.success) {
        console.log('✅ Successfully added source column');
        
        // Update existing records to 'backend'
        await executeQuery(`UPDATE shopee_products SET source = 'backend' WHERE source IS NULL`);
        console.log('✅ Updated existing records to backend');
      } else {
        throw new Error(result.error);
      }
    }

    console.log('🎉 Complete shopee_products migration finished successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Only call process.exit if run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateShopeeProductsComplete()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  migrateShopeeProductsComplete();
}

