import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { addDevice, deleteDevice } from '../firebase/config';

export default function AddDeviceModal({ onClose, devices, onAdded }) {
  const [mode, setMode] = useState('add');
  const [deviceName, setDeviceName] = useState('');
  const [description, setDescription] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const overlayRef = useRef(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const name = deviceName.trim();
    if (!name) {
      setError('Device ID is required.');
      setLoading(false);
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      setError('Device ID can only contain letters, numbers, underscores, and hyphens.');
      setLoading(false);
      return;
    }
    if (devices.some((d) => d.id === name)) {
      setError('A device with this ID already exists.');
      setLoading(false);
      return;
    }

    const desc = description.trim();
    if (!desc) {
      setError('Room / location name is required.');
      setLoading(false);
      return;
    }
    if (desc.length < 3) {
      setError('Room name must be at least 3 characters.');
      setLoading(false);
      return;
    }

    try {
      await addDevice(name, description.trim());
      setSuccess(`Device "${name}" added successfully!`);
      setDeviceName('');
      setDescription('');
      if (onAdded) onAdded();
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError('Failed to add device. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const name = deleteConfirm.trim();
    if (!devices.some((d) => d.id === name)) {
      setError('Device not found.');
      setLoading(false);
      return;
    }

    try {
      await deleteDevice(name);
      setSuccess(`Device "${name}" deleted successfully!`);
      setDeleteConfirm('');
      if (onAdded) onAdded();
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError('Failed to delete device. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-start justify-between" style={{ background: 'linear-gradient(to right, #2563eb, #7c3aed)' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M12 3v1.5m0 13.5V21m-3.75-9H3m15 0h1.5m-16.5 4.5h15m-15 0a2.25 2.25 0 01-4.5 0m-1.5 0h1.5m15 0a2.25 2.25 0 004.5 0m-1.5 0h-1.5M12 21v-9m0 0V9m0 12v-4.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Device Management</h2>
              <p className="text-blue-100 text-xs">Add or remove sensor devices</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors cursor-pointer mt-0.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setMode('add'); setError(''); setSuccess(''); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
              mode === 'add'
                ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            Add Device
          </button>
          <button
            onClick={() => { setMode('delete'); setError(''); setSuccess(''); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
              mode === 'delete'
                ? 'text-red-600 border-red-600 bg-red-50/50'
                : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            Remove Device
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {success && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {mode === 'add' && (
            <form onSubmit={handleAdd} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Device ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. Library_Sensor_01"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">Unique ID for this sensor (letters, numbers, _, -).</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Room / Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Library 2F · Main Reading Room"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <p className="text-xs text-slate-400 mt-1">The display name shown on the dashboard (e.g. room name).</p>
              </div>

              {devices.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                    Existing Devices ({devices.length})
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {devices.map((d) => (
                      <div key={d.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-slate-400 shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                        </svg>
                        <span className="text-xs font-semibold text-slate-700 truncate flex-1">
                          {d.description || d.id}
                        </span>
                        <span className="text-xs text-slate-400 font-mono shrink-0">
                          {d.id}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-white font-semibold text-sm rounded-xl transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                style={{ background: 'linear-gradient(to right, #2563eb, #7c3aed)' }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                    Add Device
                  </>
                )}
              </button>
            </form>
          )}

          {mode === 'delete' && (
            <form onSubmit={handleDelete} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Current Devices</p>
                {devices.length === 0 ? (
                  <p className="text-sm text-slate-400 py-3">No devices registered.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {devices.map((d) => (
                      <div key={d.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-slate-400 shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                        </svg>
                        <span className="text-xs font-semibold text-slate-700 truncate flex-1">
                          {d.description || d.id}
                        </span>
                        <span className="text-xs text-slate-400 font-mono shrink-0">
                          {d.id}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs text-red-700 font-medium">
                  Type the exact device ID below to confirm deletion. This cannot be undone.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Device ID to Delete <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="Type device ID to confirm"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-50 border border-red-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || deleteConfirm.trim() === ''}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                    Remove Device
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  // Render into <body> directly — no DOM nesting, no stacking context issues
  return ReactDOM.createPortal(modalContent, document.body);
}
