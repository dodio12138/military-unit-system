const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

function load(stored = {}) {
  const storage = { ...stored };
  const context = vm.createContext({
    structuredClone,
    localStorage: { getItem: (key) => storage[key] ?? null, setItem: (key, value) => { storage[key] = value; } },
  });
  for (const file of ['src/core/i18n.js', 'src/core/config.js', 'src/data/presets.js', 'src/render/symbols.js']) {
    vm.runInContext(readFileSync(join(__dirname, '..', file), 'utf8'), context);
  }
  return vm.runInContext('({ types, builtInTypes, groups, ranks, symbolParts, composeSymbol, readCustomSymbols, registerCustomSymbols, customSymbolStorageKey, brief })', context);
}

test('every palette symbol is a defined branch with a valid default echelon', () => {
  const { groups, builtInTypes, ranks } = load();
  const keys = groups.flatMap((group) => group.keys);
  assert.equal(new Set(keys).size, keys.length, 'no branch is listed twice');
  for (const key of keys) {
    assert.ok(Object.hasOwn(builtInTypes, key), key);
    assert.ok(Object.hasOwn(ranks, builtInTypes[key].rank), key);
  }
});

test('composed symbols keep only known parts and escape short text', () => {
  const { composeSymbol, symbolParts } = load();
  assert.equal(composeSymbol({ parts: ['infantry', 'nope'] }), symbolParts.infantry.drawing);
  const drawing = composeSymbol({ text: '<b>&MPX', textPosition: 'top' });
  assert.match(drawing, />&lt;b&gt;&amp;<\/text>$/, 'text is cut to 4 characters and escaped');
  assert.match(drawing, /y="14"/);
});

test('custom symbols register as branches and unknown branches fall back to a plain frame', () => {
  const key = 'custom-test';
  const stored = { 'military-unit-system:custom-symbols:v1': JSON.stringify({
    [key]: { name: 'Drone Recon', parts: ['reconnaissance'], text: 'UAS', rank: 'company' },
    'not-custom': { name: 'Ignored', parts: [] },
  }) };
  const { types, readCustomSymbols, registerCustomSymbols } = load(stored);
  const definitions = readCustomSymbols();
  assert.deepEqual(Object.keys(definitions), [key]);
  registerCustomSymbols(definitions);
  assert.equal(types[key].name, 'Drone Recon');
  assert.equal(types[key].custom, true);
  assert.match(types[key].drawing, /UAS/);
  registerCustomSymbols({});
  assert.equal(Object.hasOwn(types, key), false);
  assert.equal(types[key], types.general, 'a deleted symbol draws as the general frame');
});

test('long English captions use standard abbreviations', () => {
  const { brief } = load();
  assert.equal(brief('1st Engineer Combat Battalion'), '1st Engr Cbt Bn');
  assert.equal(brief('7th Field Artillery Battalion (105 mm)'), '7th FA Bn (105 mm)');
  assert.equal(brief('Infantry Company', 0), 'Inf Co');
  assert.equal(brief('Division HQ'), 'Division HQ', 'short captions stay whole');
});
