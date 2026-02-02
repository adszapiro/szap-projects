/**
 * Process Research Papers
 * Extracts strategies from pending papers and deploys them
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { extractStrategiesFromKeyIdeas } from '../src/papers/extractor.js';
import { initializeStrategyPerformance } from '../src/db.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  source: string;
  key_insights: string[];
  status: string;
}

async function processPaper(paper: Paper): Promise<number> {
  console.log(`\n📖 Processing: "${paper.title}"`);
  
  try {
    // Extract strategies using Claude
    const strategies = await extractStrategiesFromKeyIdeas(paper.key_insights, {
      title: paper.title,
      authors: paper.authors,
      year: paper.year,
      source: paper.source,
    });
    
    if (strategies.length === 0) {
      console.log(`   ⚠️ No strategies extracted`);
      await supabase.from('research_papers').update({ status: 'extracted' }).eq('id', paper.id);
      return 0;
    }
    
    console.log(`   📊 Extracted ${strategies.length} strategies`);
    
    // Deploy each strategy
    let deployed = 0;
    for (const strategy of strategies) {
      // Check if strategy with same name already exists
      const { data: existing } = await supabase
        .from('strategies')
        .select('id')
        .eq('name', strategy.name)
        .single();
      
      if (existing) {
        console.log(`   ⏭️ Skipping "${strategy.name}" (already exists)`);
        continue;
      }
      
      // Determine symbols based on asset class
      let symbols = strategy.symbols;
      if (!symbols || symbols.length === 0) {
        if (strategy.assetClass === 'stock' || strategy.assetClass === 'both') {
          symbols = ['SPY', 'QQQ', 'IWM'];
        } else {
          symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
        }
      }
      
      // Insert strategy
      const { data: newStrategy, error } = await supabase
        .from('strategies')
        .insert({
          name: strategy.name,
          description: strategy.description,
          code: strategy.code,
          asset_class: strategy.assetClass === 'both' ? 'stock' : strategy.assetClass,
          symbols,
          status: 'deployed',
          source_model: 'claude-paper-extraction',
          paper_id: paper.id,
        })
        .select('id')
        .single();
      
      if (error) {
        console.log(`   ❌ Failed to deploy "${strategy.name}": ${error.message}`);
        continue;
      }
      
      // Initialize performance tracking
      await initializeStrategyPerformance(newStrategy.id);
      
      console.log(`   ✅ Deployed: "${strategy.name}" (${strategy.assetClass})`);
      deployed++;
      
      // If strategy applies to both, create a crypto version too
      if (strategy.assetClass === 'both') {
        const cryptoSymbols = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
        const { data: cryptoStrategy, error: cryptoError } = await supabase
          .from('strategies')
          .insert({
            name: `${strategy.name} (Crypto)`,
            description: strategy.description,
            code: strategy.code,
            asset_class: 'crypto',
            symbols: cryptoSymbols,
            status: 'deployed',
            source_model: 'claude-paper-extraction',
            paper_id: paper.id,
          })
          .select('id')
          .single();
        
        if (!cryptoError && cryptoStrategy) {
          await initializeStrategyPerformance(cryptoStrategy.id);
          console.log(`   ✅ Deployed: "${strategy.name} (Crypto)"`);
          deployed++;
        }
      }
    }
    
    // Update paper status
    await supabase.from('research_papers').update({ status: 'active' }).eq('id', paper.id);
    
    return deployed;
    
  } catch (error) {
    console.error(`   ❌ Error processing paper: ${error}`);
    return 0;
  }
}

async function main() {
  console.log("🔬 RESEARCH PAPER PROCESSOR");
  console.log("═══════════════════════════════════════\n");
  
  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY not set!");
    process.exit(1);
  }
  console.log("✅ Anthropic API key configured\n");
  
  // Get pending papers
  const { data: papers, error } = await supabase
    .from('research_papers')
    .select('*')
    .in('status', ['pending', 'extracted'])
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error("❌ Failed to fetch papers:", error);
    process.exit(1);
  }
  
  console.log(`📚 Found ${papers?.length || 0} papers to process\n`);
  
  if (!papers || papers.length === 0) {
    console.log("No pending papers. All done!");
    return;
  }
  
  let totalDeployed = 0;
  
  for (const paper of papers) {
    const deployed = await processPaper(paper);
    totalDeployed += deployed;
    
    // Rate limit between papers
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log("\n═══════════════════════════════════════");
  console.log(`✅ Processing complete!`);
  console.log(`   Papers processed: ${papers.length}`);
  console.log(`   Strategies deployed: ${totalDeployed}`);
}

main().catch(console.error);
