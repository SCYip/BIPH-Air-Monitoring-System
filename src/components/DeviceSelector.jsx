import React, { useState, useEffect, useRef } from 'react';

export default function DeviceSelector({ devices, selectedDevice, onDeviceChange, loading }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = devices.find((d) => d.id === selectedDevice);

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-ink-200 rounded-xl shadow-subtle min-w-[220px]">
        <div className="w-3.5 h-3.5 border-2 border-ink-200 border-t-brand-500 rounded-full animate-spin" />
        <span className="text-xs text-ink-400 font-medium">Loading sensors…</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`
          inline-flex items-center justify-between gap-3 px-3.5 py-2 bg-white rounded-xl shadow-subtle
          min-w-[220px] max-w-[340px] text-left transition-all cursor-pointer
          ${open
            ? 'border-2 border-brand-400 ring-4 ring-brand-100'
            : 'border border-ink-200 hover:border-ink-300'
          }
        `}
        style={{ marginLeft: open ? -1 : 0, marginTop: open ? -1 : 0 }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selected ? 'bg-brand-50' : 'bg-ink-50'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={`w-3.5 h-3.5 ${selected ? 'text-brand-600' : 'text-ink-400'}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            {selected ? (
              <>
                <div className="text-xs font-semibold text-ink-900 truncate leading-tight">
                  {selected.description || selected.id}
                </div>
                <div className="code text-ink-400 truncate leading-tight mt-0.5" style={{ fontSize: 10 }}>{selected.id}</div>
              </>
            ) : (
              <div className="text-xs font-medium text-ink-400">Select a sensor…</div>
            )}
          </div>
        </div>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-80 surface-elevated overflow-hidden z-[300] animate-rise rounded-2xl">
          <div className="px-3 pt-3 pb-2">
            <div className="eyebrow" style={{ fontSize: 10 }}>{devices.length} sensors</div>
          </div>
          <div className="px-1.5 pb-1.5 max-h-80 overflow-y-auto">
            {devices.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-sm text-ink-500 font-medium">No sensors found</p>
                <p className="text-xs text-ink-400 mt-1">Add a sensor to get started</p>
              </div>
            ) : (
              devices.map((device, idx) => {
                const isSelected = device.id === selectedDevice;
                return (
                  <button
                    key={device.id}
                    onClick={() => {
                      onDeviceChange(device.id);
                      setOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer
                      ${isSelected ? 'bg-brand-50' : 'hover:bg-ink-50'}
                    `}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-brand-100' : 'bg-ink-100'}`}>
                      <span className={`code font-semibold ${isSelected ? 'text-brand-700' : 'text-ink-500'}`} style={{ fontSize: 10 }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold leading-tight truncate ${isSelected ? 'text-brand-700' : 'text-ink-800'}`}>
                        {device.description || device.id}
                      </div>
                      <div className="code text-ink-400 truncate leading-tight mt-0.5" style={{ fontSize: 10 }}>
                        {device.id}
                      </div>
                    </div>
                    {isSelected && (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-600 shrink-0">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
