import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const { data } = await supabase.from('strategies').select('name, code, asset_class').eq('status', 'deployed').limit(2);
  
  if (data) {
    for (const s of data) {
      console.log(`\n=== ${s.name} (${s.asset_class}) ===`);
      console.log(s.code?.slice(0, 800) || 'NO CODE');
    }
  }
}
main();
