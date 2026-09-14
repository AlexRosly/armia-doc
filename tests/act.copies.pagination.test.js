const test = require('node:test');
const assert = require('node:assert/strict');
const fix = require('../src/services/documents/act/releaseLastCopyKeepNext');

const p = (text, props = '<w:keepNext/><w:keepLines/>') =>
  `<w:p><w:pPr>${props}</w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;
const heading = n => p(`Акт складено у ${n} примірниках:`);
const copy = (n, props) => p(`примірник №${n} – Одержувач`, props);
const iii = '<w:tbl><w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc>' + p('ІІІ. Висновок командира') + p('Підпис') + '</w:tc></w:tr></w:tbl>';

for (const count of [1, 2, 5]) {
  for (const suffix of ['', iii]) {
    test(`${count} copies, section III ${suffix ? 'present' : 'absent'}: only last keepNext changes`, () => {
      const prefix = p('Інший підпис') + heading(count) + Array.from({length: count - 1}, (_, i) => copy(i + 1)).join('');
      const input = prefix + copy(count) + suffix;
      const expected = prefix + copy(count, '<w:keepNext w:val="0"/><w:keepLines/>') + suffix;
      assert.equal(fix(input, count), expected);
      assert.equal(fix(expected, count), expected);
    });
  }
}
for (const props of ['<w:keepNext w:val="true"></w:keepNext><w:keepLines/>', '<w:keepLines/>', '<w:pStyle w:val="Copy"/><w:keepLines/>']) {
  test(`explicit off overrides inherited or paired property: ${props}`, () => {
    const output = fix(heading(1) + copy(1, props), 1);
    assert.match(output, /<w:keepNext w:val="0"\/>/);
    assert.equal((output.match(/<w:keepNext\b/g) || []).length, 2);
    assert.match(output, /<w:keepLines\/>/);
  });
}
test('split text runs and a multiline recipient remain intact', () => {
  const last = '<w:p><w:pPr><w:keepNext/><w:keepLines/></w:pPr><w:r><w:t>примірник </w:t></w:r><w:r><w:t>№2 – A &amp; B</w:t><w:br/><w:t>Другий рядок</w:t></w:r></w:p>';
  const input = heading(2) + copy(1) + last + iii;
  assert.equal(fix(input, 2), heading(2) + copy(1) + last.replace('<w:keepNext/>', '<w:keepNext w:val="0"/>') + iii);
});
test('absent, ambiguous, incomplete and unexpanded lists remain untouched', () => {
  for (const input of [copy(1), heading(2) + copy(1), heading(2) + copy(1) + iii + copy(2), heading(2) + copy(1) + p('інший блок') + copy(2), heading(2) + copy(1) + copy(2) + heading(2), heading(2) + p('{#copies}') + p('примірник №{copyNumber} – {recipient}')]) {
    assert.equal(fix(input, 2), input);
  }
  assert.equal(fix(heading(0), 0), heading(0));
});
test('paragraph without properties gets explicit off', () => {
  const last = '<w:p><w:r><w:t>примірник №1 – A</w:t></w:r></w:p>';
  assert.equal(fix(heading(1) + last, 1), heading(1) + last.replace('<w:p>', '<w:p><w:pPr><w:keepNext w:val="0"/></w:pPr>'));
});

test('generateActDocument applies the fix to the saved DOCX after rendering', async () => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const Zip = require('pizzip');
  const sharedPath = require.resolve('../src/services/documents/shared');
  const dataPath = require.resolve('../src/services/documents/act/buildTemplateDataAct');
  const generatePath = require.resolve('../src/services/documents/act/generate');
  const saved = [sharedPath, dataPath, generatePath].map(key => [key, require.cache[key]]);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'act-copies-'));
  try {
    const input = heading(2) + copy(1) + copy(2) + iii;
    const zip = new Zip();
    zip.file('word/document.xml', input);
    zip.file('word/styles.xml', 'unchanged styles');
    require.cache[sharedPath] = {exports: {generateSingleTemplate: async () => zip.generate({type:'nodebuffer'})}};
    require.cache[dataPath] = {exports: () => ({copies: [{copyNumber:1}, {copyNumber:2}]})};
    delete require.cache[generatePath];
    const generate = require(generatePath);
    const output = path.join(dir, 'act.docx');
    await generate({}, output, {template:'test.docx'});
    const result = new Zip(await fs.readFile(output));
    assert.equal(result.file('word/document.xml').asText(), fix(input, 2));
    assert.equal(result.file('word/styles.xml').asText(), 'unchanged styles');
  } finally {
    for (const [key, value] of saved) {
      if (value) require.cache[key] = value;
      else delete require.cache[key];
    }
    await fs.rm(dir, {recursive:true, force:true});
  }
});
