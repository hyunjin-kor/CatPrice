import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(path.join(repositoryRoot, 'frontend/package.json'));
const ts = require('typescript');
const root = path.join(repositoryRoot, 'frontend/src');
const keys = new Set();
const calls = [];
const rawLabels = [];
const rawAttributes = [];
const rawTemplateLabels = [];
const uiAttributes = ['label', 'title', 'placeholder', 'aria-label', 'detail'];
const technicalLabels = new Set(['Alt +', 'Esc', 'COMET', 'kg', 'lb', 'EN', ': Catalyst Overall Manufacturing Estimation Tool', 'cm²', 'mg/cm²', 'wt%', 'lb/ft³', '/hr', '/kg', '/ozt', 'CatCost Ch.7', 'FCI', 'FCI/PE', 'HS', '(DOI', 'PLOS ONE 9(7): e101298 — CC BY 4.0.']);
const isUntranslated = (label) => /[A-Za-z]{2}/.test(label) && !/[가-힣]/.test(label) && !technicalLabels.has(label);
function scan(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    if (file.endsWith('i18n.tsx') && ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name)) keys.add(node.name.text);
    if (ts.isCallExpression(node) && node.expression.getText(source) === 't' && node.arguments[0]) {
      function collect(argument) {
        if (ts.isStringLiteral(argument)) calls.push({ file: path.relative(repositoryRoot, file).replaceAll('\\', '/'), line, key: argument.text });
        else if (ts.isConditionalExpression(argument)) {
          collect(argument.whenTrue);
          collect(argument.whenFalse);
        }
      }
      collect(node.arguments[0]);
    }
    if (ts.isJsxText(node)) {
      const label = node.text.replace(/\s+/g, ' ').trim();
      if (/[A-Za-z]{2}/.test(label)) rawLabels.push({ file: path.relative(repositoryRoot, file).replaceAll('\\', '/'), line, label });
    }
    if (ts.isJsxAttribute(node) && uiAttributes.includes(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer) && isUntranslated(node.initializer.text)) {
      rawAttributes.push({ file: path.relative(repositoryRoot, file).replaceAll('\\', '/'), line, label: node.initializer.text });
    }
    if (ts.isJsxExpression(node) && node.expression
        && (!ts.isJsxAttribute(node.parent) || uiAttributes.includes(node.parent.name.text))) {
      function collectTemplates(expression) {
        if (ts.isTemplateExpression(expression)) {
          const fragments = [expression.head.text, ...expression.templateSpans.map((span) => span.literal.text)];
          for (const fragment of fragments) {
            const label = fragment.replace(/\s+/g, ' ').trim();
            if (isUntranslated(label)) rawTemplateLabels.push({ file: path.relative(repositoryRoot, file).replaceAll('\\', '/'), line, label });
          }
        } else if (ts.isConditionalExpression(expression) && !/\blang\b/.test(expression.condition.getText(source))) {
          collectTemplates(expression.whenTrue);
          collectTemplates(expression.whenFalse);
        }
      }
      collectTemplates(node.expression);
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
const untranslatedLabels = [...rawLabels.filter(({ label }) => isUntranslated(label)), ...rawAttributes, ...rawTemplateLabels];
const report = { static_translation_calls: calls.length, korean_keys: keys.size, missing_key_occurrences: missing.length, raw_jsx_label_occurrences: rawLabels.length, untranslated_ui_label_occurrences: untranslatedLabels.length, missing, rawLabels, untranslatedLabels, scope: 'Literal and conditional t(string) keys, literal JSX text, UI attributes and direct JSX template-literal fragments. Technical symbols/units, the product name and already-Korean text are explicitly excluded from untranslated UI counts. Conditional language branches, source data and variable translation keys require manual/browser review.' };
const out = process.argv.indexOf('--out');
if (out !== -1) fs.writeFileSync(process.argv[out + 1], `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, missing: missing.slice(0, 15), rawLabels: undefined }, null, 2));
if (!process.argv.includes('--audit') && (missing.length || untranslatedLabels.length)) process.exitCode = 1;
