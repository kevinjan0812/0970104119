const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = global;
require('../vendor-pizzip.js');

const templatePath = path.join(__dirname, '..', 'relocation-export-template.docx');
const templateBytes = fs.readFileSync(templatePath);
const templateDataSource = fs.readFileSync(path.join(__dirname, '..', 'relocation-template-data.js'), 'utf8');
const encodedTemplate = templateDataSource.match(/RELOCATION_WORD_TEMPLATE_BASE64\s*=\s*"([A-Za-z0-9+/=]+)"/)?.[1];
assert.ok(encodedTemplate, 'missing relocation template base64 data');
assert.deepEqual(Buffer.from(encodedTemplate, 'base64'), templateBytes, 'embedded template data is stale');
const sourceZip = new global.PizZip(templateBytes);
const sourceXml = sourceZip.file('word/document.xml').asText();
const tags = [...new Set([...sourceXml.matchAll(/\{\{([^{}]+)\}\}/g)].map(match => match[1]))];

assert.equal(tags.length, 86, 'unexpected relocation template tag count');

const requiredTags = [
  'workflow',
  'case_no',
  'case_name',
  'relocation_date',
  'relocation_time',
  'remains_handling',
  'tower_master',
  'tower_date',
  'tower_time',
  'eco_date',
  'eco_time',
  'service_history',
  'family_12_fate'
];
requiredTags.forEach(tag => assert.ok(tags.includes(tag), `missing template tag: ${tag}`));

assert.equal(sourceZip.file('word/document.xml') !== null, true);
assert.equal(sourceZip.file('word/styles.xml') !== null, true);
assert.equal(sourceZip.file('word/_rels/document.xml.rels') !== null, true);

console.log(`relocation Word template passed: ${tags.length} tags, ${templateBytes.length} bytes`);
