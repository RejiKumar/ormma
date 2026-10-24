const fs = require('fs');
const p = 'src/index.ts';
let s = fs.readFileSync(p, 'utf8');
const old = 'import { confirmPrescriptionMedicine, scanPrescription } from "./prescription";';
const rep = 'import { confirmPrescriptionMedicine, scanPrescription } from "./prescription";\nimport { deleteParent, exportParentData } from "./data/exportDelete";';
if (s.includes(old) && !s.includes('exportParentData')) {
  s = s.replace(old, rep);
}
if (!s.includes('export { exportParentData, deleteParent }')) {
  s = s.trimEnd() + '\nexport { exportParentData, deleteParent };\n';
}
fs.writeFileSync(p, s, 'utf8');
