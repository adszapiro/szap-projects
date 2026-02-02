import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const { data: papers } = await supabase.from('research_papers').select('id, title, status, key_insights');
  
  console.log("📚 Research Papers Status:");
  for (const p of papers || []) {
    console.log(`  - ${p.title}: ${p.status} (${p.key_insights?.length || 0} insights)`);
  }
  
  const { data: strategies } = await supabase.from('strategies').select('name, paper_id').eq('status', 'deployed');
  console.log(`\n📊 Deployed Strategies: ${strategies?.length || 0}`);
  const withPaper = strategies?.filter(s => s.paper_id) || [];
  console.log(`   From papers: ${withPaper.length}`);
}
main();
