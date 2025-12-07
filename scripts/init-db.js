import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { initializeDatabase, testConnection } from "../config/database.js";
import Logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env") });
if (!process.env.DB_HOST && !process.env.DB_PASSWORD) {
  dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });
}

/**
 * Initialize database - create all tables if they don't exist
 */
async function initDatabase() {
  try {
    console.log("\n🔄 Initializing database...");
    console.log(`📊 Database: ${process.env.DB_NAME || "shopee_affiliate"}`);
    console.log(`📍 Host: ${process.env.DB_HOST || "localhost"}\n`);

    // Test database connection first
    console.log("🔌 Testing database connection...");
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

    // Initialize database tables
    console.log("📦 Creating tables...");
    await initializeDatabase();
    
    console.log("\n✅ Database initialized successfully!");
    console.log("📋 All tables have been created (or already exist)");
    console.log("\n💡 Next steps:");
    console.log("   1. Run migrations: npm run migrate:all (includes indexes)");
    console.log("   2. Start server: npm run dev\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error initializing database:");
    console.error(error.message);
    
    if (error.code === "ECONNREFUSED") {
      console.error("\n💡 Troubleshooting:");
      console.error("   1. Check if MySQL server is running");
      console.error("   2. Verify database credentials in .env");
      console.error("   3. Check database name is correct");
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("\n💡 Troubleshooting:");
      console.error("   1. Check database username and password");
      console.error("   2. Verify user has CREATE TABLE permissions");
    }
    
    process.exit(1);
  }
}

// Run initialization
initDatabase();

