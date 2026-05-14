import React from 'react';

const TIME_RANGES = [
  { id: '24h', label: '24h' },
  { id: '7d',  label: '7d'  },
];

export default function TimeFilter({ selectedRange, onRangeChange }) {
  return (
    <div className="inline-flex p-1 bg-ink-100 rounded-xl border border-ink-200">
      {TIME_RANGES.map((range) => {
        const isActive = selectedRange === range.id;
        return (
          <button
            key={range.id}
            onClick={() => onRangeChange(range.id)}
            className={`
              px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer
              ${isActive
                ? 'bg-white text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-800'
              }
            `}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
