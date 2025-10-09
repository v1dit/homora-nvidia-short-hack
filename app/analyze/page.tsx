"use client";

import { useEffect, useState } from "react";

interface FinanceResponse {
  property: any;
  finance: {
    metrics: {
      capRate: number;
      cashFlowMonthly: number;
      cashOnCash: number;
      dscr: number;
      affordabilityScore: number;
    };
  };
  insights: {
    financialSummary: string;
    legalSummary: string[];
    contextUsed: string[];
    riskFactors: string[];
    recommendations: string[];
  };
  legalPenalties: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    penalty: number;
  }>;
}

export default function AnalyzePage() {
  const [data, setData] = useState<FinanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/analyze?mock=true");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-6 text-gray-400">Loading analysis...</div>;
  if (!data) return <div className="p-6 text-red-500">No data available.</div>;

  const m = data.finance.metrics;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">
        🏡 One-Click Property Analyzer
      </h1>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <MetricCard label="Cap Rate" value={(m.capRate * 100).toFixed(2) + "%"} />
        <MetricCard label="Monthly Cash Flow" value={"$" + m.cashFlowMonthly.toFixed(0)} />
        <MetricCard label="Cash-on-Cash ROI" value={m.cashOnCash.toFixed(2) + "%"} />
        <MetricCard label="DSCR" value={m.dscr.toFixed(2)} />
        <MetricCard label="Affordability Score" value={m.affordabilityScore.toString()} />
      </div>

      <div className="mt-10 mb-8">
        <ScoreBar score={m.affordabilityScore} />
      </div>

      {/* AI Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Financial Analysis */}
        <div className="bg-gray-900 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            📊 Financial Analysis
          </h2>
          <p className="text-gray-300 leading-relaxed">
            {data.insights.financialSummary}
          </p>
        </div>

        {/* Legal Insights */}
        <div className="bg-gray-900 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            ⚖️ Legal & Regulatory Insights
          </h2>
          {data.insights.legalSummary.length > 0 ? (
            <ul className="space-y-2">
              {data.insights.legalSummary.map((item, index) => (
                <li key={index} className="text-gray-300 flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No specific legal restrictions identified.</p>
          )}
        </div>

        {/* Risk Factors */}
        {data.insights.riskFactors.length > 0 && (
          <div className="bg-gray-900 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              ⚠️ Risk Factors
            </h2>
            <ul className="space-y-2">
              {data.insights.riskFactors.map((risk, index) => (
                <li key={index} className="text-red-300 flex items-start">
                  <span className="text-red-400 mr-2">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        <div className="bg-gray-900 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            💡 Recommendations
          </h2>
          <ul className="space-y-2">
            {data.insights.recommendations.map((rec, index) => (
              <li key={index} className="text-green-300 flex items-start">
                <span className="text-green-400 mr-2">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Legal Penalties */}
      {data.legalPenalties.length > 0 && (
        <div className="mt-8 bg-gray-900 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            🚨 Legal Penalties Applied
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.legalPenalties.map((penalty, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    penalty.severity === 'high' ? 'bg-red-900 text-red-300' :
                    penalty.severity === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                    'bg-blue-900 text-blue-300'
                  }`}>
                    {penalty.severity.toUpperCase()}
                  </span>
                  <span className="text-red-400 font-semibold">-{penalty.penalty} pts</span>
                </div>
                <p className="text-gray-300 text-sm">{penalty.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context Used */}
      {data.insights.contextUsed.length > 0 && (
        <div className="mt-8 bg-gray-900 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            📚 Data Sources Used
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.insights.contextUsed.map((source, index) => (
              <span key={index} className="bg-blue-900 text-blue-300 px-3 py-1 rounded-full text-sm">
                {source}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 rounded-2xl shadow-lg p-5 hover:bg-gray-800 transition-all">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div>
      <p className="text-gray-400 text-sm mb-2">Affordability Score</p>
      <div className="w-full bg-gray-800 rounded-full h-4">
        <div
          className="bg-green-500 h-4 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        ></div>
      </div>
      <p className="mt-2 text-gray-300">{pct}/100</p>
    </div>
  );
}
