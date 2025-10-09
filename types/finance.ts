// types/finance.ts

/** Minimal property shape the finance engine needs. */
export interface PropertyForFinance {
  price: number;
  taxRatePct?: number | null; // e.g., 0.012 for 1.2% if available from Smarty/assessor
  hoaMonthly?: number | null;
  // Keep extendable: beds, baths, sqft, address, rent signals, etc.
  [k: string]: any;
}

/** Inputs that the caller can pass explicitly (else fall back to assumptions or estimates). */
export interface FinanceInputs {
  price: number;
  downPaymentPct: number;     // 0.0 - 1.0
  annualInterestRate: number; // e.g., 0.065 for 6.5%
  loanYears: number;          // 15, 30, etc.
  monthlyRent: number;
}

export interface FinanceAssumptions {
  // Purchase / loan
  downPaymentPct: number;
  annualInterestRate: number;
  loanYears: number;

  // Operating assumptions
  propertyTaxRatePct: number | null;   // null means: try property.taxRatePct or fallback
  fallbackPropertyTaxRatePct: number;  // used if no explicit/prop tax rate available
  insurancePct: number;                // of price per year
  maintenancePct: number;              // of price per year
  managementPct: number;               // % of rent
  vacancyPct: number;                  // % of rent
  hoaMonthly: number;
  utilitiesMonthly: number;

  // Income assumptions
  monthlyRent: number | null;          // allow forcing rent
  rentYieldPct: number;                // estimate rent if monthlyRent is null

  // Scoring
  dscrTarget: number;
  negativeCashflowWeight: number;      // 0-100 scale
  lowDscrWeight: number;               // 0-100 scale
  riskBasePenalty: number;             // fixed deduction
}

export interface ExpenseBreakdown {
  taxesMonthly: number;
  insuranceMonthly: number;
  maintenanceMonthly: number;
  managementMonthly: number;
  vacancyMonthly: number;
  hoaMonthly: number;
  utilitiesMonthly: number;
  totalMonthly: number;
}

export interface MortgageBreakdown {
  loanAmount: number;
  downPayment: number;
  monthlyPI: number;
  annualDebtService: number;
  apr: number;
  termYears: number;
}

export interface FinanceSummary {
  inputs: {
    price: number;
    monthlyRent: number;
    downPaymentPct: number;
    annualInterestRate: number;
    loanYears: number;
  };
  mortgage: MortgageBreakdown;
  expenses: ExpenseBreakdown;
  metrics: {
    grossIncomeMonthly: number;
    noiMonthly: number;
    noiAnnual: number;
    capRate: number;
    cashFlowMonthly: number;
    cashFlowAnnual: number;
    cashOnCash: number;  // %
    dscr: number;
    affordabilityScore: number; // 0 - 100
  };
  assumptions: FinanceAssumptions;
}
