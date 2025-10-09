import { NextRequest, NextResponse } from "next/server";
import { computeFinance, FINANCE_DEFAULTS } from "@/lib/finance";
import { generateRAGInsights } from '@/lib/insights';
import type { PropertyForFinance } from "@/types/finance";

/**
 * Helper: base URL for internal fetches (works locally and on Vercel).
 */
function getBaseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host");
  if (!host) throw new Error("Missing host header");
  return `${proto}://${host}`;
}

/**
 * GET /api/analyze
 * 
 * Query params:
 * - url: source listing URL (forwarded to /api/property/parse)
 * - mock=true: use mock property (forwarded to /api/property/parse)
 * 
 * Optional finance overrides (numbers):
 * - price, downPaymentPct, annualInterestRate, loanYears, monthlyRent
 * - insurancePct, maintenancePct, managementPct, vacancyPct
 * - hoaMonthly, utilitiesMonthly, propertyTaxRatePct, rentYieldPct
 * - dscrTarget, negativeCashflowWeight, lowDscrWeight, riskBasePenalty
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const base = getBaseUrl(req);

    // Build passthrough to your existing parse endpoint
    const parseUrl = new URL("/api/property/parse", base);
    // forward relevant query params
    for (const key of ["url", "address", "mock"]) {
      const v = searchParams.get(key);
      if (v !== null) parseUrl.searchParams.set(key, v);
    }

    const parsedRes = await fetch(parseUrl.toString(), { cache: "no-store" });
    if (!parsedRes.ok) {
      const text = await parsedRes.text();
      return NextResponse.json(
        { error: "Failed to parse property", details: text },
        { status: 502 }
      );
    }
    const parseResult = await parsedRes.json();
    
    // Extract property data - handle both direct property and nested data structure
    const property: PropertyForFinance = parseResult.data || parseResult;
    
    // For the response, we want to return the full property object
    const fullProperty = parseResult;

    // Collect optional overrides from query
    const num = (k: string): number | null => {
      const v = searchParams.get(k);
      if (v === null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    // Inputs overrides - use property data as defaults
    const inputs = {
      price: num("price") ?? property.price,
      downPaymentPct: num("downPaymentPct") ?? undefined,
      annualInterestRate: num("annualInterestRate") ?? undefined,
      loanYears: num("loanYears") ?? undefined,
      monthlyRent: num("monthlyRent") ?? property.est_rent ?? undefined,
    };

    // Assumption overrides
    const assumptions = {
      insurancePct: num("insurancePct") ?? undefined,
      maintenancePct: num("maintenancePct") ?? undefined,
      managementPct: num("managementPct") ?? undefined,
      vacancyPct: num("vacancyPct") ?? undefined,
      hoaMonthly: num("hoaMonthly") ?? undefined,
      utilitiesMonthly: num("utilitiesMonthly") ?? undefined,
      propertyTaxRatePct: num("propertyTaxRatePct") ?? undefined,
      rentYieldPct: num("rentYieldPct") ?? undefined,
      dscrTarget: num("dscrTarget") ?? undefined,
      negativeCashflowWeight: num("negativeCashflowWeight") ?? undefined,
      lowDscrWeight: num("lowDscrWeight") ?? undefined,
      riskBasePenalty: num("riskBasePenalty") ?? undefined,
      // Allow downPaymentPct / rate / years override here too if preferred
      downPaymentPct: num("downPaymentPct") ?? undefined,
      annualInterestRate: num("annualInterestRate") ?? undefined,
      loanYears: num("loanYears") ?? undefined,
    };

    // Clean out undefined keys so we don't accidentally override defaults with undefined
    const clean = <T extends Record<string, any>>(obj: T) =>
      Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;

    // Get legal context for penalty analysis
    let legalPenalties: any[] = [];
    try {
      const { legalContext } = await retrieveContext(property, 3, 5);
      legalPenalties = analyzeLegalPenalties(legalContext);
      
      // Add legal penalties to inputs
      inputs.legalPenalties = legalPenalties;
    } catch (e) {
      console.warn('⚠️ Failed to retrieve legal context:', e);
      legalPenalties = [];
    }

    const finance = computeFinance(property, clean(inputs), clean(assumptions));

    let insights = null;
    try {
      insights = await generateRAGInsights(property, finance);
    } catch (e) {
      // non-fatal — continue with the response
      insights = { 
        financialSummary: 'Insight generation failed', 
        legalSummary: [],
        contextUsed: [],
        riskFactors: [],
        recommendations: []
      };
    }

    return NextResponse.json(
      {
        property: fullProperty,
        finance,
        defaults: FINANCE_DEFAULTS,
        insights,
        legalPenalties,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Analyze failed", message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
