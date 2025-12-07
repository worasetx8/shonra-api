import { executeQuery } from '../../config/database.js';

async function migrate() {
  try {
    console.log('Starting migration for banners...');

    // 1. Create banner_positions table
    const createPositionsTable = `
      CREATE TABLE IF NOT EXISTS banner_positions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        width INT NOT NULL,
        height INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await executeQuery(createPositionsTable);
    console.log('✅ Created banner_positions table');

    // 2. Create banner_campaigns table
    const createCampaignsTable = `
      CREATE TABLE IF NOT EXISTS banner_campaigns (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        start_time TIMESTAMP NULL,
        end_time TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await executeQuery(createCampaignsTable);
    console.log('✅ Created banner_campaigns table');

    // 3. Create banners table
    const createBannersTable = `
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
        start_time TIMESTAMP NULL,
        end_time TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        open_new_tab BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (position_id) REFERENCES banner_positions(id),
        FOREIGN KEY (campaign_id) REFERENCES banner_campaigns(id)
      )
    `;
    await executeQuery(createBannersTable);
    console.log('✅ Created banners table');

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Only call process.exit if run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  migrate();
}
