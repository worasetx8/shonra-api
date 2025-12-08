import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { readdir } from "fs/promises";
import { executeQuery } from "../config/database.js";
import Logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env") });
if (!process.env.DB_HOST && !process.env.DB_PASSWORD) {
  dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });
}

/**
 * Run all migration files from archive directory
 */
async function runAllMigrations() {
  try {
    console.log("\n🔄 Running all migrations from archive...");
    console.log(`📊 Database: ${process.env.DB_NAME || "shopee_affiliate"}\n`);

    // Test database connection first
    console.log("🔌 Testing database connection...");
    const { testConnection } = await import("../config/database.js");
    const connected = await testConnection();
    
    if (!connected) {
      console.error("\n❌ Cannot connect to database!");
      console.error("Please check:");
      console.error("   1. MySQL server is running");
      console.error("   2. Database credentials in .env file");
      console.error("   3. Database exists");
      process.exit(1);
    }

    console.log("✅ Database connection successful!\n");

    // Get all migration files from archive directory
    const archiveDir = path.join(__dirname, "..", "migrations", "archive");
    const files = await readdir(archiveDir);
    
    // Filter only .js files and sort by name
    // Ensure migrate_ensure_all_tables.js runs FIRST to create all base tables
    const migrationFiles = files
      .filter(file => file.endsWith('.js'))
      .sort((a, b) => {
        // migrate_ensure_all_tables.js should always run first
        if (a === 'migrate_ensure_all_tables.js') return -1;
        if (b === 'migrate_ensure_all_tables.js') return 1;
        // Otherwise sort alphabetically
        return a.localeCompare(b);
      });

    if (migrationFiles.length === 0) {
      console.log("⚠️  No migration files found in archive directory");
      process.exit(0);
    }

    console.log(`📋 Found ${migrationFiles.length} migration file(s):`);
    migrationFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log();

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Run each migration file
    for (let i = 0; i < migrationFiles.length; i++) {
      const file = migrationFiles[i];
      const filePath = path.join(archiveDir, file);

      try {
        console.log(`\n[${i + 1}/${migrationFiles.length}] Running: ${file}...`);
        
        // Import migration file
        // Note: Most migration files execute immediately on import (they call the function at the end)
        // We need to use dynamic import with file:// protocol for Windows paths
        const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
        
        // Import and execute migration
        // Migration files typically execute on import, so we just import them
        const migrationModule = await import(fileUrl);
        
        // If the migration exports a promise, wait for it to complete
        if (migrationModule.default && typeof migrationModule.default.then === 'function') {
          await migrationModule.default;
        }
        
        // Give migration a moment to complete any async operations
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log(`   ✅ ${file} completed successfully`);
        successCount++;
      } catch (error) {
        // Check if it's a "table already exists" or similar error (migration already run)
        if (error.message.includes("already exists") || 
            error.message.includes("Duplicate") ||
            error.code === "ER_DUP_ENTRY" ||
            error.code === "ER_DUP_KEYNAME") {
          console.log(`   ⏭️  ${file} skipped (already applied)`);
          skipCount++;
        } else {
          console.error(`   ❌ ${file} failed: ${error.message}`);
          errorCount++;
          
          // Continue with next migration even if one fails
          console.log(`   ⚠️  Continuing with next migration...`);
        }
      }
    }

    // Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Migration Summary:");
    console.log(`   ✅ Completed: ${successCount} migrations`);
    console.log(`   ⏭️  Skipped: ${skipCount} migrations (already applied)`);
    console.log(`   ❌ Errors: ${errorCount} migrations`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (errorCount === 0) {
      console.log("🎉 All migrations completed successfully!");
      console.log("\n💡 Next steps:");
      console.log("   1. Start server: npm run dev\n");
    } else {
      console.warn(`⚠️  Some migrations failed. Check errors above.`);
    }

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error("\n❌ Error running migrations:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migrations
runAllMigrations();

