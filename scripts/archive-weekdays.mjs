#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// archive-weekdays.mjs
//
// Archives weekday (Mon–Fri) sensor readings out of the live `Devices/<id>/
// Readings` node into durable, analysis-ready storage:
//   1. repo, per-day JSON  -> archive/<deviceId>/<YYYY-MM-DD>.json
//   2. repo, combined CSV  -> archive/<deviceId>.csv   (every weekday reading,
//                             one row each — open in Excel / R / Python)
//   3. Firebase            -> Archive/<deviceId>/<YYYY-MM-DD>
//
// The combined CSV is rebuilt from the per-day JSON on every run, so it always
// reflects the full archive even when no new day was added.
//
// It is idempotent and self-healing: every run archives any *complete* weekday
// inside the configured window that isn't archived yet. So the very first run
// back-fills all existing weekday data, and each daily run picks up the newest
// finished weekday. Weekends and the current (incomplete) day are skipped.
//
// Config (env vars):
//   FIREBASE_DB_SECRET   legacy DB secret. Required to write to Firebase Archive.
//                        Without it the script still writes the repo files.
//   WINDOW_START         earliest date to archive (YYYY-MM-DD). Default 2026-04-01
//   WINDOW_END           latest date to archive  (YYYY-MM-DD). Default 2026-06-11
//   TZ_OFFSET_HOURS      timezone used to decide "which day" / weekday. Default 8
//   FORCE                "true" re-archives days even if already archived
//
// Usage:
//   node scripts/archive-weekdays.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { writeFile, mkdir, access, readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dbGet, dbPut, hasSecret } from './lib/firebase-rest.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVE_DIR = join(REPO_ROOT, 'archive');

const WINDOW_START = process.env.WINDOW_START || '2026-04-01';
const WINDOW_END = process.env.WINDOW_END || '2026-06-11';
const TZ_OFFSET_HOURS = Number(process.env.TZ_OFFSET_HOURS ?? 8);
const FORCE = process.env.FORCE === 'true';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const METRICS = ['co2', 'temp', 'hum'];

// ── time helpers ────────────────────────────────────────────────────────────
// All "local" date math is done by shifting the UNIX timestamp by the TZ offset
// and then reading the UTC fields of the shifted Date.

function localParts(unixSeconds) {
  const shifted = new Date((unixSeconds + TZ_OFFSET_HOURS * 3600) * 1000);
  return {
    date: shifted.toISOString().slice(0, 10), // YYYY-MM-DD in local time
    weekday: shifted.getUTCDay(),             // 0 Sun .. 6 Sat
  };
}

function todayLocalDate() {
  const shifted = new Date(Date.now() + TZ_OFFSET_HOURS * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function isWeekday(weekdayIndex) {
  return weekdayIndex >= 1 && weekdayIndex <= 5;
}

function summarise(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length === 0) return { min: null, max: null, avg: null };
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return { min, max, avg: Math.round(avg * 100) / 100 };
}

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

// ── combined CSV ────────────────────────────────────────────────────────────

// Format a UNIX timestamp as an ISO-8601 string in the configured local zone,
// e.g. 1778601639 -> "2026-05-13T22:00:39+08:00".
function toLocalISO(unixSeconds) {
  const shifted = new Date((unixSeconds + TZ_OFFSET_HOURS * 3600) * 1000);
  const base = shifted.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS
  const sign = TZ_OFFSET_HOURS >= 0 ? '+' : '-';
  const abs = Math.abs(TZ_OFFSET_HOURS);
  const hh = String(Math.floor(abs)).padStart(2, '0');
  const mm = String(Math.round((abs % 1) * 60)).padStart(2, '0');
  return `${base}${sign}${hh}:${mm}`;
}

const CSV_HEADER = 'timestamp,datetime,date,weekday,co2_ppm,temp_c,hum_pct';

// Rebuild archive/<deviceId>.csv from every per-day JSON file for that device —
// one row per reading, chronological. Returns the row count.
async function rebuildDeviceCsv(deviceId) {
  const dir = join(ARCHIVE_DIR, deviceId);
  let files;
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return 0; // no per-day archive for this device yet
  }
  const lines = [];
  for (const file of files) {
    const day = JSON.parse(await readFile(join(dir, file), 'utf8'));
    for (const r of day.readings || []) {
      lines.push([
        r.timestamp,
        toLocalISO(r.timestamp),
        day.date,
        day.weekday,
        r.co2 ?? '',
        r.temp ?? '',
        r.hum ?? '',
      ].join(','));
    }
  }
  await writeFile(
    join(ARCHIVE_DIR, `${deviceId}.csv`),
    [CSV_HEADER, ...lines].join('\n') + '\n',
  );
  return lines.length;
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('▶ archive-weekdays');
  console.log(`  window:   ${WINDOW_START} → ${WINDOW_END}  (TZ UTC+${TZ_OFFSET_HOURS})`);
  console.log(`  firebase: ${hasSecret ? 'writing Archive + repo files' : 'repo files only (no FIREBASE_DB_SECRET)'}`);
  if (FORCE) console.log('  FORCE: re-archiving days even if already archived');

  const today = todayLocalDate();

  const deviceMap = await dbGet('Devices', { shallow: true });
  const deviceIds = deviceMap ? Object.keys(deviceMap) : [];
  if (deviceIds.length === 0) {
    console.log('  no devices found — nothing to do.');
    return;
  }
  console.log(`  devices:  ${deviceIds.join(', ')}`);

  let written = 0;
  let skipped = 0;

  for (const deviceId of deviceIds) {
    const readings = (await dbGet(`Devices/${deviceId}/Readings`)) || {};
    const entries = Object.values(readings).filter(
      (r) => r && Number.isFinite(r.timestamp),
    );

    // group readings by local calendar date
    const byDate = new Map();
    for (const r of entries) {
      const { date, weekday } = localParts(r.timestamp);
      if (!isWeekday(weekday)) continue;            // weekends excluded
      if (date < WINDOW_START || date > WINDOW_END) continue;
      if (date >= today) continue;                  // skip the incomplete current day
      if (!byDate.has(date)) byDate.set(date, { weekday, rows: [] });
      byDate.get(date).rows.push({
        timestamp: r.timestamp,
        co2: r.co2 ?? null,
        temp: r.temp ?? null,
        hum: r.hum ?? null,
      });
    }

    for (const [date, { weekday, rows }] of [...byDate.entries()].sort()) {
      const repoPath = join(ARCHIVE_DIR, deviceId, `${date}.json`);
      const fbPath = `Archive/${deviceId}/${date}`;

      const repoDone = await fileExists(repoPath);
      // a Firebase shallow GET is cheap; only checked when we have a secret
      const fbDone = hasSecret && !FORCE
        ? Boolean(await dbGet(fbPath, { shallow: true }))
        : false;

      if (!FORCE && repoDone && (fbDone || !hasSecret)) {
        skipped++;
        continue;
      }

      rows.sort((a, b) => a.timestamp - b.timestamp);
      const payload = {
        device: deviceId,
        date,
        weekday: WEEKDAY_NAMES[weekday],
        timezone: `UTC+${TZ_OFFSET_HOURS}`,
        count: rows.length,
        archivedAt: new Date().toISOString(),
        summary: Object.fromEntries(
          METRICS.map((m) => [m, summarise(rows.map((r) => r[m]))]),
        ),
        readings: rows,
      };

      // 1. repo file
      await mkdir(dirname(repoPath), { recursive: true });
      await writeFile(repoPath, JSON.stringify(payload, null, 2) + '\n');

      // 2. Firebase Archive
      if (hasSecret) await dbPut(fbPath, payload);

      written++;
      console.log(`  ✓ ${deviceId}/${date} (${payload.weekday}) — ${rows.length} readings`);
    }

    // Always rebuild the combined CSV so it reflects the full archive,
    // even on runs where no new day was added.
    const csvRows = await rebuildDeviceCsv(deviceId);
    if (csvRows > 0) console.log(`  ⤓ ${deviceId}.csv — ${csvRows} rows`);
  }

  console.log(`▶ done. ${written} day(s) archived, ${skipped} already up to date.`);
}

main().catch((err) => {
  console.error('✗ archive-weekdays failed:', err.message);
  process.exit(1);
});
