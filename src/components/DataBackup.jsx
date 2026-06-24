import { useRef, useState } from 'react';

const PREFIX = 'nutri_';
const BACKUP_VERSION = 1;

function exportData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(PREFIX)) {
      try { data[key] = JSON.parse(localStorage.getItem(key)); }
      catch { data[key] = localStorage.getItem(key); }
    }
  }

  const payload = {
    _version: BACKUP_VERSION,
    _exported: new Date().toISOString(),
    _count: Object.keys(data).length,
    data,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);

  const a = document.createElement('a');
  a.href     = url;
  a.download = `nutritrack-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);

  return Object.keys(data).length;
}

function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const payload = JSON.parse(e.target.result);

        if (!payload.data || typeof payload.data !== 'object') {
          reject(new Error('Invalid backup file — missing data block.'));
          return;
        }

        let count = 0;
        for (const [key, value] of Object.entries(payload.data)) {
          if (!key.startsWith(PREFIX)) continue;
          localStorage.setItem(key, JSON.stringify(value));
          count++;
        }

        resolve(count);
      } catch {
        reject(new Error('Could not parse the file. Make sure it is a valid NutriTrack backup.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read the file.'));
    reader.readAsText(file);
  });
}

export default function DataBackup({ onImportDone }) {
  const fileRef  = useRef(null);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', msg }

  function handleExport() {
    try {
      const count = exportData();
      setStatus({ type: 'success', msg: `Exported ${count} keys successfully.` });
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setStatus(null);

    try {
      const count = await importData(file);
      setStatus({ type: 'success', msg: `Imported ${count} keys. Reloading…` });
      setTimeout(() => {
        onImportDone?.();
        window.location.reload();
      }, 1200);
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    }
  }

  return (
    <div className="card">
      <h3>Backup &amp; Restore</h3>
      <p className="subtitle">
        Export all your data to a JSON file to back up or migrate to another device.
        Import restores everything and reloads the app.
      </p>

      <div className="backup-row">
        <button className="btn-primary" onClick={handleExport}>
          ⬇ Export JSON
        </button>
        <button
          className="btn-secondary"
          onClick={() => fileRef.current?.click()}
        >
          ⬆ Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {status && (
        <p
          className="backup-status"
          style={{ color: status.type === 'error' ? 'var(--color-danger)' : 'var(--color-accent)' }}
        >
          {status.msg}
        </p>
      )}

      <p className="field-hint" style={{ marginTop: '0.75rem' }}>
        Exported file contains: profile · food logs · body measurements · water · recents · favourites
      </p>
    </div>
  );
}
