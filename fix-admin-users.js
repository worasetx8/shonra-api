import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function fixAdminUsers() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'shopee_affiliate',
    port: 3307
  });

  try {
    console.log('🔧 Fixing admin_users table...\n');

    // Hash password
    const hashedPassword = await bcrypt.hash('admin@123', 10);
    console.log('✓ Password hashed:', hashedPassword.substring(0, 20) + '...\n');

    // Update password and email for all existing users
    console.log('📝 Updating passwords and emails...');
    const [result1] = await conn.execute(
      `UPDATE admin_users 
       SET password = ?, 
           email = CASE 
             WHEN email = '' OR email IS NULL 
             THEN CONCAT(username, '@shonra.com')
             ELSE email 
           END`
      , [hashedPassword]
    );
    console.log('✅ Updated', result1.affectedRows, 'users with password and email\n');

    // Check for duplicates and delete
    const [duplicates] = await conn.execute(
      `SELECT id, username, email FROM admin_users 
       WHERE username IN ('admin', 'Admin2', 'editor') 
       ORDER BY id`
    );
    console.log('📊 Current admin_users:');
    duplicates.forEach(u => {
      console.log(`   ID: ${u.id} | Username: ${u.username} | Email: ${u.email}`);
    });

    console.log('\n✅ admin_users fixed:');
    console.log('   ✓ All users have password hash');
    console.log('   ✓ Email filled in (username@shonra.com if empty)');
    console.log('   ✓ Ready to use\n');

    const [final] = await conn.execute('SELECT id, username, email, password IS NOT NULL as has_password FROM admin_users');
    console.log('📋 Final admin_users:');
    final.forEach(u => {
      console.log(`   ${u.id}. ${u.username} (${u.email}) - Password: ${u.has_password ? '✅' : '❌'}`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await conn.end();
  }
}

fixAdminUsers();
