// lib/insights.ts
import { FinanceSummary } from "../types/finance";

export interface InsightSummary {
  summary: string;
  riskLevel: "low" | "moderate" | "high";
  tags?: string[];
}

export function generateRuleBasedInsights(finance: FinanceSummary): InsightSummary {
  const { roi, capRate, dscr, cashFlowMonthly, affordabilityScore } = finance.metrics as any;
  let summary = "";
  let riskLevel: "low" | "moderate" | "high" = "moderate";
  const tags: string[] = [];

  // --- Rule logic ---
  if (roi > 0.08 && dscr > 1.25) {
    summary += "Strong performance: high ROI and solid debt coverage. ";
    riskLevel = "low";
    tags.push("stable", "income");
  } else if (roi > 0.05) {
    summary += "Moderate return with manageable leverage. ";
    riskLevel = "moderate";
    tags.push("balanced");
  } else {
    summary += "Low ROI suggests limited short-term gains. ";
    riskLevel = "high";
    tags.push("speculative");
  }

  if (cashFlowMonthly < 0) summary += "Negative cash flow could strain monthly expenses. ";
  if (affordabilityScore < 60) summary += "Affordability is below average for this region. ";
  else summary += "Affordability appears reasonable for most investors. ";

  if (capRate >= 0.06) summary += "Cap rate is attractive versus typical 5-6% markets.";
  else summary += "Cap rate is modest, relying more on appreciation potential.";

  return { summary: summary.trim(), riskLevel, tags };
}

// RAG-based insights
import { similaritySearch } from './rag';

export async function generateRAGInsights(property: any, finance: FinanceSummary) {
  const region = (property?.region) || 'California';
  const contextDocs = await similaritySearch(region, 3);
  const contextText = contextDocs.map(d => d.text).join('\n---\n');

  const prompt = `You are a real-estate investment analyst. Use the following market context and financial metrics to write a professional summary.\n\nContext:\n${contextText}\n\nProperty Finance Data:\n${JSON.stringify(finance.metrics, null, 2)}\n\nExplain ROI, DSCR, cap rate, and risk in 3–4 sentences.`;

  // Call to external LLM (NVIDIA example) — keep optional and pluggable
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    // Fallback: return a synthesized summary using the context and simple templating
    const summary = `Based on regional context and the numbers provided, the property shows ${finance.metrics.capRate.toFixed(2)} cap rate and an annualized ROI of ${finance.metrics.cashOnCash?.toFixed(2) ?? 'N/A'}%. DSCR is ${finance.metrics.dscr.toFixed(2)}, indicating ${finance.metrics.dscr >= 1.25 ? 'healthy' : 'marginal'} debt coverage.`;
    return { summary, contextUsed: contextDocs };
  }

  const resp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta/llama-3.1-8b-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 150
    })
  });

  const json = await resp.json();
  return { summary: json.choices?.[0]?.message?.content ?? '', contextUsed: contextDocs };
}
