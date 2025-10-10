import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { computeFinance } from '@/lib/finance';
import { generateRAGInsights } from '@/lib/insights';

async function runTest() {
  console.log('🏡 Running Homora full pipeline test...\n');

  const property: any = {
    address: '10546 Merriman Rd, Cupertino, CA 95014',
    price: 2649888,
    monthlyRent: 6114,
    region: 'Cupertino'
  };

  const finance = computeFinance(property as any);
  console.log('💰 Finance summary:\n', { metrics: finance.metrics });

  console.log('\nGenerating insights (RAG + fallback)...');
  const insights = await generateRAGInsights(property, finance as any);
  console.log('\n🧠 Insights:\n', insights);

  const result = {
    property: property.address,
    metrics: finance.metrics,
    insights: (insights as any).financialSummary || insights,
  };

  console.log('\n✅ Final Homora output:\n', result);
}

runTest().catch(err => {
  console.error('❌ Error in test:', err);
  process.exit(1);
});
