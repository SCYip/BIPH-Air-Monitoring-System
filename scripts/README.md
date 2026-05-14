# Data scripts

Maintenance jobs for the BIPH AQS Realtime Database. Plain Node.js (18+),
zero dependencies — they talk to Firebase over the REST API.

| Script | What it does |
|---|---|
| `archive-weekdays.mjs` | Copies weekday (Mon–Fri) readings out of `Devices/<id>/Readings` into permanent storage. Idempotent — re-running only adds days that aren't archived yet. |
| `cleanup-old-readings.mjs` | Deletes raw readings older than `RETENTION_DAYS` (default 14) from `Devices/<id>/Readings`. **Never touches `Archive`.** Dry-run unless `DRY_RUN=false`. |
| `lib/firebase-rest.mjs` | Tiny shared REST client for the Realtime Database. |

### What the archive produces

`archive-weekdays.mjs` writes the weekday data to three places:

| Where | Path | Format |
|---|---|---|
| Repo — analysis dataset | `archive/<id>.csv` | One **combined CSV per device**: every weekday reading as a row. Columns: `timestamp, datetime, date, weekday, co2_ppm, temp_c, hum_pct`. Open in Excel / R / Python. Rebuilt from scratch every run. |
| Repo — per-day record | `archive/<id>/<date>.json` | One JSON file per weekday with the full readings + a min/avg/max summary. |
| Firebase | `Archive/<id>/<date>` | Same structure as the per-day JSON. |

> The CSV is the **raw** archived record — outlier spikes are **not** filtered
> out of it (the dashboard only hides them for display). That's deliberate: a
> research dataset should be the unmodified data, with cleaning done — and
> documented — in your own analysis.

## Automation (GitHub Actions)

- **`.github/workflows/archive-weekdays.yml`** — runs daily, archives any finished
  weekday in the window `2026-04-01 → 2026-06-11`, commits new `archive/` files.
  The first run back-fills every existing weekday; later runs add one day at a time.
- **`.github/workflows/cleanup-old-readings.yml`** — runs weekly (Sundays), deletes
  readings older than 14 days. Manual runs default to a dry run.

## One-time setup — add the `FIREBASE_DB_SECRET` secret

The scripts need write/delete access. They authenticate with the legacy database
secret. Add it once as a GitHub Actions secret:

1. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `FIREBASE_DB_SECRET`
3. Value: the database secret (the same one in the README's ESP32 example)
4. Save.

Without the secret: `archive-weekdays.mjs` still writes the repo files but skips
the Firebase `Archive` node; `cleanup-old-readings.mjs` refuses to run live.

> A Firebase **service account** is the more modern option than the legacy
> database secret — switch later by swapping the auth in `lib/firebase-rest.mjs`.

## Running locally

```bash
# Back-fill every existing weekday into repo files (no secret needed):
npm run archive

# Same, but also write the Firebase Archive node:
FIREBASE_DB_SECRET=xxxx npm run archive

# Preview what cleanup would delete (safe, read-only):
npm run cleanup

# Actually delete readings older than 14 days:
FIREBASE_DB_SECRET=xxxx DRY_RUN=false npm run cleanup
```

## Config (env vars)

| Var | Default | Used by |
|---|---|---|
| `FIREBASE_DB_SECRET` | – | both (write/delete auth) |
| `FIREBASE_DB_URL` | `https://biph-aqs-default-rtdb.asia-southeast1.firebasedatabase.app` | both |
| `WINDOW_START` / `WINDOW_END` | `2026-04-01` / `2026-06-11` | archive |
| `TZ_OFFSET_HOURS` | `8` (UTC+8 — defines which calendar day / weekday a reading belongs to) | archive |
| `FORCE` | `false` | archive (re-archive existing days) |
| `RETENTION_DAYS` | `14` | cleanup |
| `DRY_RUN` | `true` | cleanup (`false` to actually delete) |
