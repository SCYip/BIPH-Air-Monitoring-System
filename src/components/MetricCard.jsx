import React from 'react';

// ─── Status thresholds ──────────────────────────────────────────────────────

const STATUS = {
  good:     { label: 'Excellent',   pill: 'pill-good',     color: '#10b981', tint: 'rgba(16,185,129,0.10)' },
  ok:       { label: 'Good',        pill: 'pill-good',     color: '#22c55e', tint: 'rgba(34,197,94,0.10)' },
  moderate: { label: 'Moderate',    pill: 'pill-moderate', color: '#f59e0b', tint: 'rgba(245,158,11,0.10)' },
  poor:     { label: 'Poor',        pill: 'pill-poor',     color: '#ef4444', tint: 'rgba(239,68,68,0.10)' },
  none:     { label: 'No Data',     pill: 'pill-neutral',  color: '#94a3b8', tint: 'rgba(148,163,184,0.10)' },
};

function getCO2Status(co2) {
  if (co2 == null || isNaN(co2)) return STATUS.none;
  if (co2 < 600)  return STATUS.good;
  if (co2 < 800)  return STATUS.ok;
  if (co2 < 1500) return STATUS.moderate;
  return STATUS.poor;
}

function getTempStatus(temp) {
  if (temp == null || isNaN(temp)) return STATUS.none;
  if (temp < 18)  return { ...STATUS.ok, label: 'Cool',         color: '#0ea5e9', tint: 'rgba(14,165,233,0.10)', pill: 'pill-brand' };
  if (temp <= 26) return { ...STATUS.good, label: 'Comfortable' };
  if (temp <= 32) return { ...STATUS.moderate, label: 'Warm' };
  return { ...STATUS.poor, label: 'Hot' };
}

function getHumStatus(hum) {
  if (hum == null || isNaN(hum)) return STATUS.none;
  if (hum < 30) return { ...STATUS.moderate, label: 'Dry' };
  if (hum <= 60) return { ...STATUS.good, label: 'Comfortable' };
  return { ...STATUS.moderate, label: 'Humid' };
}

// ─── Gradient progress bar ──────────────────────────────────────────────────

function GradientBar({ pct, color, tint, segments }) {
  const safePct = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative">
      {/* Track */}
      <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${safePct}%`,
            background: `linear-gradient(90deg, ${color}cc 0%, ${color} 100%)`,
            boxShadow: `0 0 12px ${color}66`,
          }}
        />
        {/* Subtle overlay highlight */}
        <div
          className="absolute inset-y-0 left-0 rounded-full pointer-events-none"
          style={{
            width: `${safePct}%`,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 50%)',
          }}
        />
      </div>
      {/* Segment markers */}
      {segments && (
        <div className="relative mt-2 h-3">
          {segments.map((s, i) => (
            <div
              key={i}
              className="absolute -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${s.at}%` }}
            >
              <span className="block w-px h-1.5 bg-ink-300" />
              <span className="code text-ink-400" style={{ fontSize: 10 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sparkline ──────────────────────────────────────────────────────────────

function MiniGauge({ value, color, max = 100 }) {
  // Tiny radial gauge
  const pct = Math.max(0, Math.min(1, value / max));
  const r = 14;
  const c = 2 * Math.PI * r;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0">
      <circle cx="18" cy="18" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3" />
      <circle
        cx="18" cy="18" r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform="rotate(-90 18 18)"
        style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
      />
    </svg>
  );
}

// ─── Card shell ─────────────────────────────────────────────────────────────

function MetricCard({
  eyebrow, label, value, unit, formatter, status, segments, pct, max,
  loading, gaugeValue,
}) {
  const display =
    value == null || isNaN(value)
      ? '—'
      : formatter
        ? formatter(value)
        : Math.round(value).toString();

  return (
    <div
      className="surface relative overflow-hidden p-7 animate-rise"
      style={{ background: `linear-gradient(160deg, ${status.tint} 0%, transparent 60%), #ffffff` }}
    >
      {/* corner gauge */}
      <div className="absolute top-5 right-5">
        <MiniGauge value={gaugeValue ?? pct} color={status.color} max={max ?? 100} />
      </div>

      {/* eyebrow */}
      <div className="eyebrow mb-2">{eyebrow}</div>

      {/* label */}
      <div className="text-sm font-semibold text-ink-700 mb-5">{label}</div>

      {/* main value */}
      <div className="flex items-baseline gap-2 mb-6">
        {loading ? (
          <div className="h-14 w-32 skeleton" />
        ) : (
          <>
            <span
              className="display num text-[64px] font-bold leading-none"
              style={{
                color: value == null ? '#94a3b8' : '#0f172a',
              }}
            >
              {display}
            </span>
            <span className="text-base font-medium text-ink-500">{unit}</span>
          </>
        )}
      </div>

      {/* progress bar */}
      <GradientBar pct={pct} color={status.color} tint={status.tint} segments={segments} />

      {/* status pill */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-ink-100">
        <span className={`pill ${status.pill}`}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
          {status.label}
        </span>
      </div>
    </div>
  );
}

// ─── Public cards ───────────────────────────────────────────────────────────

export function CO2Card({ value, loading }) {
  const status = getCO2Status(value);
  const pct = value != null ? Math.min(100, (value / 2000) * 100) : 0;
  return (
    <MetricCard
      eyebrow="CO₂ · Carbon Dioxide"
      label="Air freshness"
      value={value}
      unit="ppm"
      status={status}
      pct={pct}
      gaugeValue={pct}
      max={100}
      loading={loading}
      segments={[
        { at: 0,   label: '0' },
        { at: 40,  label: '800' },
        { at: 75,  label: '1.5k' },
        { at: 100, label: '2k' },
      ]}
    />
  );
}

export function TempCard({ value, loading }) {
  const status = getTempStatus(value);
  const pct = value != null ? Math.min(100, Math.max(0, ((value + 5) / 45) * 100)) : 0;
  return (
    <MetricCard
      eyebrow="T · Temperature"
      label="Indoor climate"
      value={value}
      unit="°C"
      formatter={(v) => v.toFixed(1)}
      status={status}
      pct={pct}
      gaugeValue={pct}
      max={100}
      loading={loading}
      segments={[
        { at: 0,   label: '-5°' },
        { at: 51,  label: '18°' },
        { at: 69,  label: '26°' },
        { at: 100, label: '40°' },
      ]}
    />
  );
}

export function HumCard({ value, loading }) {
  const status = getHumStatus(value);
  const pct = value != null ? Math.min(100, Math.max(0, value)) : 0;
  return (
    <MetricCard
      eyebrow="RH · Humidity"
      label="Atmospheric moisture"
      value={value}
      unit="%"
      formatter={(v) => v.toFixed(1)}
      status={status}
      pct={pct}
      gaugeValue={pct}
      max={100}
      loading={loading}
      segments={[
        { at: 0,   label: '0%' },
        { at: 30,  label: '30%' },
        { at: 60,  label: '60%' },
        { at: 100, label: '100%' },
      ]}
    />
  );
}

export default { CO2Card, TempCard, HumCard };
