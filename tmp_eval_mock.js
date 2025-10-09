const fs = require('fs');
let s = fs.readFileSync('app/data/mockProperties.ts','utf8');
// strip import and export
s = s.replace(/import[\s\S]*?;\n/, '');
s = s.replace(/export const mockProperties\s*=\s*/, 'const mockProperties = ');
// evaluate safely
const vm = require('vm');
const script = new vm.Script(s + '\nmodule.exports = mockProperties;');
const ctx = vm.createContext({});
const mock = script.runInContext(ctx);
console.log(JSON.stringify(mock, null, 2));
