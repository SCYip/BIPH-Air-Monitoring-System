import React from 'react';

const STATUS_CONFIG = {
  online:  { dot: '#10b981', label: 'Online',     bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', animate: true  },
  loading: { dot: '#3b82f6', label: 'Connecting', bg: 'bg-brand-50',   text: 'text-brand-700',   border: 'border-brand-200',   animate: true  },
  offline: { dot: '#94a3b8', label: 'Offline',    bg: 'bg-ink-50',     text: 'text-ink-600',     border: 'border-ink-200',     animate: false },
  error:   { dot: '#ef4444', label: 'Error',      bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     animate: false },
};

export default function StatusBadge({ status, message }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className="relative inline-flex" style={{ width: 7, height: 7 }}>
        {cfg.animate && (
          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: cfg.dot, opacity: 0.5 }} />
        )}
        <span className="relative inline-flex rounded-full" style={{ width: 7, height: 7, background: cfg.dot }} />
      </span>
      <span className="text-xs font-medium">{message || cfg.label}</span>
    </div>
  );
}
