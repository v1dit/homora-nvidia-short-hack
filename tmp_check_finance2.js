const mock = require('./tmp_mock_properties.js');
const prop = mock[0] || mock;
function monthlyMortgagePI(loanAmount, annualRate, years){
  if(!loanAmount || !annualRate) return 0;
  const r = annualRate/12;
  const n = years*12;
  return loanAmount * (r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1);
}
const defaults = { loanToValue:0.8, rate:0.07, termYears:30, propertyTaxRate:1.2, insurance:1200, vacancyRate:0.05, capexRate:0.05, mgmtRate:0.08 };
const price = prop.price || 250000;
const monthlyRent = prop.monthlyRent || prop.est_rent || 1800;
const annualRent = monthlyRent * 12;
const propertyTax = price * (defaults.propertyTaxRate/100);
const noi = annualRent - (propertyTax + defaults.insurance + annualRent*defaults.vacancyRate + annualRent*defaults.capexRate + annualRent*defaults.mgmtRate);
const loanAmount = price * defaults.loanToValue;
const mortgage = monthlyMortgagePI(loanAmount, defaults.rate, defaults.termYears);
const cashFlow = monthlyRent - mortgage - (propertyTax/12) - (defaults.insurance/12);
const capRate = (noi / price) * 100;
const dscr = (noi/12) / mortgage;
const roi = (cashFlow*12) / (price*(1-defaults.loanToValue)) * 100;
console.log({ price, monthlyRent, mortgage: Math.round(mortgage), monthlyNOI: Math.round(noi/12), cashFlow: Math.round(cashFlow), capRate: Number(capRate.toFixed(2)), dscr: Number(dscr.toFixed(2)), roi: Number(roi.toFixed(2)) });
