/**
 * Seed Research Papers into the Database
 * Adds the known academic papers and extracts strategies from them
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { addAllKnownPapers, extractStrategies, deployStrategies, getPaperStats } from "../src/papers/manager.js";
import { getAllPapers } from "../src/db.js";

async function seedPapers() {
  console.log("📚 SEEDING RESEARCH PAPERS");
  console.log("==========================\n");

  // Add all known papers
  console.log("Adding known papers to database...\n");
  const paperIds = await addAllKnownPapers();
  console.log(`\n✓ Added ${paperIds.length} new papers\n`);

  // Get all papers
  const papers = await getAllPapers();
  console.log(`Total papers in database: ${papers.length}\n`);

  // Extract and deploy strategies from pending papers
  console.log("Extracting strategies from papers...\n");
  
  for (const paper of papers) {
    if (paper.status === "pending" || paper.status === "extracted") {
      console.log(`\n📖 Processing: "${paper.title}"`);
      
      try {
        const strategies = await extractStrategies(paper.id);
        
        if (strategies.length > 0) {
          const strategyIds = await deployStrategies(paper.id, strategies);
          console.log(`   ✓ Deployed ${strategyIds.length} strategies`);
        } else {
          console.log(`   ⚠️ No strategies extracted`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error}`);
      }
    } else {
      console.log(`⏭️  Skipping "${paper.title}" (status: ${paper.status})`);
    }
  }

  // Print final stats
  console.log("\n==========================");
  const stats = await getPaperStats();
  console.log(`\n📊 FINAL STATS:`);
  console.log(`   Papers: ${stats.totalPapers} (${stats.activePapers} active, ${stats.pendingPapers} pending)`);
  console.log(`   Strategies: ${stats.totalStrategies}`);
  console.log("\n✅ Paper seeding complete!");
}

seedPapers().catch(console.error);
