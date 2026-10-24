const fs = require('fs');
const p = 'src/index.ts';
let s = fs.readFileSync(p, 'utf8');
const old = 'import { missedDoseCheckerHandler } from "./schedule/missedDose";';
const rep = 'import { missedDoseCheckerHandler } from "./schedule/missedDose";\nimport { confirmPrescriptionMedicine, scanPrescription } from "./prescription";';
if (!s.includes(old)) process.exit(1);
s = s.replace(old, rep);
if (!s.includes('export { scanPrescription, confirmPrescriptionMedicine }')) {
  s = s.trimEnd() + '\nexport { scanPrescription, confirmPrescriptionMedicine };\n';
}
fs.writeFileSync(p, s, 'utf8');
