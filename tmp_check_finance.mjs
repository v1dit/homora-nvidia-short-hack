import fs from 'fs'
// Minimal reimplementation of computeFinance using typical formulas
const mock = JSON.parse(fs.readFileSync('./app/data/mockProperties.ts', 'utf8').toString().replace(/export const mockProperties = /,'').replace(/;$/,''))
const property = mock[0] || mock

function monthlyMortgagePI(loanAmount, annualRate, years){
  if(!loanAmount || !annualRate) return 0
  const r = annualRate/12
  const n = years*12
  return loanAmount * (r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1)
}

const defaults = { loanToValue:0.8, rate:0.07, termYears:30, propertyTaxRate:1.2, insurance:1200, vacancyRate:0.05, capexRate:0.05, mgmtRate:0.08 }
const price = property.price || 250000
const monthlyRent = property.monthlyRent || property.est_rent || 1800
const noi = monthlyRent*12 - (price*(defaults.propertyTaxRate/100) + defaults.insurance + (monthlyRent*12)*defaults.vacancyRate + (monthlyRent*12)*defaults.capexRate + (monthlyRent*12)*defaults.mgmtRate)
const loanAmount = price * defaults.loanToValue
const mortgage = monthlyMortgagePI(loanAmount, defaults.rate, defaults.termYears)
const cashFlow = monthlyRent - mortgage - (price*(defaults.propertyTaxRate/100))/12 - (defaults.insurance/12)
const capRate = (noi / price) * 100
const dscr = (noi/12) / mortgage
const roi = (cashFlow*12) / (price*(1-defaults.loanToValue)) * 100
console.log({ price, monthlyRent, mortgage: Math.round(mortgage), monthlyNOI: Math.round(noi/12), cashFlow: Math.round(cashFlow), capRate: capRate.toFixed(2)+'%', dscr: dscr.toFixed(2), roi: roi.toFixed(2)+'%' })
