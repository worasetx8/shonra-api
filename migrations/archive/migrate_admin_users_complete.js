import { executeQuery } from '../../config/database.js';

/**
 * Complete Admin Users Migration
 * Combines all admin_users-related migrations:
 * - migrate_rbac.js (RBAC columns: role_id, failed_login_attempts, locked_until)
 * - migrate_add_last_login.js (last_login_at)
 * - migrate_add_password_hash.js (password_hash)
 * - migrate_password_nullable.js (make password nullable)
 * - migrate_rbac_fix.js (RBAC data fixes)
 */
async function migrateAdminUsersComplete() {
  try {
    console.log('🚀 Starting complete admin_users migration...');

    // 1. Create RBAC tables first (required for foreign keys)
    // Roles Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Roles table created or already exists.');

    // Permissions Table
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
    console.log('✅ Permissions table created or already exists.');

    // Role_Permissions Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INT,
        permission_id INT,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Role_Permissions table created or already exists.');

    // Activity Logs Table
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
    console.log('✅ Activity logs table created or already exists.');

    // 2. Add columns to admin_users table
    const columnsToAdd = [
      {
        name: 'role_id',
        check: 'role_id',
        alter: `
          ALTER TABLE admin_users 
          ADD COLUMN role_id INT,
          ADD COLUMN failed_login_attempts INT DEFAULT 0,
          ADD COLUMN locked_until TIMESTAMP NULL,
          ADD CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
        `
      },
      {
        name: 'last_login_at',
        check: 'last_login_at',
        alter: `ALTER TABLE admin_users ADD COLUMN last_login_at TIMESTAMP NULL`
      },
      {
        name: 'password_hash',
        check: 'password_hash',
        alter: `ALTER TABLE admin_users ADD COLUMN password_hash VARCHAR(255) AFTER password`
      }
    ];

    for (const col of columnsToAdd) {
      try {
        const checkCols = await executeQuery(`SHOW COLUMNS FROM admin_users LIKE '${col.check}'`);
        
        if (checkCols.success && checkCols.data.length === 0) {
          await executeQuery(col.alter);
          console.log(`✅ Added ${col.name} column(s) to admin_users table.`);
        } else {
          console.log(`⏭️  ${col.name} column(s) already exist in admin_users.`);
        }
      } catch (error) {
        // If constraint already exists, that's okay
        if (error.message.includes('Duplicate key name') || error.message.includes('already exists')) {
          console.log(`⏭️  ${col.name} column(s) or constraint already exist.`);
        } else {
          throw error;
        }
      }
    }

    // 3. Make password nullable
    try {
      // Check current password column definition
      const passwordCol = await executeQuery(`SHOW COLUMNS FROM admin_users WHERE Field = 'password'`);
      if (passwordCol.success && passwordCol.data.length > 0) {
        const colDef = passwordCol.data[0];
        if (colDef.Null === 'NO') {
          await executeQuery(`ALTER TABLE admin_users MODIFY COLUMN password VARCHAR(255) NULL`);
          console.log('✅ Made password column nullable.');
        } else {
          console.log('⏭️  Password column is already nullable.');
        }
      }
    } catch (error) {
      console.log(`⏭️  Error making password nullable: ${error.message}`);
    }

    // 4. Insert Default Roles
    const roles = [
      { name: 'Super Admin', description: 'Full access to all features' },
      { name: 'Admin', description: 'Can manage content and users' },
      { name: 'Editor', description: 'Can manage content' },
      { name: 'Viewer', description: 'Read-only access' }
    ];

    for (const role of roles) {
      await executeQuery(
        `INSERT IGNORE INTO roles (name, description) VALUES (?, ?)`,
        [role.name, role.description]
      );
    }
    console.log('✅ Default roles inserted or already exist.');

    // 5. Insert Default Permissions
    const resources = [
      'Products', 'Categories', 'Tags', 'Banners', 'Settings', 'Admin Users', 'Roles'
    ];
    const actions = ['View', 'Create', 'Edit', 'Delete'];

    for (const res of resources) {
      for (const act of actions) {
        const name = `${act} ${res}`;
        const slug = `${act.toLowerCase()}_${res.toLowerCase().replace(' ', '_')}`;
        await executeQuery(
          `INSERT IGNORE INTO permissions (name, slug, group_name) VALUES (?, ?, ?)`,
          [name, slug, res]
        );
      }
    }
    console.log('✅ Default permissions inserted or already exist.');

    // 6. Assign all permissions to Super Admin
    const superAdminRes = await executeQuery(`SELECT id FROM roles WHERE name = 'Super Admin'`);
    if (superAdminRes.success && superAdminRes.data.length > 0) {
      const superRoleId = superAdminRes.data[0].id;
      
      const allPermsRes = await executeQuery(`SELECT id FROM permissions`);
      if (allPermsRes.success) {
        for (const perm of allPermsRes.data) {
          await executeQuery(
            `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
            [superRoleId, perm.id]
          );
        }
      }
      console.log('✅ Assigned all permissions to Super Admin.');

      // 7. Migrate existing users to new roles
      const rolesMapRes = await executeQuery(`SELECT id, name FROM roles`);
      if (rolesMapRes.success) {
        const rolesMap = {};
        rolesMapRes.data.forEach(r => rolesMap[r.name.toLowerCase().replace(' ', '_')] = r.id);
        rolesMap['admin'] = rolesMap['super_admin']; 

        const usersRes = await executeQuery(`SELECT id, role FROM admin_users WHERE role_id IS NULL`);
        if (usersRes.success) {
          for (const user of usersRes.data) {
            const newRoleId = rolesMap[user.role] || rolesMap['viewer'];
            if (newRoleId) {
              await executeQuery(`UPDATE admin_users SET role_id = ? WHERE id = ?`, [newRoleId, user.id]);
            }
          }
          console.log(`✅ Migrated ${usersRes.data.length} users to new roles.`);
        }
      }

      // 8. Fix RBAC Data - Update all users with NULL role_id to Super Admin
      await executeQuery(`UPDATE admin_users SET role_id = ? WHERE role_id IS NULL`, [superRoleId]);
      console.log('✅ Assigned Super Admin role to users with no role.');

      // Ensure 'admin' user is Super Admin
      await executeQuery(`UPDATE admin_users SET role_id = ? WHERE username = 'admin'`, [superRoleId]);
      console.log('✅ Ensured "admin" user is Super Admin.');
    }

    console.log('🎉 Complete admin_users migration finished successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Only call process.exit if run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAdminUsersComplete()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  migrateAdminUsersComplete();
}

