const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'vendor-lunar-solar-converter.js'), 'utf8'));

const converter = new LunarSolarConverter();

function solarToLunar(year, month, day) {
  const solar = new Solar();
  solar.solarYear = year;
  solar.solarMonth = month;
  solar.solarDay = day;
  const lunar = converter.SolarToLunar(solar);
  return [lunar.lunarYear, lunar.lunarMonth, lunar.lunarDay, lunar.isleap];
}

function lunarToSolar(year, month, day, isleap = false) {
  const lunar = new Lunar();
  lunar.lunarYear = year;
  lunar.lunarMonth = month;
  lunar.lunarDay = day;
  lunar.isleap = isleap;
  const solar = converter.LunarToSolar(lunar);
  return [solar.solarYear, solar.solarMonth, solar.solarDay];
}

const solarCases = [
  [[2025, 1, 29], [2025, 1, 1, false]],
  [[2025, 7, 25], [2025, 6, 1, true]],
  [[2026, 2, 17], [2026, 1, 1, false]],
  [[2027, 2, 6], [2027, 1, 1, false]],
  [[2027, 2, 11], [2027, 1, 6, false]],
  [[2027, 10, 25], [2027, 9, 26, false]],
  [[2028, 1, 26], [2028, 1, 1, false]]
];

for (const [solar, expectedLunar] of solarCases) {
  assert.deepEqual(solarToLunar(...solar), expectedLunar, `solar ${solar.join('-')}`);
  assert.deepEqual(lunarToSolar(...expectedLunar), solar, `lunar ${expectedLunar.join('-')}`);
}

console.log(`lunar calendar regression: ${solarCases.length} forward and ${solarCases.length} reverse cases passed`);
