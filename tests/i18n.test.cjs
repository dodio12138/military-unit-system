const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const root = join(__dirname, '..');
const read = (file) => readFileSync(join(root, file), 'utf8');

function load(stored) {
  const localStorage = { getItem: () => stored, setItem() {} };
  return vm.runInNewContext(read('src/core/i18n.js') + '\n({ t, tr, uiMessages, english });', { localStorage });
}

test('English is the default display language', () => {
  assert.equal(load(null).english, true);
  assert.equal(load('zh').english, false);
});

test('every interface string the code requests has an English entry', () => {
  const { uiMessages } = load(null);
  const sources = ['src/editor.js', 'src/data/presets.js', 'src/render/view-mode.js'].map(read).join('\n');
  const keys = new Set();
  for (const match of sources.matchAll(/\bt\(\s*("(?:[^"\\]|\\.)*")/g)) keys.add(JSON.parse(match[1]));
  // Ternaries such as t(flag ? "A" : "B") pass either literal.
  for (const match of sources.matchAll(/\bt\([^;]*?\?\s*("(?:[^"\\]|\\.)*")\s*:\s*("(?:[^"\\]|\\.)*")/g)) {
    keys.add(JSON.parse(match[1]));
    keys.add(JSON.parse(match[2]));
  }
  const missing = [...keys].filter((key) => /[㐀-鿿，]/.test(key) && !Object.hasOwn(uiMessages, key));
  assert.deepEqual(missing, []);
});

test('static page text is covered by the dictionary', () => {
  const { uiMessages } = load(null);
  const html = read('index.html').replace(/<!--[\s\S]*?-->/g, '');
  const texts = [...html.matchAll(/>([^<>]+)</g)].map((m) => m[1].trim())
    .concat([...html.matchAll(/(?:aria-label|title|placeholder)="([^"]+)"/g)].map((m) => m[1]));
  const missing = texts.filter((text) => /[㐀-鿿]/.test(text) && !Object.hasOwn(uiMessages, text));
  assert.deepEqual(missing, []);
});

test('data names translate by term and by pattern, and stay unchanged in Chinese', () => {
  const { tr } = load(null);
  assert.equal(tr('第685团'), '685th Regiment');
  assert.equal(tr('第343旅'), '343rd Brigade');
  assert.equal(tr('第16步兵团'), '16th Infantry Regiment');
  assert.equal(tr('第7野战炮兵营（105毫米）'), '7th Field Artillery Battalion (105 mm)');
  assert.equal(tr('骑兵营'), 'Cavalry Battalion');
  assert.equal(tr('步兵营 2'), 'Infantry Battalion 2');
  assert.equal(tr('总指挥 朱德'), 'Commander-in-Chief Zhu De');
  assert.equal(tr('My own unit'), 'My own unit');
  assert.equal(tr('自建的单位'), '自建的单位', 'unknown text is left as entered');
  assert.equal(load('zh').tr('第685团'), '第685团');
});

test('English messages handle singular and plural counts', () => {
  const { t } = load(null);
  assert.equal(t('{n} 人', { n: 1 }), '1 person');
  assert.equal(t('{n} 人', { n: 12345 }), '12,345 personnel');
  assert.equal(t('{size} 个单位 · {depth} 层编制', { size: 1, depth: 3 }), '1 unit · 3 levels');
  assert.equal(load('zh').t('{n} 人', { n: 9 }), '9 人');
});
