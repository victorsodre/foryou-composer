import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dictionary = source.slice(source.indexOf('const I18N ='), source.indexOf('const PARAM_DEFS ='));
const lookup = source.slice(source.indexOf('const t = (k)'), source.indexOf('function isCustom()'));
const apply = source.slice(source.indexOf('function applyI18n()'), source.indexOf('function renderWTable()'));
const keys = [...new Set([...source.matchAll(/data-i="([^"]+)"/g)].map(match => match[1]))];

for (const lang of ['en', 'pt']) {
  test(`i18n ${lang}: só valores do dicionário podem ser interpretados como HTML`, () => {
    const malicious = '<img src=x onerror=alert(1)>';
    const nodes = [...keys, malicious, '__proto__'].map(key => ({
      key, innerHTML: 'INITIAL', getAttribute: () => key,
    }));
    const context = vm.createContext({
      lang, ENGINE_VERSION: 'test', $: () => null,
      document: { documentElement: {}, querySelectorAll: selector => selector === '[data-i]' ? nodes : [] },
      renderWTable: () => {}, update: () => {},
    });
    vm.runInContext(dictionary + lookup + apply + '\napplyI18n(); globalThis.dictionary = I18N[lang];', context, { timeout: 1000 });
    for (const node of nodes) {
      assert.equal(node.innerHTML, Object.hasOwn(context.dictionary, node.key) ? context.dictionary[node.key] : 'INITIAL');
    }
  });
}
