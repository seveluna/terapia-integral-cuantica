const fs = require('fs');
const zlib = require('zlib');

function decodePdfString(str) {
  if (!str) return '';
  if (str.startsWith('\u00fe\u00ff')) {
    let out = '';
    for (let i = 2; i < str.length; i += 2) {
      const code = (str.charCodeAt(i) << 8) | str.charCodeAt(i + 1);
      if (!Number.isNaN(code)) out += String.fromCharCode(code);
    }
    return out;
  }
  return str
    .replace(/\\([\\()])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t');
}

function collectTextOperators(content) {
  const parts = [];
  const textArrayRegex = /\[(.*?)\]\s*TJ/gs;
  const textRegex = /\((?:\\.|[^\\)])*\)\s*Tj/g;

  for (const match of content.matchAll(textRegex)) {
    const raw = match[0].replace(/\)\s*Tj$/, '').slice(1);
    parts.push(decodePdfString(raw));
  }

  for (const match of content.matchAll(textArrayRegex)) {
    const inner = match[1];
    const segments = [...inner.matchAll(/\((?:\\.|[^\\)])*\)/g)];
    for (const seg of segments) {
      parts.push(decodePdfString(seg[0].slice(1, -1)));
    }
  }

  return parts;
}

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Usage: node extract-pdf-text.js <pdf>');
  process.exit(1);
}

const data = fs.readFileSync(pdfPath);
const latin = data.toString('latin1');
let idx = 0;
const chunks = [];

while ((idx = latin.indexOf('stream', idx)) !== -1) {
  let start = idx + 6;
  if (latin[start] === '\r' && latin[start + 1] === '\n') start += 2;
  else if (latin[start] === '\n') start += 1;

  const end = latin.indexOf('endstream', start);
  if (end === -1) break;

  const byteStart = Buffer.byteLength(latin.slice(0, start), 'latin1');
  const byteEnd = Buffer.byteLength(latin.slice(0, end), 'latin1');
  const buf = data.subarray(byteStart, byteEnd);

  const variants = [buf];
  try {
    variants.push(zlib.inflateSync(buf));
  } catch {}

  for (const variant of variants) {
    const text = variant.toString('latin1');
    const extracted = collectTextOperators(text);
    if (extracted.length) chunks.push(extracted.join(' '));
  }

  idx = end + 9;
}

console.log(chunks.join('\n'));
