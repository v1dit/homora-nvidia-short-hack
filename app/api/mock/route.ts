import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    address: "123 Demo St, San Jose, CA",
    price: 500000,
    mortgage: 2200,
    cashFlow: 600,
    roi: "8.4%",
    summary: "Strong ROI driven by healthy rent and low vacancy rate."
  });
}
