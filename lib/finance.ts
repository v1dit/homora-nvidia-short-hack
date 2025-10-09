// lib/finance.ts
import type {
  FinanceInputs,
  ExpenseBreakdown,
  MortgageBreakdown,
  FinanceSummary,
  FinanceAssumptions,
  PropertyForFinance,
  LegalPenalty,
} from "@/types/finance";

/** Default knobs you can tweak globally or override per-request */
export const FINANCE_DEFAULTS: FinanceAssumptions = {
  // Purchase / loan
  downPaymentPct: 0.20,               // 20%
  annualInterestRate: 0.065,          // 6.5% APR
  loanYears: 30,

  // Operating assumptions
  propertyTaxRatePct: null,           // if null, try property.taxRatePct, else fallback below
  fallbackPropertyTaxRatePct: 0.012,  // 1.2% of price per year
  insurancePct: 0.004,                // 0.4% of price per year
  maintenancePct: 0.01,               // 1% of price per year
  managementPct: 0.08,                // 8% of rent
  vacancyPct: 0.05,                   // 5% of rent
  hoaMonthly: 0,                      // override if property has HOA
  utilitiesMonthly: 0,

  // Income assumptions
  monthlyRent: null,                  // if null, estimate using price * rentYieldPct / 12
  rentYieldPct: 0.072,                // 7.2% of price per year (~0.6%/mo “rule of thumb”)

  // Scoring
  dscrTarget: 1.20,                   // >1.2 is healthy
  negativeCashflowWeight: 40,         // points deducted at full-scale neg. cashflow
  lowDscrWeight: 30,                  // points deducted at low DSCR
  riskBasePenalty: 5,                 // fixed risk deduction (can tune)
};

/** Compute the standard monthly PI mortgage payment. */
export function monthlyMortgagePI(
  principal: number,
  annualRate: number,
  years: number
): number {
  const r = annualRate / 12;
  const n = years * 12;
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
  const pow = Math.pow(1 + r, n);
  return principal * ((r * pow) / (pow - 1));
}

/** Safely get a property tax rate to use (property -> provided -> fallback). */
function resolvePropertyTaxRatePct(
  property: PropertyForFinance | null,
  assumptions: FinanceAssumptions
): number {
  if (assumptions.propertyTaxRatePct !== null) return assumptions.propertyTaxRatePct;
  if (property?.taxRatePct !== undefined && property.taxRatePct !== null) {
    return property.taxRatePct;
  }
  return assumptions.fallbackPropertyTaxRatePct;
}

/** Estimate rent if not supplied: price * rentYieldPct / 12. */
function estimateMonthlyRent(
  price: number,
  assumptions: FinanceAssumptions
): number {
  const yearly = price * assumptions.rentYieldPct;
  return yearly / 12;
}

/** Compute all operating expenses (monthly). */
export function computeMonthlyExpenses(
  price: number,
  monthlyRent: number,
  assumptions: FinanceAssumptions,
  property: PropertyForFinance | null
): ExpenseBreakdown {
  const taxRatePct = resolvePropertyTaxRatePct(property, assumptions);

  const taxesMonthly = (price * taxRatePct) / 12;
  const insuranceMonthly = (price * assumptions.insurancePct) / 12;
  const maintenanceMonthly = (price * assumptions.maintenancePct) / 12;

  // %s of rent (set to 0 if rent is 0)
  const mgmtMonthly = monthlyRent * (assumptions.managementPct ?? 0);
  const vacancyMonthly = monthlyRent * (assumptions.vacancyPct ?? 0);

  const hoaMonthly = property?.hoaMonthly ?? assumptions.hoaMonthly ?? 0;
  const utilitiesMonthly = assumptions.utilitiesMonthly ?? 0;

  const total =
    taxesMonthly +
    insuranceMonthly +
    maintenanceMonthly +
    mgmtMonthly +
    vacancyMonthly +
    hoaMonthly +
    utilitiesMonthly;

  return {
    taxesMonthly,
    insuranceMonthly,
    maintenanceMonthly,
    managementMonthly: mgmtMonthly,
    vacancyMonthly,
    hoaMonthly,
    utilitiesMonthly,
    totalMonthly: Math.max(0, Number(total.toFixed(2))),
  };
}

/** Primary entrypoint: combine mortgage + expenses into a single finance summary. */
export function computeFinance(
  property: PropertyForFinance,
  inputs?: Partial<FinanceInputs>,
  customAssumptions?: Partial<FinanceAssumptions>
): FinanceSummary {
  const assumptions: FinanceAssumptions = { ...FINANCE_DEFAULTS, ...customAssumptions };

  const price = inputs?.price ?? property.price ?? 0;
  const downPaymentPct = inputs?.downPaymentPct ?? assumptions.downPaymentPct;
  const downPayment = price * downPaymentPct;
  const loanAmount = Math.max(0, price - downPayment);

  const rate = inputs?.annualInterestRate ?? assumptions.annualInterestRate;
  const years = inputs?.loanYears ?? assumptions.loanYears;

  // Income
  const monthlyRent =
    inputs?.monthlyRent ??
    assumptions.monthlyRent ??
    estimateMonthlyRent(price, assumptions);

  // Mortgage
  const mortgagePI = monthlyMortgagePI(loanAmount, rate, years);
  const mortgage: MortgageBreakdown = {
    loanAmount,
    downPayment,
    monthlyPI: Number(mortgagePI.toFixed(2)),
    annualDebtService: Number((mortgagePI * 12).toFixed(2)),
    apr: rate,
    termYears: years,
  };

  // Expenses (monthly)
  const expenses = computeMonthlyExpenses(price, monthlyRent, assumptions, property);

  // Cashflow & returns
  const grossIncomeMonthly = monthlyRent;
  const operatingExpensesMonthly = expenses.totalMonthly;
  const noiMonthly = Math.max(0, grossIncomeMonthly - operatingExpensesMonthly);
  const noiAnnual = noiMonthly * 12;

  const capRate = price > 0 ? noiAnnual / price : 0;

  const cashFlowMonthly = grossIncomeMonthly - operatingExpensesMonthly - mortgage.monthlyPI;
  const cashFlowAnnual = cashFlowMonthly * 12;

  const cashOnCash =
    downPayment > 0 ? (cashFlowAnnual / downPayment) * 100 : 0;

  // DSCR = NOI / Debt Service (annual)
  const dscr =
    mortgage.annualDebtService > 0 ? noiAnnual / mortgage.annualDebtService : 0;

  // Affordability / Investment score (0-100, higher is better)
  const baseAffordabilityScore = scoreAffordability({
    cashFlowMonthly,
    monthlyRent,
    dscr,
    assumptions,
  });

  // Apply legal penalties if provided
  const legalPenalties = inputs?.legalPenalties || [];
  const legalPenaltyTotal = legalPenalties.reduce((sum, penalty) => sum + penalty.penalty, 0);
  const affordabilityScore = Math.max(0, baseAffordabilityScore - legalPenaltyTotal);

  return {
    inputs: {
      price,
      monthlyRent,
      downPaymentPct,
      annualInterestRate: rate,
      loanYears: years,
    },
    mortgage,
    expenses,
    metrics: {
      grossIncomeMonthly: Number(grossIncomeMonthly.toFixed(2)),
      noiMonthly: Number(noiMonthly.toFixed(2)),
      noiAnnual: Number(noiAnnual.toFixed(2)),
      capRate: Number(capRate.toFixed(4)),
      cashFlowMonthly: Number(cashFlowMonthly.toFixed(2)),
      cashFlowAnnual: Number(cashFlowAnnual.toFixed(2)),
      cashOnCash: Number(cashOnCash.toFixed(2)),
      dscr: Number(dscr.toFixed(3)),
      affordabilityScore: Math.max(0, Math.min(100, Math.round(affordabilityScore))),
    },
    assumptions,
  };
}

/**
 * Analyze legal context and generate penalties for affordability scoring
 */
export function analyzeLegalPenalties(legalContext: any[]): LegalPenalty[] {
  const penalties: LegalPenalty[] = [];
  
  for (const legal of legalContext) {
    const text = legal.text.toLowerCase();
    
    // HOA restrictions - look for prohibited installations or HOA rules
    if ((text.includes('hoa') && (text.includes('prohibited') || text.includes('restricted'))) ||
        (text.includes('prohibited') && (text.includes('installation') || text.includes('unit'))) ||
        text.includes('hoa rules')) {
      penalties.push({
        type: 'hoa_restriction',
        severity: 'medium',
        description: 'HOA restrictions limit property modifications',
        penalty: 5
      });
    }
    
    // Rental limitations - look for Airbnb/STR limits or rental restrictions
    if ((text.includes('rental') && (text.includes('limit') || text.includes('90 days') || text.includes('restricted'))) ||
        (text.includes('airbnb') && (text.includes('limit') || text.includes('90 days'))) ||
        (text.includes('short-term') && (text.includes('limit') || text.includes('restricted'))) ||
        text.includes('rental restrictions')) {
      penalties.push({
        type: 'rental_limit',
        severity: 'high',
        description: 'Short-term rental restrictions affect income potential',
        penalty: 10
      });
    }
    
    // Zoning issues
    if (text.includes('zoning') && (text.includes('issue') || text.includes('non-compliant') || text.includes('requirement'))) {
      penalties.push({
        type: 'zoning_issue',
        severity: 'high',
        description: 'Zoning compliance issues may require permits',
        penalty: 8
      });
    }
    
    // Permit requirements
    if (text.includes('permit') && (text.includes('required') || text.includes('approval'))) {
      penalties.push({
        type: 'permit_required',
        severity: 'low',
        description: 'Additional permits may be required for modifications',
        penalty: 3
      });
    }
    
    // General compliance
    if (text.includes('compliance') || text.includes('regulation') || text.includes('ordinance')) {
      penalties.push({
        type: 'general_compliance',
        severity: 'low',
        description: 'Additional regulatory compliance requirements',
        penalty: 2
      });
    }
  }
  
  // Remove duplicates based on type
  const uniquePenalties = penalties.reduce((acc, penalty) => {
    if (!acc.some(p => p.type === penalty.type)) {
      acc.push(penalty);
    }
    return acc;
  }, [] as LegalPenalty[]);
  
  return uniquePenalties;
}

function scoreAffordability(params: {
  cashFlowMonthly: number;
  monthlyRent: number;
  dscr: number;
  assumptions: FinanceAssumptions;
}): number {
  const { cashFlowMonthly, monthlyRent, dscr, assumptions } = params;

  let score = 100;

  // Negative cashflow ratio up to full rent magnitude
  const negRatio =
    cashFlowMonthly < 0 && monthlyRent > 0
      ? Math.min(1, Math.abs(cashFlowMonthly) / monthlyRent)
      : 0;
  score -= negRatio * assumptions.negativeCashflowWeight;

  // DSCR penalty if below target
  if (assumptions.dscrTarget > 0 && dscr < assumptions.dscrTarget) {
    const deficit = Math.min(1, (assumptions.dscrTarget - dscr) / assumptions.dscrTarget);
    score -= deficit * assumptions.lowDscrWeight;
  }

  // Base risk penalty
  score -= assumptions.riskBasePenalty;

  return score;
}
