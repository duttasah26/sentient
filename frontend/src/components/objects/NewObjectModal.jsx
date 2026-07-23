import { useState } from 'react';
import { AdministrativeToolsXP } from 'react-old-icons';
import { XP, XPWindow, XPButton, XPInput } from '../xp';

const BACKEND = 'http://localhost:8000';

export function NewObjectModal({ onClose, onCreated }) {
  const [name, setName]         = useState('');
  const [backstory, setBackstory] = useState('');
  const [label, setLabel]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const derivedLabel = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 30);

  const save = async () => {
    const finalLabel = label.trim() || derivedLabel;
    if (!name.trim() || !finalLabel) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${BACKEND}/objects/${encodeURIComponent(finalLabel)}/setup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), backstory: backstory.trim() }) });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
    } catch (e) { setError(e.message || 'Failed'); setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <XPWindow title="Register New Object" icon={AdministrativeToolsXP} onClose={onClose} style={{ width: 'min(420px,94vw)' }}>
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'Tahoma, sans-serif', fontSize: 11, color: XP.textDark, marginBottom: 3 }}>Name: <span style={{ color: XP.statusRed }}>*</span></label>
            <XPInput value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="e.g. Mug Maxwell" autoFocus style={{ width: '100%', fontSize: 11 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'Tahoma, sans-serif', fontSize: 11, color: XP.textDark, marginBottom: 3 }}>Identifier: <span style={{ fontStyle: 'italic', color: XP.textMid }}>(auto-derived if blank)</span></label>
            <XPInput value={label} onChange={e => setLabel(e.target.value)} placeholder={derivedLabel || 'e.g. mug_maxwell'} style={{ width: '100%', fontSize: 11 }} />
            {derivedLabel && !label && <div style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: XP.textMid, marginTop: 2 }}>Will use: <strong>{derivedLabel}</strong></div>}
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'Tahoma, sans-serif', fontSize: 11, color: XP.textDark, marginBottom: 3 }}>Backstory: <span style={{ fontStyle: 'italic', color: XP.textMid }}>(blank = random personality)</span></label>
            <XPInput value={backstory} onChange={e => setBackstory(e.target.value)} placeholder="A ceramic mug who has held thousands of coffees…" multiline rows={3} style={{ width: '100%', fontSize: 11 }} />
          </div>
          {error && <div style={{ background: '#fff0f0', border: `1px solid ${XP.statusRed}`, padding: '4px 8px', fontSize: 11, fontFamily: 'Tahoma, sans-serif', color: XP.statusRed }}>{error}</div>}
          <div style={{ borderTop: `1px solid #808080`, marginTop: 4 }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <XPButton onClick={onClose}>Cancel</XPButton>
            <XPButton onClick={save} disabled={!name.trim() || saving} primary>{saving ? 'Creating…' : 'Create Object'}</XPButton>
          </div>
        </div>
      </XPWindow>
    </div>
  );
}
