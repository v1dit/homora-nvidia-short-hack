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
import { retrieveContext } from './rag';

export interface RAGInsights {
  financialSummary: string;
  legalSummary: string[];
  contextUsed: string[];
  riskFactors: string[];
  recommendations: string[];
}

export async function generateRAGInsights(property: any, finance: FinanceSummary): Promise<RAGInsights> {
  const { marketContext, legalContext } = await retrieveContext(property, 3, 5);
  
  // Combine market and legal context
  const marketText = marketContext.map(d => d.text).join('\n---\n');
  const legalText = legalContext.map(d => d.text).join('\n---\n');
  const contextUsed = [
    ...marketContext.map(d => `market_${d.region}`),
    ...legalContext.map(d => d.filename)
  ];

  // Generate financial summary
  const financialPrompt = `You are a real-estate investment analyst. Use the following market context and financial metrics to write a professional financial summary.\n\nMarket Context:\n${marketText}\n\nProperty Finance Data:\n${JSON.stringify(finance.metrics, null, 2)}\n\nExplain ROI, DSCR, cap rate, and financial risk in 3–4 sentences.`;

  // Generate legal summary
  const legalPrompt = `You are a real-estate legal analyst. Review the following legal documents and regulations that apply to this property. Extract key restrictions, requirements, and potential issues that could affect rental income or property value.\n\nLegal Context:\n${legalText}\n\nProperty Location: ${property?.address || property?.location || 'Unknown'}\n\nProvide 3-5 bullet points highlighting the most important legal considerations.`;

  // Call to external LLM (NVIDIA example) — keep optional and pluggable
  const apiKey = process.env.NVIDIA_API_KEY;
  
  let financialSummary = '';
  let legalSummary: string[] = [];
  let riskFactors: string[] = [];
  let recommendations: string[] = [];

  if (!apiKey) {
    // Fallback: return synthesized summaries
    financialSummary = `Based on regional context, the property shows ${finance.metrics.capRate.toFixed(2)} cap rate and an annualized ROI of ${finance.metrics.cashOnCash?.toFixed(2) ?? 'N/A'}%. DSCR is ${finance.metrics.dscr.toFixed(2)}, indicating ${finance.metrics.dscr >= 1.25 ? 'healthy' : 'marginal'} debt coverage.`;
    
    // Extract key legal points from context
    legalSummary = legalContext.slice(0, 3).map(legal => {
      const text = legal.text;
      if (text.includes('HOA') && text.includes('prohibited')) {
        return '• HOA restrictions may limit property modifications';
      } else if (text.includes('rental') && text.includes('limit')) {
        return '• Rental restrictions may affect income potential';
      } else if (text.includes('parking') && text.includes('required')) {
        return '• Parking requirements may impact tenant appeal';
      } else {
        return '• Review local regulations for compliance requirements';
      }
    });

    riskFactors = [
      ...(finance.metrics.dscr < 1.2 ? ['Low debt service coverage ratio'] : []),
      ...(finance.metrics.cashFlowMonthly < 0 ? ['Negative monthly cash flow'] : []),
      ...(legalContext.length > 0 ? ['Legal/regulatory compliance requirements'] : [])
    ];

    recommendations = [
      'Review all HOA and city regulations before purchase',
      'Consider impact of rental restrictions on ROI projections',
      'Verify parking and utility requirements with local authorities'
    ];
  } else {
    try {
      // Generate financial summary
      const financialResp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta/llama-3.1-8b-instruct",
          messages: [{ role: "user", content: financialPrompt }],
          temperature: 0.4,
          max_tokens: 150
        })
      });

      const financialJson = await financialResp.json();
      financialSummary = financialJson.choices?.[0]?.message?.content ?? '';

      // Generate legal summary
      const legalResp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta/llama-3.1-8b-instruct",
          messages: [{ role: "user", content: legalPrompt }],
          temperature: 0.3,
          max_tokens: 200
        })
      });

      const legalJson = await legalResp.json();
      const legalContent = legalJson.choices?.[0]?.message?.content ?? '';
      legalSummary = legalContent.split('\n').filter(line => line.trim().startsWith('•')).slice(0, 5);

      // Generate risk factors and recommendations
      riskFactors = [
        ...(finance.metrics.dscr < 1.2 ? ['Low debt service coverage ratio'] : []),
        ...(finance.metrics.cashFlowMonthly < 0 ? ['Negative monthly cash flow'] : []),
        ...(legalContext.length > 0 ? ['Legal/regulatory compliance requirements'] : [])
      ];

      recommendations = [
        'Review all HOA and city regulations before purchase',
        'Consider impact of rental restrictions on ROI projections',
        'Verify parking and utility requirements with local authorities'
      ];
    } catch (error) {
      console.error('❌ Failed to generate AI insights:', error);
      // Use fallback summaries
      financialSummary = `Property shows ${finance.metrics.capRate.toFixed(2)} cap rate with ${finance.metrics.dscr.toFixed(2)} DSCR.`;
      legalSummary = ['• Review local regulations for compliance requirements'];
    }
  }

  return {
    financialSummary,
    legalSummary,
    contextUsed,
    riskFactors,
    recommendations
  };
}
