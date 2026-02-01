import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function setupDatabase() {
  console.log("Setting up Quant Agent database...");
  console.log("URL:", process.env.SUPABASE_URL);

  // Create tables one by one using raw SQL via rpc
  // Since we can't run raw SQL directly, we'll use the REST API approach
  // Actually, let's just insert a test record to verify connection
  
  try {
    // Test connection by trying to select from a table
    // If table doesn't exist, we'll catch the error
    const { error: testError } = await supabase
      .from("agent_logs")
      .select("id")
      .limit(1);

    if (testError && testError.code === "42P01") {
      console.log("Tables don't exist yet.");
      console.log("");
      console.log("Please run the following SQL in your Supabase SQL Editor:");
      console.log("https://supabase.com/dashboard/project/ajtndzurrkpvujogfvcl/sql");
      console.log("");
      console.log("Copy the contents of: apps/quant-agent/schema.sql");
      process.exit(1);
    } else if (testError) {
      console.error("Database error:", testError);
      process.exit(1);
    }

    console.log("✅ Database tables exist!");
    
    // Insert a test log
    const { error: insertError } = await supabase.from("agent_logs").insert({
      level: "info",
      action: "setup_verified",
      details: { message: "Database setup verified", timestamp: new Date().toISOString() },
    });

    if (insertError) {
      console.error("Failed to insert test log:", insertError);
    } else {
      console.log("✅ Test log inserted successfully!");
    }

    console.log("");
    console.log("Database is ready. You can now start the agent with:");
    console.log("  npm run start");

  } catch (error) {
    console.error("Setup failed:", error);
    process.exit(1);
  }
}

setupDatabase();
