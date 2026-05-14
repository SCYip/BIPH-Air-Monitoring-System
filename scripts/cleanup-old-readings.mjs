#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// cleanup-old-readings.mjs
//
// Deletes raw sensor readings older than RETENTION_DAYS from the live
// `Devices/<id>/Readings` node, so the Realtime Database stays small and the
// dashboard's polling stays cheap (it re-downloads the whole node every poll).
//
// SAFETY:
//   • Dry-run by default. It will NOT delete anything unless DRY_RUN=false.
//   • Only ever touches `Devices/<id>/Readings/<key>`. It never reads, writes,
//     or deletes the `Archive` node — archived weekday data is permanent.
//   • Readings without a valid numeric `timestamp` are left untouched.
//   • Run archive-weekdays.mjs first if you want weekday data preserved.
//
// Config (env vars):
//   FIREBASE_DB_SECRET   legacy DB secret. Required for a real (non-dry) run.
//   RETENTION_DAYS       keep readings newer than this many days. Default 14
//   DRY_RUN              "false" performs the deletion. Anything else = dry run.
//
// Usage:
//   node scripts/cleanup-old-readings.mjs                 # dry run, shows plan
//   DRY_RUN=false node scripts/cleanup-old-readings.mjs   # actually deletes
// ─────────────────────────────────────────────────────────────────────────────

import { dbGet, dbPatch, hasSecret } from './lib/firebase-rest.mjs';

const RETENTION_DAYS = Number(process.env.RETENTION_DAYS ?? 14);
const DRY_RUN = process.env.DRY_RUN !== 'false';
const CHUNK_SIZE = 2000; // keys per PATCH request

function fmt(unixSeconds) {
  return new Date(unixSeconds * 1000).toISOString().replace('.000Z', 'Z');
}

async function main() {
  const nowSec = Math.floor(Date.now() / 1000);
  const cutoff = nowSec - RETENTION_DAYS * 86400;

  console.log('▶ cleanup-old-readings');
  console.log(`  retention: ${RETENTION_DAYS} days`);
  console.log(`  cutoff:    ${fmt(cutoff)}  (delete readings older than this)`);
  console.log(`  mode:      ${DRY_RUN ? 'DRY RUN — nothing will be deleted' : 'LIVE — deletions will be applied'}`);

  if (!DRY_RUN && !hasSecret) {
    console.error('✗ refusing to run: DRY_RUN=false but FIREBASE_DB_SECRET is not set.');
    process.exit(1);
  }
  if (!Number.isFinite(RETENTION_DAYS) || RETENTION_DAYS < 1) {
    console.error(`✗ invalid RETENTION_DAYS: ${process.env.RETENTION_DAYS}`);
    process.exit(1);
  }

  const deviceMap = await dbGet('Devices', { shallow: true });
  const deviceIds = deviceMap ? Object.keys(deviceMap) : [];
  if (deviceIds.length === 0) {
    console.log('  no devices found — nothing to do.');
    return;
  }

  let totalOld = 0;
  let totalKept = 0;
  let totalDeleted = 0;

  for (const deviceId of deviceIds) {
    const readings = (await dbGet(`Devices/${deviceId}/Readings`)) || {};
    const allKeys = Object.keys(readings);

    const oldKeys = [];
    let kept = 0;
    let noTimestamp = 0;
    for (const key of allKeys) {
      const r = readings[key];
      const ts = r && r.timestamp;
      if (!Number.isFinite(ts)) { noTimestamp++; continue; } // never delete unknown-age rows
      if (ts < cutoff) oldKeys.push(key);
      else kept++;
    }

    totalOld += oldKeys.length;
    totalKept += kept;

    const note = noTimestamp ? `, ${noTimestamp} without timestamp (left alone)` : '';
    console.log(
      `  ${deviceId}: ${allKeys.length} total → ${oldKeys.length} older than cutoff, ${kept} kept${note}`,
    );

    if (oldKeys.length === 0) continue;

    if (DRY_RUN) {
      const sample = oldKeys.slice(0, 2).map((k) => fmt(readings[k].timestamp));
      console.log(`     would delete ${oldKeys.length} (e.g. ${sample.join(', ')} …)`);
      continue;
    }

    // LIVE: delete in chunks via PATCH { key: null }
    for (let i = 0; i < oldKeys.length; i += CHUNK_SIZE) {
      const chunk = oldKeys.slice(i, i + CHUNK_SIZE);
      const patch = Object.fromEntries(chunk.map((k) => [k, null]));
      await dbPatch(`Devices/${deviceId}/Readings`, patch);
      totalDeleted += chunk.length;
      console.log(`     deleted ${Math.min(i + CHUNK_SIZE, oldKeys.length)}/${oldKeys.length}`);
    }
  }

  console.log('▶ summary');
  console.log(`  kept (within ${RETENTION_DAYS}d): ${totalKept}`);
  if (DRY_RUN) {
    console.log(`  would delete:               ${totalOld}`);
    console.log('  (set DRY_RUN=false to apply)');
  } else {
    console.log(`  deleted:                    ${totalDeleted}`);
  }
  console.log('  Archive node: untouched.');
}

main().catch((err) => {
  console.error('✗ cleanup-old-readings failed:', err.message);
  process.exit(1);
});
