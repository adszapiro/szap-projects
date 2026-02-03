import { config } from "dotenv";
config({ path: ".env.local" });

import { runDailyReportCycle } from "../src/reports/daily.js";

async function main() {
  console.log("Running daily report...");
  await runDailyReportCycle();
  console.log("Done!");
}

main().catch(console.error);
