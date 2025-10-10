import { computeFinance } from "../lib/finance";
import fs from "fs";

const past = JSON.parse(fs.readFileSync("data/mock_merriman_2020.json", "utf8"));
const actual = JSON.parse(fs.readFileSync("data/mock_merriman_2025.json", "utf8"));

function projectGrowth(basePrice:number, baseRent:number){
  const years = [2020,2021,2022,2023,2024,2025];
  const appreciation = 0.065;   // 6.5 % / yr
  const rentGrowth   = 0.045;   // 4.5 % / yr
  const data = [] as any[];
  let price = basePrice, rent = baseRent;
  for(const y of years){
    data.push({year:y, predictedPrice:Math.round(price), predictedRent:Math.round(rent)});
    price *= 1+appreciation;
    rent  *= 1+rentGrowth;
  }
  return data;
}

const proj = projectGrowth(past.price,past.monthlyRent);

console.log("Predicted 5-year projection:");
console.table(proj);

const finance = computeFinance(past as any);
console.log("2020 Finance Snapshot:", finance.metrics);

console.log("Actual 2025:", actual);
