import { executeQuery } from '../../config/database.js';

async function migrate() {
  try {
    console.log('Starting migration for tags...');

    // Create tags table
    const createTagsTable = `
      CREATE TABLE IF NOT EXISTS tags (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await executeQuery(createTagsTable);
    console.log('✅ Created tags table');

    // Create product_tags junction table
    const createProductTagsTable = `
      CREATE TABLE IF NOT EXISTS product_tags (
        product_item_id VARCHAR(50) NOT NULL,
        tag_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (product_item_id, tag_id),
        FOREIGN KEY (product_item_id) REFERENCES shopee_products(item_id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `;
    await executeQuery(createProductTagsTable);
    console.log('✅ Created product_tags table');

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error; // Re-throw to let run-all-migrations.js handle it
  }
}

// Only call process.exit if run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  // If imported, just call the function (no process.exit)
  migrate();
}

