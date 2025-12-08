import { executeQuery } from '../../config/database.js';

/**
 * Migration: Insert Initial Data
 * This migration inserts sample data from SQL dumps into the database
 * Should run AFTER migrate_ensure_all_tables.js
 */

async function migrateInsertData() {
  try {
    console.log('\n🚀 Starting data insertion migration...');

    // Get database name
    const dbResult = await executeQuery("SELECT DATABASE() as db");
    
    if (!dbResult || !dbResult.success) {
      const errorMsg = dbResult?.error || 'Unknown error';
      console.error('❌ Failed to get database name:', errorMsg);
      throw new Error(`Failed to get database name: ${errorMsg}`);
    }
    
    const actualDbName = dbResult.data[0].db || dbResult.data[0].DB || process.env.DB_NAME || "shopee_affiliate";
    console.log(`📊 Database: ${actualDbName}\n`);

    console.log('📦 Inserting data...\n');

    // 1. Insert Roles (using REPLACE INTO to ensure fresh data even if run multiple times)
    console.log('📝 Inserting roles...');
    await executeQuery(`
      REPLACE INTO roles (id, name, description, created_at, updated_at) VALUES
      (1, 'Super Admin', 'Full access to all features', '2025-11-23 10:07:40', '2025-11-23 10:07:40'),
      (2, 'Admin', 'Can manage content and users', '2025-11-23 10:07:40', '2025-11-23 10:07:40'),
      (3, 'Editor', 'Can manage content', '2025-11-23 10:07:40', '2025-11-23 10:07:40'),
      (4, 'Viewer', 'Read-only access', '2025-11-23 10:07:40', '2025-11-23 10:07:40')
    `);
    console.log('✅ Roles inserted (or replaced if existed)');

    // 2. Insert Permissions (using REPLACE INTO to ensure fresh data)
    console.log('📝 Inserting permissions...');
    await executeQuery(`
      REPLACE INTO permissions (id, name, slug, description, group_name, created_at) VALUES
      (1, 'View Products', 'view_products', NULL, 'Products', '2025-11-23 10:07:40'),
      (2, 'Create Products', 'create_products', NULL, 'Products', '2025-11-23 10:07:40'),
      (3, 'Edit Products', 'edit_products', NULL, 'Products', '2025-11-23 10:07:40'),
      (4, 'Delete Products', 'delete_products', NULL, 'Products', '2025-11-23 10:07:40'),
      (5, 'View Categories', 'view_categories', NULL, 'Categories', '2025-11-23 10:07:40'),
      (6, 'Create Categories', 'create_categories', NULL, 'Categories', '2025-11-23 10:07:40'),
      (7, 'Edit Categories', 'edit_categories', NULL, 'Categories', '2025-11-23 10:07:40'),
      (8, 'Delete Categories', 'delete_categories', NULL, 'Categories', '2025-11-23 10:07:40'),
      (9, 'View Tags', 'view_tags', NULL, 'Tags', '2025-11-23 10:07:40'),
      (10, 'Create Tags', 'create_tags', NULL, 'Tags', '2025-11-23 10:07:40'),
      (11, 'Edit Tags', 'edit_tags', NULL, 'Tags', '2025-11-23 10:07:40'),
      (12, 'Delete Tags', 'delete_tags', NULL, 'Tags', '2025-11-23 10:07:40'),
      (13, 'View Banners', 'view_banners', NULL, 'Banners', '2025-11-23 10:07:40'),
      (14, 'Create Banners', 'create_banners', NULL, 'Banners', '2025-11-23 10:07:40'),
      (15, 'Edit Banners', 'edit_banners', NULL, 'Banners', '2025-11-23 10:07:40'),
      (16, 'Delete Banners', 'delete_banners', NULL, 'Banners', '2025-11-23 10:07:40'),
      (17, 'View Settings', 'view_settings', NULL, 'Settings', '2025-11-23 10:07:40'),
      (18, 'Create Settings', 'create_settings', NULL, 'Settings', '2025-11-23 10:07:40'),
      (19, 'Edit Settings', 'edit_settings', NULL, 'Settings', '2025-11-23 10:07:40'),
      (20, 'Delete Settings', 'delete_settings', NULL, 'Settings', '2025-11-23 10:07:40'),
      (21, 'View Admin Users', 'view_admin_users', NULL, 'Admin Users', '2025-11-23 10:07:40'),
      (22, 'Create Admin Users', 'create_admin_users', NULL, 'Admin Users', '2025-11-23 10:07:40'),
      (23, 'Edit Admin Users', 'edit_admin_users', NULL, 'Admin Users', '2025-11-23 10:07:40'),
      (24, 'Delete Admin Users', 'delete_admin_users', NULL, 'Admin Users', '2025-11-23 10:07:40'),
      (25, 'View Roles', 'view_roles', NULL, 'Roles', '2025-11-23 10:07:40'),
      (26, 'Create Roles', 'create_roles', NULL, 'Roles', '2025-11-23 10:07:40'),
      (27, 'Edit Roles', 'edit_roles', NULL, 'Roles', '2025-11-23 10:07:40'),
      (28, 'Delete Roles', 'delete_roles', NULL, 'Roles', '2025-11-23 10:07:40')
    `);
    console.log('✅ Permissions inserted (or replaced if existed)');

    // 3. Insert Role-Permission Mappings (using REPLACE INTO)
    console.log('📝 Inserting role permissions...');
    await executeQuery(`
      REPLACE INTO role_permissions (role_id, permission_id) VALUES
      (1,1),(2,1),(3,1),(4,1),(1,2),(2,2),(3,2),(1,3),(2,3),(1,4),(2,4),(1,5),(2,5),(3,5),
      (1,6),(2,6),(3,6),(1,7),(2,7),(1,8),(2,8),(1,9),(2,9),(3,9),(1,10),(2,10),(3,10),
      (1,11),(2,11),(1,12),(2,12),(1,13),(2,13),(3,13),(4,13),(1,14),(2,14),(3,14),(1,15),(2,15),
      (1,16),(2,16),(1,17),(1,18),(1,19),(1,20),(1,21),(2,21),(1,22),(2,22),(1,23),(2,23),
      (1,24),(2,24),(1,25),(2,25),(1,26),(2,26),(1,27),(2,27),(1,28),(2,28)
    `);
    console.log('✅ Role permissions inserted (or replaced if existed)');

    // 4. Insert Categories (using REPLACE INTO)
    console.log('📝 Inserting categories...');
    await executeQuery(`
      REPLACE INTO categories (id, name, is_active, created_at, updated_at) VALUES
      (7, 'Health & Beauty', 1, '2025-11-23 04:16:53', '2025-11-23 04:16:53'),
      (8, 'Electronics', 1, '2025-11-23 04:18:19', '2025-11-30 16:22:32'),
      (9, 'Fashion & Accessories', 1, '2025-11-23 04:18:42', '2025-11-23 04:18:42'),
      (10, 'Home & Living', 1, '2025-11-23 04:18:51', '2025-11-23 04:18:51'),
      (11, 'Family', 1, '2025-11-23 04:19:48', '2025-11-23 04:19:48'),
      (12, 'Toys & Pets', 1, '2025-11-23 04:19:56', '2025-11-23 04:19:56'),
      (14, 'Food & Beverage', 1, '2025-11-29 11:01:04', '2025-12-07 14:55:51')
    `);
    console.log('✅ Categories inserted (or replaced if existed)');

    // 5. Insert Tags (using REPLACE INTO)
    console.log('📝 Inserting tags...');
    await executeQuery(`
      REPLACE INTO tags (id, name, is_active, created_at, updated_at) VALUES
      (3, 'Skincare', 1, '2025-11-23 04:54:18', '2025-11-23 04:54:18'),
      (4, 'Makeup', 1, '2025-11-23 04:54:58', '2025-11-23 04:54:58')
    `);
    console.log('✅ Tags inserted (or replaced if existed)');

    // 6. Insert Banner Positions (using REPLACE INTO)
    console.log('📝 Inserting banner positions...');
    await executeQuery(`
      REPLACE INTO banner_positions (id, name, width, height, is_active, created_at, updated_at) VALUES
      (1, 'Homepage Top Banner', 1920, 600, 1, '2025-11-23 05:46:27', '2025-11-23 05:46:27'),
      (4, 'Banner Ads', 800, 800, 1, '2025-11-23 05:57:49', '2025-11-23 05:57:49'),
      (5, 'Flash Sale Banner', 1200, 240, 1, '2025-11-29 06:36:47', '2025-11-29 06:36:47'),
      (6, 'Banner Popup', 500, 500, 1, '2025-11-29 11:17:10', '2025-11-29 11:17:10')
    `);
    console.log('✅ Banner positions inserted (or replaced if existed)');

    // 7. Insert Banner Campaigns (using REPLACE INTO)
    console.log('📝 Inserting banner campaigns...');
    await executeQuery(`
      REPLACE INTO banner_campaigns (id, name, start_time, end_time, is_active, created_at, updated_at) VALUES
      (3, 'Black Friday', '2025-11-22 09:50:00', '2025-12-01 23:59:00', 0, '2025-11-23 05:50:03', '2025-12-07 02:54:20')
    `);
    console.log('✅ Banner campaigns inserted (or replaced if existed)');

    // 8. Insert Banners (using REPLACE INTO)
    console.log('📝 Inserting banners...');
    await executeQuery(`
      REPLACE INTO banners (id, position_id, campaign_id, image_url, target_url, alt_text, title, description, sort_order, open_new_tab, start_time, end_time, is_active, created_at, updated_at) VALUES
      (6, 5, NULL, '/api/uploads/banners/banner-1765093162698-1765093162707-660513297.jpg', 'https://s.shopee.co.th/9fDRryHKav', '', '', '', 0, 1, NULL, NULL, 1, '2025-11-29 07:39:22', '2025-12-07 07:39:25'),
      (7, 6, NULL, '/api/uploads/banners/banner-1765079322112-1765079322117-886687148.jpg', 'https://shopee.co.th/-%E0%B8%AA%E0%B9%88%E0%B8%87%E0%B8%9F%E0%B8%A3%E0%B8%B5-Dr.JiLL-Advanced-Serum-%E0%B8%94%E0%B8%A3.%E0%B8%88%E0%B8%B4%E0%B8%A5-%E0%B8%AA%E0%B8%B9%E0%B8%95%E0%B8%A3%E0%B9%83%E0%B8%AB%E0%B8%A1%E0%B9%88-2-%E0%B8%82%E0%B8%A7%E0%B8%94-%E0%B8%82%E0%B8%99%E0%B8%B2%E0%B8%94-30-ml-%E0%B9%80%E0%B8%8B%E0%B8%A3%E0%B8%B1%E0%B9%88%E0%B8%A1%E0%B8%84%E0%B8%B8%E0%B8%93%E0%B8%AB%E0%B8%A1%E0%B8%AD-i.504643137.8987241599', '', '', '', 0, 1, NULL, NULL, 1, '2025-11-29 11:18:21', '2025-12-07 03:48:45'),
      (8, 6, NULL, '/api/uploads/banners/banner-1765079335640-1765079335645-735386248.jpg', 'https://shopee.co.th/', '', '', '', 1, 1, NULL, NULL, 1, '2025-11-29 11:41:46', '2025-12-07 03:48:59')
    `);
    console.log('✅ Banners inserted (or replaced if existed)');

    // 9. Insert Product Tags (using REPLACE INTO)
    console.log('📝 Inserting product tags...');
    await executeQuery(`
      REPLACE INTO product_tags (product_item_id, tag_id, created_at) VALUES
      ('19186110135', 3, '2025-11-23 14:26:11'),
      ('24547348074', 4, '2025-11-23 04:55:54'),
      ('25513287365', 3, '2025-11-23 04:54:30'),
      ('25513287365', 4, '2025-11-23 04:55:55'),
      ('28025832420', 3, '2025-11-23 04:55:31'),
      ('28025832420', 4, '2025-11-23 04:55:53')
    `);
    console.log('✅ Product tags inserted (or replaced if existed)');

    // Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Data Insertion Summary:");
    console.log("   ✅ Roles: 4 records");
    console.log("   ✅ Permissions: 28 records");
    console.log("   ✅ Role Permissions: 56 records");
    console.log("   ✅ Categories: 7 records");
    console.log("   ✅ Tags: 2 records");
    console.log("   ✅ Banner Positions: 4 records");
    console.log("   ✅ Banner Campaigns: 1 record");
    console.log("   ✅ Banners: 3 records");
    console.log("   ✅ Product Tags: 6 records");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("🎉 Data insertion migration completed successfully!");

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Always call the function when imported
const migrationPromise = migrateInsertData()
  .catch(error => {
    console.error('❌ Migration error:', error);
    throw error;
  });

export default migrationPromise;
