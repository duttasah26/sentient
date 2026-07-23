import { useState } from 'react';
import { WindowsXPConfiguration } from 'react-old-icons';
import { XP, XPWindow, XPButton, XPInput } from '../xp';

const BACKEND = 'http://localhost:8000';

export function EditObjectModal({ object, onClose, onSaved }) {
  const [name,      setName]      = useState(object.name ?? '');
  const [backstory, setBackstory] = useState(object.backstory ?? '');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${BACKEND}/objects/${encodeURIComponent(object.yolo_label)}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), backstory: backstory.trim(), voice_id: object.voice_id }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved({ ...object, name: name.trim(), backstory: backstory.trim() });
    } catch (e) { setError(e.message || 'Failed to save'); setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <XPWindow title={`Edit Object — ${object.name}`} icon={WindowsXPConfiguration} onClose={onClose} style={{ width: 'min(460px,94vw)' }}>
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'Tahoma, sans-serif', fontSize: 11, color: XP.textDark, marginBottom: 3 }}>Name: <span style={{ color: XP.statusRed }}>*</span></label>
            <XPInput value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} autoFocus style={{ width: '100%', fontSize: 11 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'Tahoma, sans-serif', fontSize: 11, color: XP.textDark, marginBottom: 3 }}>Backstory:</label>
            <XPInput value={backstory} onChange={e => setBackstory(e.target.value)} placeholder="A ceramic mug who has held thousands of coffees…" multiline rows={6} style={{ width: '100%', fontSize: 11 }} />
            <div style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: XP.textMid, marginTop: 2 }}>
              This is the personality and history that defines how this object speaks.
            </div>
          </div>
          {error && <div style={{ background: '#fff0f0', border: `1px solid ${XP.statusRed}`, padding: '4px 8px', fontSize: 11, fontFamily: 'Tahoma, sans-serif', color: XP.statusRed }}>{error}</div>}
          <div style={{ borderTop: `1px solid #808080`, marginTop: 4 }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <XPButton onClick={onClose}>Cancel</XPButton>
            <XPButton onClick={save} disabled={!name.trim() || saving} primary>{saving ? 'Saving…' : '✓ Save Changes'}</XPButton>
          </div>
        </div>
      </XPWindow>
    </div>
  );
}
