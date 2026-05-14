import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AdminAuth from './AdminAuth';
import DeviceSelector from './DeviceSelector';
import { CO2Card, TempCard, HumCard } from './MetricCard';
import HistoricalChart from './HistoricalChart';
import TimeFilter from './TimeFilter';
import StatusBadge from './StatusBadge';
import AddDeviceModal from './AddDeviceModal';
import {
  subscribeToDevices,
  subscribeToDeviceReadings,
} from '../firebase/config';
import { formatTimestamp } from '../utils/dateUtils';
import { buildSparklinePath, sparklineColor } from '../utils/sparkline';

// ─── Notification Banner ────────────────────────────────────────────────────

function NotificationBanner({ alerts, onDismiss }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div className="mb-6 surface flex items-start gap-3 p-4 animate-rise" style={{ borderColor: '#fecaca', background: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 60%)' }}>
      <div className="shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4 text-red-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-red-900">Air Quality Alert</p>
        {alerts.map((a, i) => (
          <p key={i} className="text-sm text-red-700 mt-0.5">
            <span className="font-medium">{a.device}</span> — {a.message}
          </p>
        ))}
      </div>
      <button onClick={onDismiss} className="btn btn-ghost text-xs text-red-600 hover:bg-red-100 hover:text-red-800 -mt-1">
        Dismiss
      </button>
    </div>
  );
}

// ─── Export Modal ───────────────────────────────────────────────────────────

function ExportModal({ onClose, readings, deviceDisplayName }) {
  const [format, setFormat] = useState('csv');

  const handleExport = () => {
    if (!readings || readings.length === 0) return;
    let content, filename, mime;
    if (format === 'csv') {
      const header = 'Timestamp,DateTime,CO2 (ppm),Temperature (C),Humidity (%)\n';
      const rows = readings.map((r) => {
        const dt = new Date(r.timestamp * 1000).toISOString();
        return `${r.timestamp},${dt},${r.co2 ?? ''},${r.temp ?? ''},${r.hum ?? ''}`;
      }).join('\n');
      content = header + rows;
      filename = `${deviceDisplayName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
      mime = 'text/csv';
    } else {
      content = JSON.stringify(readings, null, 2);
      filename = `${deviceDisplayName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
      mime = 'application/json';
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="surface-elevated w-full max-w-md overflow-hidden animate-rise">
        <div className="px-7 pt-7 pb-5">
          <div className="eyebrow mb-2">Export Data</div>
          <h2 className="text-2xl font-bold text-ink-900 tracking-tight">Download readings</h2>
          <p className="text-sm text-ink-500 mt-1.5">
            <span className="font-medium text-ink-700">{readings.length}</span> records from{' '}
            <span className="font-medium text-ink-700">{deviceDisplayName}</span>
          </p>
        </div>

        <div className="px-7 pb-7 space-y-5">
          <div>
            <div className="eyebrow mb-2.5">Format</div>
            <div className="grid grid-cols-2 gap-2">
              {['csv', 'json'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                    format === f
                      ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-sm'
                      : 'bg-white border-ink-200 text-ink-600 hover:border-ink-300'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={!readings || readings.length === 0}
            className="btn btn-primary w-full py-3 text-sm disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download {format.toUpperCase()}
          </button>

          <button onClick={onClose} className="btn btn-ghost w-full text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Hero Composite ─────────────────────────────────────────────────────────

function HeroComposite({ devices, allReadings }) {
  const overall = useMemo(() => {
    const latest = Object.entries(allReadings)
      .map(([, r]) => r && r.length > 0 ? r[r.length - 1] : null)
      .filter(Boolean);
    if (latest.length === 0) return null;

    const avgCO2 = latest.reduce((s, r) => s + (r.co2 ?? 0), 0) / latest.length;
    const avgT   = latest.reduce((s, r) => s + (r.temp ?? 0), 0) / latest.length;
    const avgH   = latest.reduce((s, r) => s + (r.hum ?? 0), 0) / latest.length;

    let label, color, light, pill, gradient;
    if (avgCO2 < 600) {
      label = 'Excellent'; color = '#10b981'; light = '#d1fae5'; pill = 'pill-good';
      gradient = 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%)';
    } else if (avgCO2 < 800) {
      label = 'Good'; color = '#22c55e'; light = '#dcfce7'; pill = 'pill-good';
      gradient = 'linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%)';
    } else if (avgCO2 < 1500) {
      label = 'Moderate'; color = '#f59e0b'; light = '#fef3c7'; pill = 'pill-moderate';
      gradient = 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)';
    } else {
      label = 'Poor'; color = '#ef4444'; light = '#fee2e2'; pill = 'pill-poor';
      gradient = 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)';
    }

    return { avgCO2, avgT, avgH, label, color, light, pill, gradient, sites: latest.length };
  }, [allReadings]);

  // Loading state
  if (!overall) {
    return (
      <div className="surface-elevated p-10 mb-10">
        <div className="eyebrow mb-3">Atmospheric composite</div>
        <div className="h-16 w-72 skeleton mb-4" />
        <div className="h-4 w-48 skeleton" />
      </div>
    );
  }

  // Gauge geometry
  const pct = Math.min(1, overall.avgCO2 / 2000);
  const r = 100;
  const c = Math.PI * r;
  const dashOffset = c * (1 - pct);

  return (
    <div
      className="surface-elevated relative overflow-hidden mb-10 animate-reveal"
      style={{ background: overall.gradient }}
    >
      {/* Decorative top brand stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(90deg, ${overall.color}00 0%, ${overall.color} 50%, ${overall.color}00 100%)` }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 lg:p-10 items-center">
        {/* Left: Big number */}
        <div className="lg:col-span-7">
          <div className="flex items-center gap-3 mb-5">
            <span className="live-dot" style={{ background: overall.color, color: overall.color }} />
            <span className="eyebrow">Atmospheric Composite · Live</span>
          </div>

          <div className="flex items-baseline gap-4 flex-wrap mb-5">
            <span
              className="display num font-bold leading-none tracking-tightest"
              style={{
                fontSize: 'clamp(72px, 12vw, 144px)',
                color: overall.color,
              }}
            >
              {Math.round(overall.avgCO2)}
            </span>
            <div className="pb-3">
              <div className="text-2xl font-medium text-ink-700 tracking-tight">ppm CO₂</div>
              <div className="text-sm text-ink-500 mt-1">averaged across {overall.sites} site{overall.sites !== 1 ? 's' : ''}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className={`pill ${overall.pill}`} style={{ fontSize: 12, padding: '6px 12px' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: overall.color }} />
              {overall.label} air quality
            </span>
            <span className="text-sm text-ink-500">
              Updated continuously from all instruments
            </span>
          </div>
        </div>

        {/* Right: Semicircular gauge + sub-stats */}
        <div className="lg:col-span-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Semicircle gauge */}
            <div className="relative flex flex-col items-center">
              <svg viewBox="0 0 240 130" className="w-full max-w-[220px]">
                <defs>
                  <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"  stopColor={overall.color} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={overall.color} stopOpacity="1" />
                  </linearGradient>
                </defs>
                {/* Track */}
                <path
                  d={`M 20 110 A ${r} ${r} 0 0 1 220 110`}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                {/* Fill */}
                <path
                  d={`M 20 110 A ${r} ${r} 0 0 1 220 110`}
                  fill="none"
                  stroke="url(#gauge-grad)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 1200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                <div className="text-xs text-ink-500 font-medium">Air Quality Index</div>
                <div className="text-base font-semibold text-ink-900">{overall.label}</div>
              </div>
            </div>

            {/* Sub-stats */}
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-4">
              <div className="surface-glass p-4">
                <div className="eyebrow mb-1" style={{ fontSize: 10 }}>Temp</div>
                <div className="display num text-2xl font-bold text-ink-900">
                  {overall.avgT.toFixed(1)}<span className="text-sm text-ink-500 font-medium ml-1">°C</span>
                </div>
              </div>
              <div className="surface-glass p-4">
                <div className="eyebrow mb-1" style={{ fontSize: 10 }}>Humidity</div>
                <div className="display num text-2xl font-bold text-ink-900">
                  {overall.avgH.toFixed(1)}<span className="text-sm text-ink-500 font-medium ml-1">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sensor Site Card ───────────────────────────────────────────────────────

function SensorSiteCard({ index, device, sparklineData, latestReading, onClick }) {
  const co2Values = sparklineData.map((r) => r.co2).filter(isFinite);
  const avgCO2 = co2Values.length ? co2Values.reduce((a, b) => a + b, 0) / co2Values.length : null;
  const color = sparklineColor(avgCO2);
  const path  = buildSparklinePath(co2Values.slice(-40));
  const lastUpdate = latestReading ? formatTimestamp(latestReading.timestamp, 'time') : null;

  let statusLabel = 'Awaiting', statusPill = 'pill-neutral', statusColor = '#94a3b8';
  if (latestReading) {
    if (latestReading.co2 < 800)       { statusLabel = 'Good';     statusPill = 'pill-good';     statusColor = '#10b981'; }
    else if (latestReading.co2 < 1500) { statusLabel = 'Moderate'; statusPill = 'pill-moderate'; statusColor = '#f59e0b'; }
    else                                { statusLabel = 'Poor';     statusPill = 'pill-poor';     statusColor = '#ef4444'; }
  }

  return (
    <button
      onClick={onClick}
      className="surface-interactive group p-6 text-left w-full animate-rise"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0 flex-1 pr-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="code text-ink-400" style={{ fontSize: 11 }}>{String(index).padStart(2, '0')}</span>
            <span className={`pill ${statusPill}`} style={{ fontSize: 10, padding: '2px 8px' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
              {statusLabel}
            </span>
          </div>
          <div className="text-base font-semibold text-ink-900 leading-tight tracking-tight truncate">
            {device.description || device.id}
          </div>
          <div className="code text-ink-400 mt-1 truncate">{device.id}</div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-ink-50 group-hover:bg-brand-50 flex items-center justify-center transition-colors shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-ink-400 group-hover:text-brand-600 transition-colors">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </div>

      {/* Sparkline + value */}
      <div className="flex items-end justify-between gap-4 pt-4 border-t border-ink-100">
        <div className="min-w-0">
          {latestReading ? (
            <>
              <div className="display num text-3xl font-bold leading-none" style={{ color: statusColor }}>
                {Math.round(latestReading.co2)}
                <span className="text-xs text-ink-400 font-medium ml-1">ppm</span>
              </div>
              <div className="code text-ink-400 mt-1.5">{lastUpdate}</div>
            </>
          ) : (
            <div className="h-8 w-24 skeleton" />
          )}
        </div>
        {path ? (
          <svg width="100" height="36" className="shrink-0">
            <defs>
              <linearGradient id={`spark-${device.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0"  />
              </linearGradient>
            </defs>
            <path d={`${path} L 100 36 L 0 36 Z`} fill={`url(#spark-${device.id})`} />
            <path d={path} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <div className="w-[100px] h-9 skeleton" />
        )}
      </div>
    </button>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const [devices, setDevices]                 = useState([]);
  const [selectedDevice, setSelectedDevice]   = useState('');
  const [devicesLoading, setDevicesLoading]   = useState(true);
  const [readings, setReadings]               = useState([]);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [timeRange, setTimeRange]             = useState('24h');
  const [systemStatus, setSystemStatus]       = useState('loading');
  const [currentUser, setCurrentUser]         = useState(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [alerts, setAlerts]                   = useState([]);
  const [allDeviceReadings, setAllDeviceReadings] = useState({});

  const unsubRef = useRef(null);

  const handleDeviceChange = useCallback((deviceId) => {
    setSelectedDevice(deviceId);
    if (deviceId) localStorage.setItem('lastDevice', deviceId);
    else          localStorage.removeItem('lastDevice');
  }, []);

  const handleTimeRangeChange = useCallback((range) => {
    setTimeRange(range);
    localStorage.setItem('timeRange', range);
  }, []);

  const dismissAlerts = useCallback(() => setAlerts([]), []);

  // Subscribe to device list
  useEffect(() => {
    let active = true;
    setDevicesLoading(true);
    setSystemStatus('loading');

    const unsub = subscribeToDevices((deviceList) => {
      if (!active) return;
      setDevices(deviceList);
      setDevicesLoading(false);
      if (deviceList.length === 0) { setSystemStatus('offline'); return; }
      const lastDevice = localStorage.getItem('lastDevice');
      const lastRange  = localStorage.getItem('timeRange');
      if (lastRange) setTimeRange(lastRange);
      if (lastDevice && deviceList.some((d) => d.id === lastDevice)) setSelectedDevice(lastDevice);
      else if (deviceList.length > 0) setSelectedDevice(deviceList[0].id);
      setSystemStatus('online');
    });

    return () => { active = false; unsub(); };
  }, []);

  // Subscribe to readings for selected device
  useEffect(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    if (!selectedDevice)  { setReadings([]); return; }

    setReadingsLoading(true);

    unsubRef.current = subscribeToDeviceReadings(
      selectedDevice,
      timeRange,
      (newReadings) => {
        setReadings(newReadings);
        setReadingsLoading(false);
        if (newReadings.length > 0) {
          setSystemStatus('online');
          setAllDeviceReadings((prev) => ({ ...prev, [selectedDevice]: newReadings }));
        }
      }
    );

    return () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } };
  }, [selectedDevice, timeRange]);

  // Derived
  const latestReading     = readings.length > 0 ? readings[readings.length - 1] : null;
  const lastUpdateDisplay = latestReading ? formatTimestamp(latestReading.timestamp, 'full') : '—';
  const selectedDeviceObj = devices.find((d) => d.id === selectedDevice);
  const deviceDisplayName = selectedDeviceObj?.description || selectedDeviceObj?.id || selectedDevice;

  useEffect(() => {
    if (!selectedDevice || readings.length === 0) return;
    const latest = readings[readings.length - 1];
    if (!latest) return;
    const newAlerts = [];
    if (latest.co2 > 1500)      newAlerts.push({ device: deviceDisplayName, message: `CO₂ critically high at ${Math.round(latest.co2)} ppm — ventilate immediately` });
    else if (latest.co2 > 1000) newAlerts.push({ device: deviceDisplayName, message: `CO₂ elevated at ${Math.round(latest.co2)} ppm — consider opening windows` });
    if (latest.temp > 32)       newAlerts.push({ device: deviceDisplayName, message: `Temperature high at ${latest.temp.toFixed(1)}°C` });
    setAlerts(newAlerts);
  }, [readings, selectedDevice, deviceDisplayName]);

  return (
    <div className="app-bg">
      <div className="relative z-10">
        {/* ── Top bar ── */}
        <nav className="sticky top-0 z-30 surface-glass border-b border-ink-100 rounded-none">
          <div className="max-w-[1320px] mx-auto px-6 sm:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 shadow-md shadow-brand-600/30 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                    </svg>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white" style={{ background: '#10b981' }} />
                </div>
                <div>
                  <div className="font-bold text-ink-900 tracking-tight leading-none">BIPH<span className="text-grad-brand">AQS</span></div>
                  <div className="text-[10px] text-ink-500 font-medium tracking-wide leading-none mt-0.5">Air Quality · v1.1</div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <StatusBadge status={systemStatus} />

                {currentUser && (
                  <button onClick={() => setShowDeviceModal(true)} className="btn btn-secondary text-xs">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                    Add device
                  </button>
                )}

                <div className="hidden lg:block h-6 w-px bg-ink-200 mx-1" />

                <div className="hidden lg:block text-right">
                  <div className="text-[10px] text-ink-400 font-medium uppercase tracking-wider leading-none">Last sample</div>
                  <div className="code text-ink-700 leading-none mt-1" style={{ fontSize: 11 }}>{lastUpdateDisplay}</div>
                </div>

                <AdminAuth user={currentUser} onUserChange={setCurrentUser} />
              </div>
            </div>
          </div>
        </nav>

        {/* ── Main ── */}
        <main className="max-w-[1320px] mx-auto px-6 sm:px-8 py-10 sm:py-14">

          <NotificationBanner alerts={alerts} onDismiss={dismissAlerts} />

          {/* ── Index/Home ── */}
          {!selectedDevice && !devicesLoading && (
            <div className="animate-reveal">
              <header className="mb-10 max-w-3xl">
                <div className="eyebrow mb-3 flex items-center gap-2">
                  <span className="w-6 h-px bg-brand-600" />
                  BIPH AQS · Air Quality System
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-ink-900 tracking-tightest leading-[1.05] text-balance">
                  Real-time air quality, <span className="text-grad-brand">measured continuously</span> across every room.
                </h1>
                <p className="mt-5 text-base sm:text-lg text-ink-600 leading-relaxed text-pretty max-w-2xl">
                  Live CO₂, temperature, and humidity readings from <span className="font-semibold text-ink-900 num">{devices.length}</span> sensor{devices.length !== 1 ? 's' : ''} across the building.
                  Tap any instrument to dive into its full transcript.
                </p>
              </header>

              <HeroComposite devices={devices} allReadings={allDeviceReadings} />

              {devices.length > 0 && (
                <section>
                  <div className="flex items-baseline justify-between mb-5">
                    <div>
                      <h2 className="text-xl font-bold text-ink-900 tracking-tight">Sensor sites</h2>
                      <p className="text-sm text-ink-500 mt-0.5">{devices.length} instruments · live data</p>
                    </div>
                    <DeviceSelector
                      devices={devices}
                      selectedDevice={selectedDevice}
                      onDeviceChange={handleDeviceChange}
                      loading={devicesLoading}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {devices.map((device, idx) => (
                      <SensorSiteCard
                        key={device.id}
                        index={idx + 1}
                        device={device}
                        sparklineData={allDeviceReadings[device.id] ?? []}
                        latestReading={(allDeviceReadings[device.id] ?? []).slice(-1)[0]}
                        onClick={() => handleDeviceChange(device.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {devices.length === 0 && (
                <div className="surface p-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-ink-50 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-ink-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-ink-900 mb-1">No sensors registered</h3>
                  <p className="text-sm text-ink-500">
                    {currentUser ? (
                      <button onClick={() => setShowDeviceModal(true)} className="text-brand-600 hover:text-brand-700 font-medium underline">
                        Register the first sensor →
                      </button>
                    ) : (
                      <>Administrator login required to register devices.</>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Loading skeleton ── */}
          {!selectedDevice && devicesLoading && (
            <div className="space-y-6 max-w-3xl">
              <div className="h-12 w-2/3 skeleton" />
              <div className="h-6 w-1/2 skeleton" />
              <div className="surface p-10 mt-10">
                <div className="h-20 w-48 skeleton mb-6" />
                <div className="h-4 w-full skeleton" />
              </div>
            </div>
          )}

          {/* ── Device Detail ── */}
          {selectedDevice && (
            <div className="animate-reveal">
              <header className="mb-8">
                <button
                  onClick={() => handleDeviceChange('')}
                  className="btn btn-ghost text-xs mb-4 -ml-2"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
                  </svg>
                  All sensors
                </button>

                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                  <div>
                    <div className="eyebrow mb-3 flex items-center gap-2">
                      <span className="live-dot" />
                      Live sensor
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-ink-900 tracking-tightest leading-tight">
                      {deviceDisplayName}
                    </h1>
                    <div className="code text-ink-500 mt-1.5">{selectedDevice}</div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <DeviceSelector
                      devices={devices}
                      selectedDevice={selectedDevice}
                      onDeviceChange={handleDeviceChange}
                      loading={false}
                    />
                    <TimeFilter
                      selectedRange={timeRange}
                      onRangeChange={handleTimeRangeChange}
                    />
                    <button
                      onClick={() => setShowExportModal(true)}
                      disabled={readings.length === 0}
                      className="btn btn-secondary text-xs disabled:opacity-40"
                    >
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Export
                    </button>
                  </div>
                </div>
              </header>

              {/* Metric cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <CO2Card  value={latestReading?.co2}  loading={readingsLoading && !latestReading} />
                <TempCard value={latestReading?.temp} loading={readingsLoading && !latestReading} />
                <HumCard  value={latestReading?.hum}  loading={readingsLoading && !latestReading} />
              </div>

              {/* Charts */}
              <section className="space-y-4 mb-10">
                <HistoricalChart type="co2"  key={`${selectedDevice}-${timeRange}-co2`}  data={readings} timeRange={timeRange} loading={readingsLoading} />
                <HistoricalChart type="temp" key={`${selectedDevice}-${timeRange}-temp`} data={readings} timeRange={timeRange} loading={readingsLoading} />
                <HistoricalChart type="hum"  key={`${selectedDevice}-${timeRange}-hum`}  data={readings} timeRange={timeRange} loading={readingsLoading} />
              </section>

              {/* Insights */}
              {readings.length > 5 && (
                <section className="surface p-7">
                  <div className="flex items-center gap-2.5 mb-5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5 text-brand-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-ink-900">Reading summary</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                      { label: 'Total records', value: readings.length, unit: '' },
                      { label: 'Latest CO₂',   value: latestReading ? Math.round(latestReading.co2) : '—', unit: 'ppm' },
                      { label: 'Latest temp',  value: latestReading ? latestReading.temp.toFixed(1) : '—', unit: '°C' },
                      { label: 'Latest humidity', value: latestReading ? latestReading.hum.toFixed(1) : '—', unit: '%' },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <div className="eyebrow mb-1.5" style={{ fontSize: 10 }}>{stat.label}</div>
                        <div className="display num text-2xl font-bold text-ink-900">
                          {stat.value}
                          {stat.unit && <span className="text-sm text-ink-500 font-medium ml-1">{stat.unit}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-20 pt-8 border-t border-ink-200 flex flex-col sm:flex-row items-center sm:items-baseline justify-between gap-3 text-center sm:text-left">
            <div>
              <p className="text-sm font-medium text-ink-700">BIPH AQS · Air Quality System</p>
              <p className="code text-ink-400 mt-0.5">
                firebase realtime database · refresh 10s · v1.1.0
              </p>
            </div>
            <div className="code text-ink-400">
              © {new Date().getFullYear()} · Environmental Engineering Club
            </div>
          </footer>
        </main>
      </div>

      {showDeviceModal && (
        <AddDeviceModal
          onClose={() => setShowDeviceModal(false)}
          devices={devices}
          onAdded={() => {}}
        />
      )}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          readings={readings}
          deviceDisplayName={deviceDisplayName}
        />
      )}
    </div>
  );
}
