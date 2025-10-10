import dotenv from 'dotenv';
dotenv.config();

import { retrieveContext } from '@/lib/rag';
import { generateRAGInsights } from '@/lib/insights';
import fs from 'fs';

async function main(){
  const sample = JSON.parse(fs.readFileSync('data/mock_merriman_2020.json','utf8'));
  const property = sample as any;

  console.log('Retrieving context...');
  const ctx = await retrieveContext(property, 3, 5);
  console.log('Market context:', ctx.marketContext);
  console.log('Legal context length:', ctx.legalContext.length);

  console.log('Generating insights...');
  const finance = require('../lib/finance').computeFinance(property); // avoid TS import cycle
  const insights = await generateRAGInsights(property, finance);
  console.log('Insights:', insights);
}

main().catch(err=>{
  console.error(err);
  process.exit(1);
});
