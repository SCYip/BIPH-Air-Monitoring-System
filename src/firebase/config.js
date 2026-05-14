import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  query,
  limitToLast,
  onValue,
  off,
  get,
  set,
} from 'firebase/database';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDUwRP7cX-h0Z8GUqamFdvvlk6W1OUzow4",
  authDomain: "biph-aqs.firebaseapp.com",
  databaseURL: "https://biph-aqs-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "biph-aqs",
  storageBucket: "biph-aqs.firebasestorage.app",
  messagingSenderId: "799342583781",
  appId: "1:799342583781:web:383bd60532fd1017d2590c",
  measurementId: "G-YT0SXNDC10"
};

let app = null;
let database = null;
let auth = null;

export function initFirebase() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);
  }
  return { app, database, auth };
}

export function getDevicesRef() {
  const { database: db } = initFirebase();
  return ref(db, 'Devices');
}

// Push keys are chronological, so limitToLast() returns the most recent
// readings ordered by key — no `.indexOn` index required.
export function getDeviceReadingsRef(deviceId) {
  const { database: db } = initFirebase();
  return query(
    ref(db, `Devices/${deviceId}/Readings`),
    limitToLast(1000)
  );
}

export function subscribeToDevices(callback) {
  const devicesRef = getDevicesRef();
  onValue(devicesRef, (snapshot) => {
    const devices = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        devices.push({
          id: child.key,
          name: child.key,
          ...child.val(),
        });
      });
    }
    callback(devices);
  });
  return () => off(devicesRef);
}

export function subscribeToDeviceReadings(deviceId, timeRange, callback) {
  const { database: db } = initFirebase();
  // Only pull the most recent slice instead of the entire history. Sensors
  // push ~1 reading/min, so these bounds cover the requested window plus a
  // generous buffer (incl. the 48h fallback below). limitToLast() orders by
  // push key (chronological) — no `.indexOn` index needed.
  const limit = timeRange === '7d' ? 11000 : 3200;
  const readingsQuery = query(
    ref(db, `Devices/${deviceId}/Readings`),
    limitToLast(limit),
  );

  let isActive = true;

  const fetchReadings = async () => {
    if (!isActive) return;
    try {
      const now = new Date();
      const localOffset = now.getTimezoneOffset() * 60_000;
      const startOfToday = Math.floor((now.getTime() - localOffset) / 86_400_000) * 86_400;

      let startAt;
      if (timeRange === '7d') {
        startAt = startOfToday - 6 * 86_400;
      } else {
        // "24h" = today 00:00 in local time
        startAt = startOfToday;
      }

      const snapshot = await get(readingsQuery);
      if (!isActive) return;

      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      const readings = [];
      snapshot.forEach((child) => {
        const data = child.val();
        readings.push({ key: child.key, ...data });
      });
      readings.sort((a, b) => a.timestamp - b.timestamp);

      // Filter to time window; fall back to last 48h if nothing matches today
      // (handles ESP32 clock offset from local time)
      let filtered = readings.filter((r) => r.timestamp >= startAt);
      if (filtered.length === 0 && timeRange === '24h') {
        filtered = readings.filter((r) => r.timestamp >= startAt - 48 * 3600);
      }

      callback(filtered);
    } catch (err) {
      if (isActive) callback([]);
    }
  };

  fetchReadings();
  const pollId = setInterval(fetchReadings, 10_000);

  return () => {
    isActive = false;
    clearInterval(pollId);
  };
}

export async function fetchDevices() {
  const { database: db } = initFirebase();
  const snapshot = await get(getDevicesRef());
  const devices = [];
  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      devices.push({ id: child.key, name: child.key, ...child.val() });
    });
  }
  return devices;
}

export async function fetchDeviceReadings(deviceId, timeRange = '24h') {
  const { database: db } = initFirebase();
  // See subscribeToDeviceReadings — fetch a bounded recent slice, not the
  // whole node. limitToLast() orders by chronological push key.
  const limit = timeRange === '7d' ? 11000 : 3200;
  const readingsQuery = query(
    ref(db, `Devices/${deviceId}/Readings`),
    limitToLast(limit),
  );

  const now = new Date();
  const localOffset = now.getTimezoneOffset() * 60_000;
  const startOfToday = Math.floor((now.getTime() - localOffset) / 86_400_000) * 86_400;

  let startAt;
  if (timeRange === '7d') {
    startAt = startOfToday - 6 * 86_400;
  } else {
    startAt = startOfToday;
  }

  const snapshot = await get(readingsQuery);
  const readings = [];
  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      const data = child.val();
      readings.push({ key: child.key, ...data });
    });
    readings.sort((a, b) => a.timestamp - b.timestamp);
  }

  let filtered = readings.filter((r) => r.timestamp >= startAt);
  if (filtered.length === 0 && timeRange === '24h') {
    filtered = readings.filter((r) => r.timestamp >= startAt - 48 * 3600);
  }
  return filtered;
}

// ─── Admin Device Management ────────────────────────────────────────────────

export async function addDevice(deviceName, description = '') {
  const { database: db } = initFirebase();
  const deviceRef = ref(db, `Devices/${deviceName}`);
  const metaRef = ref(db, `Devices/${deviceName}/_meta`);
  await set(metaRef, {
    description,
    addedAt: Date.now(),
    addedBy: 'admin',
  });
  return { id: deviceName, name: deviceName, description };
}

export async function deleteDevice(deviceName) {
  const { database: db } = initFirebase();
  const deviceRef = ref(db, `Devices/${deviceName}`);
  await set(deviceRef, null);
}

// ─── Authentication ─────────────────────────────────────────────────────────

export function subscribeToAuthState(callback) {
  const { auth: firebaseAuth } = initFirebase();
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function signIn(email, password) {
  const { auth: firebaseAuth } = initFirebase();
  return signInWithEmailAndPassword(firebaseAuth, email, password);
}

export async function logOut() {
  const { auth: firebaseAuth } = initFirebase();
  return signOut(firebaseAuth);
}
