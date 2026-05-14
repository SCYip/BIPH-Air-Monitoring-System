// Minimal Firebase Realtime Database REST client — zero dependencies.
//
// Auth: pass the legacy database secret via the FIREBASE_DB_SECRET env var.
// Reads work without it (rules allow public read on Devices); writes/deletes
// and reading the Archive node require it.
//
// Docs: https://firebase.google.com/docs/database/rest/start

const DB_URL = (
  process.env.FIREBASE_DB_URL ||
  'https://biph-aqs-default-rtdb.asia-southeast1.firebasedatabase.app'
).replace(/\/+$/, '');

const SECRET = process.env.FIREBASE_DB_SECRET || '';

export const hasSecret = Boolean(SECRET);
export { DB_URL };

function buildUrl(path, params = {}) {
  const clean = String(path).replace(/^\/+|\/+$/g, '');
  const url = new URL(`${DB_URL}/${clean}.json`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  if (SECRET) url.searchParams.set('auth', SECRET);
  return url.toString();
}

async function request(method, path, { params, body } = {}) {
  const res = await fetch(buildUrl(path, params), {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

/** GET a path. Pass { shallow: true } to fetch keys only. */
export function dbGet(path, params = {}) {
  return request('GET', path, { params });
}

/** PUT (overwrite) a path with `data`. */
export function dbPut(path, data) {
  return request('PUT', path, { body: data });
}

/** PATCH (merge) a path with `data`. Set a child to null to delete it. */
export function dbPatch(path, data) {
  return request('PATCH', path, { body: data });
}

/** DELETE a path entirely. */
export function dbDelete(path) {
  return request('DELETE', path).then(() => true);
}
