const fs = require('fs');
let s = fs.readFileSync('app/data/mockProperties.ts','utf8');
// remove import lines
s = s.replace(/import[\s\S]*?;\n/g, '');
// remove TypeScript type annotations like ': Property[]'
s = s.replace(/:\s*\w+\[\]\s*/g, '');
// replace 'export const' with 'const'
s = s.replace(/export\s+const\s+/g, 'const ');
// ensure valid JS
s = s.replace(/;\s*$/m, '');
const vm = require('vm');
const script = new vm.Script(s + '\nmodule.exports = mockProperties;');
const ctx = vm.createContext({});
const mock = script.runInContext(ctx);
console.log(JSON.stringify(mock, null, 2));
