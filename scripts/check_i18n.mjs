import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.resolve('frontend/package.json'));
const ts = require('typescript');
const root = path.resolve('frontend/src');
const keys = new Set();
const calls = [];
const rawLabels = [];
function scan(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    if (file.endsWith('i18n.tsx') && ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name)) keys.add(node.name.text);
    if (ts.isCallExpression(node) && node.expression.getText(source) === 't' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      calls.push({ file: path.relative(process.cwd(), file).replaceAll('\\', '/'), line, key: node.arguments[0].text });
    }
    if (ts.isJsxText(node)) {
      const label = node.text.replace(/\s+/g, ' ').trim();
      if (/[A-Za-z]{2}/.test(label)) rawLabels.push({ file: path.relative(process.cwd(), file).replaceAll('\\', '/'), line, label });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.tsx?$/.test(entry.name)) scan(file);
  }
}
walk(root);
const missing = calls.filter(({ key }) => !keys.has(key));
const report = { static_translation_calls: calls.length, korean_keys: keys.size, missing_key_occurrences: missing.length, raw_jsx_label_occurrences: rawLabels.length, missing, rawLabels, scope: 'Static t(string) keys and literal JSX text. Data strings and dynamic translation keys require manual/browser review.' };
const out = process.argv.indexOf('--out');
if (out !== -1) fs.writeFileSync(process.argv[out + 1], `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, missing: missing.slice(0, 15), rawLabels: undefined }, null, 2));
if (!process.argv.includes('--audit') && missing.length) process.exitCode = 1;
