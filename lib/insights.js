// Auto-generated CommonJS helper for quick local testing
function generateRuleBasedInsights(finance) {
  const { roi, capRate, dscr, cashFlowMonthly, affordabilityScore } = finance.metrics || {};
  let summary = "";
  let riskLevel = "moderate";
  const tags = [];

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

module.exports = { generateRuleBasedInsights };
