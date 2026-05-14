import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  CategoryScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(
  LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, CategoryScale, zoomPlugin
);

function makeGradient(ctx, area, r, g, b, opTop, opBot) {
  if (!area || !isFinite(area.top)) return `rgba(${r},${g},${b},0.1)`;
  const grad = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  grad.addColorStop(0, `rgba(${r},${g},${b},${opTop})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},${opBot})`);
  return grad;
}

const CONFIGS = {
  co2:  { label: 'CO₂',         unit: 'ppm', r: 37,  g: 99,  b: 235, opTop: 0.32, opBot: 0.0 },
  temp: { label: 'Temperature', unit: '°C',  r: 245, g: 158, b: 11,  opTop: 0.28, opBot: 0.0 },
  hum:  { label: 'Humidity',    unit: '%',   r: 14,  g: 165, b: 233, opTop: 0.28, opBot: 0.0 },
};

const TITLES = {
  co2:  'Carbon Dioxide',
  temp: 'Temperature',
  hum:  'Humidity',
};

const UNITS = { co2: 'ppm', temp: '°C', hum: '%' };

function EmptyState() {
  return (
    <div className="h-72 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-ink-50 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-ink-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-ink-700">No data in this range</p>
          <p className="text-xs text-ink-400 mt-0.5">Try a wider time window or check sensor status.</p>
        </div>
      </div>
    </div>
  );
}

function formatLabel(date, timeRange) {
  if (timeRange === '7d') {
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function HistoricalChart({ type, data, timeRange, loading }) {
  const cfg = CONFIGS[type];
  const [isZoomed, setIsZoomed] = useState(false);
  const chartRef = useRef(null);

  const handleResetZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
      setIsZoomed(false);
    }
  }, []);

  const chartData = useMemo(() => {
    const labels = data.map((d) => formatLabel(new Date(d.timestamp * 1000), timeRange));
    const values = data.map((d) => isFinite(d[type]) ? d[type] : null);
    const validCount = values.filter(isFinite).length;
    return {
      labels,
      datasets: [{
        label: cfg.label,
        data: values,
        borderColor: `rgb(${cfg.r},${cfg.g},${cfg.b})`,
        backgroundColor: (ctx) => {
          const { ctx: c, chartArea } = ctx.chart;
          return makeGradient(c, chartArea, cfg.r, cfg.g, cfg.b, cfg.opTop, cfg.opBot);
        },
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: validCount > 80 ? 0 : validCount > 20 ? 2 : 3.5,
        pointHoverRadius: 6,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: `rgb(${cfg.r},${cfg.g},${cfg.b})`,
        pointBorderWidth: 2,
        pointHoverBorderWidth: 2.5,
        spanGaps: false,
      }],
    };
  }, [data, timeRange, type, cfg]);

  const stats = useMemo(() => {
    const values = data.map((d) => d[type]).filter(isFinite);
    if (values.length === 0) return null;
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      latest: values[values.length - 1],
    };
  }, [data, type]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      zoom: {
        wheel: { enabled: true, speed: 0.1 },
        pinch: { enabled: true },
        drag:  { enabled: true, backgroundColor: `rgba(${cfg.r},${cfg.g},${cfg.b},0.06)`, borderColor: `rgba(${cfg.r},${cfg.g},${cfg.b},0.4)` },
        mode: 'x',
        onZoomComplete: () => setIsZoomed(true),
      },
      pan: { enabled: true, mode: 'x' },
      tooltip: {
        enabled: true,
        backgroundColor: '#0f172a',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderWidth: 0,
        padding: { x: 14, y: 10 },
        cornerRadius: 10,
        displayColors: false,
        titleFont: { family: 'Inter', size: 12, weight: '600' },
        bodyFont:  { family: 'Inter', size: 13 },
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const d = data[items[0].dataIndex];
            if (!d) return '';
            const date = new Date(d.timestamp * 1000);
            return date.toLocaleString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            });
          },
          label: (ctx) => {
            const v = ctx.parsed.y;
            return isFinite(v) ? `  ${v.toFixed(1)} ${UNITS[type]}` : '  no data';
          },
        },
      },
    },
    scales: {
      x: {
        type: 'category',
        grid: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 11 },
          maxTicksLimit: timeRange === '24h' ? 8 : 12,
          maxRotation: 0,
          autoSkip: true,
        },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(15, 23, 42, 0.05)', drawTicks: false },
        ticks: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 11 },
          padding: 12,
        },
        border: { display: false },
      },
    },
    animation: { duration: 700, easing: 'easeOutQuart' },
  }), [timeRange, type, data, cfg]);

  return (
    <div className="surface overflow-hidden">
      {/* Header */}
      <div className="px-7 pt-6 pb-4 flex items-start justify-between gap-4 border-b border-ink-100">
        <div className="flex items-center gap-3">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: `rgb(${cfg.r},${cfg.g},${cfg.b})`, boxShadow: `0 0 0 4px rgba(${cfg.r},${cfg.g},${cfg.b},0.12)` }}
          />
          <div>
            <h3 className="text-base font-semibold text-ink-900 tracking-tight">{TITLES[type]}</h3>
            <p className="text-xs text-ink-500 mt-0.5">Past {timeRange === '24h' ? '24 hours' : '7 days'} · {data.length} samples</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          {stats && (
            <div className="hidden md:flex items-center gap-5 text-right">
              <Stat label="Min" value={stats.min.toFixed(1)} unit={cfg.unit} />
              <Stat label="Avg" value={stats.avg.toFixed(1)} unit={cfg.unit} />
              <Stat label="Max" value={stats.max.toFixed(1)} unit={cfg.unit} />
            </div>
          )}
          {isZoomed && (
            <button onClick={handleResetZoom} className="btn btn-secondary text-xs">
              Reset zoom
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pb-4 pt-3">
        {loading ? (
          <div className="h-72 flex items-center justify-center">
            <div className="text-sm text-ink-400 animate-breathe">Loading data…</div>
          </div>
        ) : data.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="h-72">
            <Line ref={chartRef} data={chartData} options={options} />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div>
      <div className="eyebrow" style={{ fontSize: 10 }}>{label}</div>
      <div className="text-sm font-semibold text-ink-900 num">
        {value}
        <span className="text-xs text-ink-400 font-normal ml-0.5">{unit}</span>
      </div>
    </div>
  );
}
