#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — LGD Geography Seeder
//  Loads official Local Government Directory CSVs (data/lgd/) into
//  Supabase geo_* tables. Idempotent — safe to re-run (upserts).
//
//  Usage:  node scripts/seed-lgd.js [dataDir]
//  Requires SUPABASE_URL + SUPABASE_SECRET_KEY (or SERVICE_ROLE_KEY) in .env
// ═══════════════════════════════════════════════════════════════════

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DATA_DIR = process.argv[2] || path.join(__dirname, '..', 'data', 'lgd');
const BATCH = 1000;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// ── Minimal CSV parser (handles quoted fields + commas) ──
function parseCsv(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift().map(h => h.trim().replace(/"/g, ''));
  return rows.filter(r => r.some(v => v !== '')).map(r => {
    const o = {};
    header.forEach((h, i) => { o[h] = (r[i] || '').trim(); });
    return o;
  });
}

const num = v => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const titleCase = s => (s || '').toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());

async function upsert(table, rows, columns) {
  let ok = 0, fail = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: columns });
    if (error) {
      fail += batch.length;
      console.error(`  ${table} batch ${i / BATCH + 1}: ${error.message}`);
    } else {
      ok += batch.length;
      if ((i / BATCH) % 20 === 0) console.log(`  ${table}: ${ok}/${rows.length}`);
    }
  }
  console.log(`  ${table}: done — ${ok} upserted, ${fail} failed`);
  return fail === 0;
}

(async () => {
  console.log(`Reading LGD CSVs from ${DATA_DIR}...`);

  // ── States / UTs ──
  const states = parseCsv(path.join(DATA_DIR, '1-state.csv')).map(r => ({
    state_code: num(r['State Code']),
    name: titleCase(r['State Name']),
    is_ut: (r['State or UT'] || '').toUpperCase() === 'U',
  })).filter(r => r.state_code != null);
  console.log(`States/UTs: ${states.length}`);
  await upsert('geo_states', states, 'state_code');

  // ── Districts ──
  const districts = parseCsv(path.join(DATA_DIR, '2-district.csv')).map(r => ({
    district_code: num(r['District Code']),
    state_code: num(r['State Code']),
    name: titleCase(r['District Name']),
    census_2001: r['Census 2001 Code'] || null,
    census_2011: r['Census 2011 Code'] || null,
  })).filter(r => r.district_code != null && r.state_code != null);
  console.log(`Districts: ${districts.length}`);
  await upsert('geo_districts', districts, 'district_code');

  // ── Subdistricts (tehsil / taluk / mandal / block-level) ──
  const subdistricts = parseCsv(path.join(DATA_DIR, '3-subdistrict.csv')).map(r => ({
    subdistrict_code: num(r['Sub-district Code']),
    district_code: num(r['District Code']),
    name: titleCase(r['Sub-district Name']),
  })).filter(r => r.subdistrict_code != null && r.district_code != null);
  console.log(`Subdistricts: ${subdistricts.length}`);
  await upsert('geo_subdistricts', subdistricts, 'subdistrict_code');

  // ── Villages (~662k rows — largest table) ──
  const villages = parseCsv(path.join(DATA_DIR, '4-village.csv')).map(r => ({
    village_code: num(r['Village Code']),
    subdistrict_code: num(r['Subdistrict Code']),
    district_code: num(r['District Code']),
    state_code: num(r['State Code']),
    name: titleCase(r['Village Name (In Englsih)'] || r['Village Name (In English)']),
    local_name: r['Village Name (In Local)'] || null,
    status: r['Village Status'] || null,
  })).filter(r => r.village_code != null && r.subdistrict_code != null);
  console.log(`Villages: ${villages.length}`);
  await upsert('geo_villages', villages, 'village_code');

  console.log('LGD seeding complete.');
})().catch(e => { console.error('Seed failed:', e); process.exit(1); });
