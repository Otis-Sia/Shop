const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('products')
    .update({ currency: 'KES' })
    .eq('currency', 'XAF');
    
  if (error) console.error("Error:", error);
  else console.log("Success! Updated currencies to KES");
}
run();
