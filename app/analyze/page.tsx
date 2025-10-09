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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard label="Cap Rate" value={(m.capRate * 100).toFixed(2) + "%"} />
        <MetricCard label="Monthly Cash Flow" value={"$" + m.cashFlowMonthly.toFixed(0)} />
        <MetricCard label="Cash-on-Cash ROI" value={m.cashOnCash.toFixed(2) + "%"} />
        <MetricCard label="DSCR" value={m.dscr.toFixed(2)} />
        <MetricCard label="Affordability Score" value={m.affordabilityScore.toString()} />
      </div>

      <div className="mt-10">
        <ScoreBar score={m.affordabilityScore} />
      </div>
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
