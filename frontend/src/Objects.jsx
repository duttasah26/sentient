import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useConversation } from './hooks/useConversation';
import {
  WindowsXPMyComputer,
  WindowsXPMyDocuments,
  WindowsXPFolderOpen,
  WindowsXPCamera,
  WindowsXPUsers,
  WindowsXPMail,
  WindowsXPLogOff,
  WindowsXPDiskDefragmenter,
  WindowsXPConfiguration,
  AdministrativeToolsXP,
  MSNMessenger,
} from 'react-old-icons';

const BACKEND = 'http://localhost:8000';

const VOICE_NAMES = {
  'EXAVITQu4vr4xnSDxMaL': 'Bella',
  'ErXwobaYiN019PkySvjV': 'Antoni',
  'MF3mGyEYCl7XYWbV9V6O': 'Elli',
  'TxGEqnHWrfWFTfGW9XjX': 'Josh',
  'VR6AewLTigWG4xSOukaG': 'Arnold',
};

const XP = {
  titleBarGrad: 'linear-gradient(180deg,#1f8dd6 0%,#2563b0 4%,#1957a5 8%,#1a5ca8 50%,#1855a3 92%,#1650a0 96%,#1048a0 100%)',
  titleBarText: '#ffffff',
  titleBarShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
  windowBorder: '#0055e5',
  windowBg: '#ece9d8',
  windowInner: '#ffffff',
  btnBg: 'linear-gradient(180deg,#f8f8f8 0%,#e4e0d0 100%)',
  btnBorder: '#7f9db9',
  btnActive: 'linear-gradient(180deg,#d4cebf 0%,#e8e4d4 100%)',
  btnHoverBorder: '#316ac5',
  taskbarBg: 'linear-gradient(180deg,#2b7dd8 0%,#1e5fb4 50%,#1851a3 100%)',
  textDark: '#000000',
  textMid: '#4a4848',
  fieldBg: '#ffffff',
  fieldBorder: '#7f9db9',
  fieldBorderFocus: '#316ac5',
  statusRed: '#cc0000',
  statusGreen: '#008000',
  statusYellow: '#ccaa00',
  statusGray: '#808080',
  bgPattern: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='2' height='2' fill='%23d4d0c8' opacity='0.5'/%3E%3C/svg%3E")`,
};

function OldIcon({ Icon, size = 16, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1, ...style }}>
      <Icon size={size} />
    </span>
  );
}

function XPWindow({ title, icon, children, style, onClose }) {
  return (
    <div style={{ border: `2px solid ${XP.windowBorder}`, borderRadius: '8px 8px 4px 4px', boxShadow: '3px 3px 8px rgba(0,0,0,0.5)', background: XP.windowBg, display: 'flex', flexDirection: 'column', overflow: 'hidden', ...style }}>
      <div style={{ background: XP.titleBarGrad, boxShadow: XP.titleBarShadow, padding: '3px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 28, flexShrink: 0, userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {icon && <OldIcon Icon={icon} size={14} />}
          <span style={{ color: XP.titleBarText, fontSize: 12, fontWeight: 700, fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', textShadow: '1px 1px 2px rgba(0,0,0,0.5)', letterSpacing: '0.01em' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          <XPTitleBtn label="─" color="linear-gradient(180deg,#f8c860 0%,#e09820 100%)" hov="#ffd060" />
          {onClose && <XPTitleBtn label="✕" color="linear-gradient(180deg,#e84040 0%,#b81020 100%)" hov="#ff6060" onClick={onClose} />}
        </div>
      </div>
      {children}
    </div>
  );
}

function XPTitleBtn({ label, color, hov, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ width: 21, height: 19, background: hovered ? hov : color, border: '1px solid rgba(0,0,0,0.4)', borderRadius: 3, color: '#fff', fontSize: 9, fontWeight: 900, fontFamily: 'Tahoma, sans-serif', cursor: onClick ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', textShadow: '0 1px 1px rgba(0,0,0,0.6)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)', padding: 0 }}
    >{label}</button>
  );
}

function XPButton({ children, onClick, disabled, style, primary }) {
  const [hov, setHov] = useState(false);
  const [act, setAct] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setAct(false); }} onMouseDown={() => setAct(true)} onMouseUp={() => setAct(false)}
      style={{ background: act ? XP.btnActive : primary ? 'linear-gradient(180deg,#5ba8f8 0%,#2060d0 50%,#1850c0 100%)' : hov ? 'linear-gradient(180deg,#fff 0%,#e8e4d8 100%)' : XP.btnBg, border: hov || primary ? `1px solid ${XP.btnHoverBorder}` : `1px solid ${XP.btnBorder}`, borderRadius: 3, color: primary ? '#fff' : XP.textDark, fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', fontSize: 11, fontWeight: primary ? 700 : 400, padding: '3px 12px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, boxShadow: act ? 'inset 1px 1px 2px rgba(0,0,0,0.3)' : 'inset 0 1px 0 rgba(255,255,255,0.7), 1px 1px 0 rgba(0,0,0,0.15)', minWidth: 75, display: 'flex', alignItems: 'center', gap: 4, ...style }}
    >{children}</button>
  );
}

function XPInput({ value, onChange, onKeyDown, placeholder, disabled, autoFocus, multiline, rows }) {
  const base = { background: XP.fieldBg, border: `2px inset ${XP.fieldBorder}`, borderRadius: 0, padding: '3px 6px', fontSize: 11, fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', color: XP.textDark, outline: 'none', boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.2)', width: '100%', boxSizing: 'border-box' };
  if (multiline) return <textarea value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} disabled={disabled} rows={rows || 3} style={{ ...base, resize: 'vertical', lineHeight: 1.5 }} />;
  return <input value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} disabled={disabled} autoFocus={autoFocus} style={base} />;
}

function XPSunken({ children, style }) {
  return <div style={{ border: `2px inset ${XP.fieldBorder}`, boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.2)', background: XP.windowInner, ...style }}>{children}</div>;
}

// ── New Object modal ──────────────────────────────────────────────────────────
function NewObjectModal({ onClose, onCreated }) {
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
            <XPInput value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="e.g. Mug Maxwell" autoFocus />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'Tahoma, sans-serif', fontSize: 11, color: XP.textDark, marginBottom: 3 }}>Identifier: <span style={{ fontStyle: 'italic', color: XP.textMid }}>(auto-derived if blank)</span></label>
            <XPInput value={label} onChange={e => setLabel(e.target.value)} placeholder={derivedLabel || 'e.g. mug_maxwell'} />
            {derivedLabel && !label && <div style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: XP.textMid, marginTop: 2 }}>Will use: <strong>{derivedLabel}</strong></div>}
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'Tahoma, sans-serif', fontSize: 11, color: XP.textDark, marginBottom: 3 }}>Backstory: <span style={{ fontStyle: 'italic', color: XP.textMid }}>(blank = random personality)</span></label>
            <XPInput value={backstory} onChange={e => setBackstory(e.target.value)} placeholder="A ceramic mug who has held thousands of coffees…" multiline rows={3} />
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

// ── Scan modal ────────────────────────────────────────────────────────────────
function ScanModal({ object, onClose, onSaved }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [step, setStep]           = useState('camera');
  const [blob, setBlob]           = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      }).catch(() => setError('Camera access denied'));
    return () => { active = false; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const snap = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(b => { setBlob(b); setPreviewUrl(URL.createObjectURL(b)); setStep('preview'); streamRef.current?.getTracks().forEach(t => t.stop()); }, 'image/jpeg', 0.85);
  }, []);

  const retake = () => {
    URL.revokeObjectURL(previewUrl);
    setBlob(null); setPreviewUrl(null); setStep('camera');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then(stream => { streamRef.current = stream; if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); } });
  };

  const save = async () => {
    if (!blob) return;
    setSaving(true); setError(null);
    try {
      const form = new FormData();
      form.append('file', blob, 'fingerprint.jpg');
      const res = await fetch(`${BACKEND}/objects/${encodeURIComponent(object.yolo_label)}/fingerprint`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onSaved(data.labels);
    } catch (e) { setError(e.message || 'Failed'); setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <XPWindow title={`Scan Object — ${object.name}`} icon={WindowsXPCamera} onClose={onClose} style={{ width: 'min(480px,94vw)' }}>
        <div style={{ background: '#d4d0c8', borderBottom: '1px solid #808080', padding: '3px 6px', fontSize: 10, fontFamily: 'Tahoma, sans-serif', color: XP.textMid, display: 'flex', alignItems: 'center', gap: 5 }}>
          <OldIcon Icon={WindowsXPCamera} size={12} />
          {step === 'camera' ? 'Centre the object in frame, then click Snap' : '✅ Confirm — this photo will be saved as the visual fingerprint'}
        </div>
        <XPSunken style={{ margin: 8, aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: '#000' }}>
          {step === 'camera' && <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
          {step === 'preview' && previewUrl && <img src={previewUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
          {error && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6060', fontFamily: 'Tahoma, sans-serif', fontSize: 11, textAlign: 'center', padding: 16 }}>{error}</div>}
          {step === 'camera' && !error && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}><div style={{ width: '40%', aspectRatio: '1', border: '1px dashed rgba(255,255,100,0.7)', borderRadius: 2 }}/></div>}
          {step === 'preview' && <div style={{ position: 'absolute', top: 6, left: 6, background: '#008000', color: '#fff', fontFamily: 'Tahoma, sans-serif', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 2 }}>✓ CAPTURED</div>}
        </XPSunken>
        <div style={{ background: '#d4d0c8', borderTop: '1px solid #fff', padding: '4px 8px 8px', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          {step === 'camera' ? (
            <><XPButton onClick={onClose}>Cancel</XPButton><XPButton onClick={snap} disabled={!!error} primary><OldIcon Icon={WindowsXPCamera} size={11} /> Snap</XPButton></>
          ) : (
            <><XPButton onClick={retake}>↩ Retake</XPButton><XPButton onClick={save} disabled={saving} primary>{saving ? 'Saving…' : '✓ Save Fingerprint'}</XPButton></>
          )}
        </div>
      </XPWindow>
    </div>
  );
}

// ── Conversation modal ────────────────────────────────────────────────────────
function ConversationModal({ object, onClose }) {
  const { connect, disconnect, send, messages, status, objectMeta } = useConversation(object.yolo_label);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  useEffect(() => { connect(); return () => disconnect(); }, [object.yolo_label]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  const handleSend = () => { const t = input.trim(); if (!t || status === 'thinking' || status === 'speaking') return; send(t); setInput(''); };
  const isReady = status === 'ready' || status === 'thinking' || status === 'speaking';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <XPWindow title={`${objectMeta?.name ?? object.name} — Sentient Chat`} icon={MSNMessenger} onClose={onClose} style={{ width: 'min(460px,92vw)', height: 'min(560px,90vh)', display: 'flex', flexDirection: 'column' }}>
        {/* Info */}
        <div style={{ padding: '6px 10px', background: '#d4d0c8', borderBottom: '1px solid #808080', borderTop: '1px solid #fff' }}>
          <div style={{ background: XP.windowBg, border: '1px solid #808080', borderRight: '1px solid #fff', borderBottom: '1px solid #fff', padding: '6px 8px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <OldIcon Icon={WindowsXPUsers} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Tahoma, sans-serif', color: XP.textDark }}>{objectMeta?.name ?? object.name}</div>
              <div style={{ fontSize: 10, fontFamily: 'Tahoma, sans-serif', color: XP.textMid, marginTop: 1 }}>Type: {object.yolo_label} · Voice: {VOICE_NAMES[object.voice_id] ?? '—'}</div>
              {object.backstory && <div style={{ fontSize: 10, fontFamily: 'Tahoma, sans-serif', color: XP.textMid, marginTop: 4, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: 'italic' }}>{object.backstory}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: { idle: XP.statusGray, connecting: XP.statusYellow, ready: XP.statusGreen, thinking: XP.statusYellow, speaking: '#0000cc', error: XP.statusRed }[status] ?? XP.statusGray, marginRight: 5, display: 'inline-block' }}/>
            <span style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 11, color: XP.textDark }}>{{ idle: 'Offline', connecting: 'Connecting...', ready: 'Ready', thinking: 'Thinking...', speaking: 'Speaking...', error: 'Error' }[status] ?? 'Offline'}</span>
          </div>
        </div>
        {/* Messages */}
        <XPSunken style={{ flex: 1, margin: '6px 8px', padding: '6px 8px', fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
          {messages.length === 0 && (
            <div style={{ color: XP.textMid, textAlign: 'center', paddingTop: 28, lineHeight: 2 }}>
              <OldIcon Icon={WindowsXPLogOff} size={28} style={{ margin: '0 auto 8px' }} /><br />
              Entity dormant.<br /><span style={{ fontSize: 10 }}>Say something to wake it up.</span>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
              <div style={{ fontSize: 9, color: m.role === 'user' ? '#000080' : '#800000', fontWeight: 700, marginBottom: 2, paddingLeft: 2 }}>{m.role === 'user' ? 'You' : (objectMeta?.name ?? object.yolo_label)}</div>
              <div style={{ background: m.role === 'user' ? '#dce8f8' : '#fffde7', border: m.role === 'user' ? '1px solid #7f9db9' : '1px solid #c8b400', borderRadius: m.role === 'user' ? '8px 8px 2px 8px' : '8px 8px 8px 2px', padding: '5px 9px', fontSize: 11, lineHeight: 1.55, color: XP.textDark, fontStyle: m.role === 'assistant' ? 'italic' : 'normal', boxShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>{m.text}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </XPSunken>
        {/* Input */}
        <div style={{ padding: '4px 8px 8px', borderTop: '1px solid #808080', background: '#d4d0c8', display: 'flex', gap: 4, alignItems: 'stretch' }}>
          <XPInput value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder={isReady ? 'Type a message…' : 'Connecting...'} disabled={!isReady} />
          <XPButton onClick={handleSend} disabled={!input.trim() || !isReady} primary style={{ minWidth: 60, flexShrink: 0 }}>Send</XPButton>
        </div>
      </XPWindow>
    </div>
  );
}

// ── Edit object modal ─────────────────────────────────────────────────────────
function EditObjectModal({ object, onClose, onSaved }) {
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
            <XPInput value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} autoFocus />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'Tahoma, sans-serif', fontSize: 11, color: XP.textDark, marginBottom: 3 }}>Backstory:</label>
            <XPInput value={backstory} onChange={e => setBackstory(e.target.value)} placeholder="A ceramic mug who has held thousands of coffees…" multiline rows={6} />
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

// ── Object row ────────────────────────────────────────────────────────────────
function ObjectRow({ obj, idx, isScanned, onConverse, onScan, onEdit }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'grid', gridTemplateColumns: '16px 1fr 90px 70px 80px 160px', alignItems: 'center', gap: 0, padding: '6px 8px', background: hov ? '#dce8f8' : idx % 2 === 0 ? XP.windowInner : '#f5f3ee', borderBottom: '1px solid #d4d0c8', cursor: 'pointer', transition: 'background 100ms ease' }}
      onClick={onConverse}>
      <OldIcon Icon={isScanned ? WindowsXPConfiguration : WindowsXPMyDocuments} size={12} />
      <div style={{ minWidth: 0, paddingRight: 8 }}>
        <div style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 12, fontWeight: 700, color: XP.textDark }}>{obj.name}</div>
        <div style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: XP.textMid, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{obj.backstory?.slice(0, 80) ?? 'No backstory set'}</div>
      </div>
      <span style={{ fontFamily: 'Courier New, monospace', fontSize: 10, color: XP.textMid }}>{obj.yolo_label}</span>
      <span style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: XP.textMid }}>{VOICE_NAMES[obj.voice_id] ?? '—'}</span>
      <span style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 10, fontWeight: 700, color: isScanned ? XP.statusGreen : XP.statusGray }}>
        {isScanned ? '✓ Scanned' : '⚠ Not scanned'}
      </span>
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
        <XPButton onClick={onEdit} style={{ minWidth: 'auto', padding: '2px 8px', fontSize: 10, gap: 3 }}>
          <OldIcon Icon={WindowsXPDiskDefragmenter} size={11} />Edit
        </XPButton>
        <XPButton onClick={onScan} style={{ minWidth: 'auto', padding: '2px 8px', fontSize: 10, gap: 3 }}>
          <OldIcon Icon={WindowsXPCamera} size={11} />{isScanned ? 'Re-scan' : 'Scan'}
        </XPButton>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Objects() {
  const [objects,   setObjects]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [scanning,  setScanning]  = useState(null);
  const [editing,   setEditing]   = useState(null);
  const [scanned,   setScanned]   = useState({});
  const [addingNew, setAddingNew] = useState(false);

  const loadObjects = useCallback(() => {
    setLoading(true);
    fetch(`${BACKEND}/objects`)
      .then(r => r.json())
      .then(d => { const objs = d.objects ?? []; setObjects(objs); const pre = {}; objs.forEach(o => { if (o.vision_labels?.length) pre[o.yolo_label] = true; }); setScanned(pre); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadObjects(); }, [loadObjects]);

  return (
    <div style={{ minHeight: '100dvh', background: `${XP.bgPattern}, linear-gradient(180deg,#1f8dd6 0%,#3a9de6 8%,#58b0f0 12%,#3a9de6 100%)`, backgroundSize: '4px 4px, 100% 100%', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>

      {/* Taskbar */}
      <div style={{ background: XP.taskbarBg, padding: '2px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 32, flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'linear-gradient(180deg,#60d840 0%,#30a820 50%,#20881a 100%)', border: '1px solid #187010', borderRadius: 12, padding: '2px 12px 2px 8px', display: 'flex', alignItems: 'center', gap: 5, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)', cursor: 'pointer' }}>
            <OldIcon Icon={WindowsXPMyComputer} size={14} />
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, fontFamily: 'Tahoma, sans-serif', fontStyle: 'italic', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>start</span>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.3)', borderRadius: 2, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <OldIcon Icon={WindowsXPMyDocuments} size={12} />
            <span style={{ color: '#fff', fontSize: 11, fontFamily: 'Tahoma, sans-serif', textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}>Object Library</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/" style={{ color: '#fff', fontSize: 11, fontFamily: 'Tahoma, sans-serif', textDecoration: 'none', textShadow: '1px 1px 1px rgba(0,0,0,0.5)', opacity: 0.9 }}>← Camera</Link>
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, padding: '1px 8px', color: '#fff', fontSize: 11, fontFamily: 'Tahoma, sans-serif', textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Desktop */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, paddingTop: 16 }}>
        <XPWindow title="Sentient — Object Library (BearHacks 2026)" icon={WindowsXPFolderOpen} style={{ width: '100%', maxWidth: 780 }}>
          {/* Toolbar */}
          <div style={{ background: '#d4d0c8', borderBottom: '1px solid #808080', padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <XPButton onClick={() => setAddingNew(true)} primary style={{ minWidth: 'auto', padding: '3px 10px' }}>
              <OldIcon Icon={AdministrativeToolsXP} size={12} /> Register Object
            </XPButton>
            <div style={{ width: 1, height: 18, background: '#808080', margin: '0 2px' }} />
            <XPButton onClick={loadObjects} style={{ minWidth: 'auto', padding: '3px 10px' }}>↻ Refresh</XPButton>
            <span style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: XP.textMid, marginLeft: 8 }}>
              {loading ? 'Loading…' : `${objects.length} object${objects.length !== 1 ? 's' : ''} in memory — click a row to converse`}
            </span>
          </div>

          {/* Column headers */}
          <div style={{ background: '#d4d0c8', borderBottom: '1px solid #808080', display: 'grid', gridTemplateColumns: '16px 1fr 90px 70px 80px 160px', gap: 0, padding: '2px 8px', fontFamily: 'Tahoma, sans-serif', fontSize: 11, fontWeight: 700, color: XP.textDark }}>
            <span/><span>Name / Backstory</span><span>Identifier</span><span>Voice</span><span>Fingerprint</span><span>Actions</span>
          </div>

          {/* Content */}
          <XPSunken style={{ margin: 6, minHeight: 240, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
            {loading ? (
              [1,2,3,4].map(i => <div key={i} style={{ height: 52, background: 'linear-gradient(90deg,#e8e4d8 25%,#f0ede4 50%,#e8e4d8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite', borderBottom: '1px solid #d4d0c8' }} />)
            ) : objects.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12, color: XP.textMid, fontFamily: 'Tahoma, sans-serif', textAlign: 'center' }}>
                <OldIcon Icon={WindowsXPMail} size={48} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: XP.textDark, marginBottom: 4 }}>No objects registered yet</div>
                  <div style={{ fontSize: 11, maxWidth: 280 }}>Start the camera and scan some objects, or register one manually using the toolbar above.</div>
                </div>
                <XPButton onClick={() => setAddingNew(true)} primary>
                  <OldIcon Icon={AdministrativeToolsXP} size={12} /> Register First Object
                </XPButton>
              </div>
            ) : (
              objects.map((obj, idx) => (
                <ObjectRow key={obj.yolo_label} obj={obj} idx={idx} isScanned={!!scanned[obj.yolo_label]} onConverse={() => setSelected(obj)} onScan={() => setScanning(obj)} onEdit={() => setEditing(obj)} />
              ))
            )}
          </XPSunken>

          {/* Status bar */}
          <div style={{ background: '#d4d0c8', borderTop: '1px solid #fff', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, fontFamily: 'Tahoma, sans-serif', color: XP.textMid }}>
            <span style={{ borderRight: '1px solid #808080', paddingRight: 8, marginRight: 4 }}>{objects.length} object{objects.length !== 1 ? 's' : ''}</span>
            <span style={{ color: XP.statusGreen }}>{Object.keys(scanned).length} fingerprinted</span>
            <span style={{ marginLeft: 'auto' }}>Sentient v2.0 · BearHacks 2026</span>
          </div>
        </XPWindow>
      </main>

      {selected   && <ConversationModal object={selected} onClose={() => setSelected(null)} />}
      {addingNew  && <NewObjectModal onClose={() => setAddingNew(false)} onCreated={() => { setAddingNew(false); loadObjects(); }} />}
      {scanning   && <ScanModal object={scanning} onClose={() => setScanning(null)} onSaved={labels => { setScanned(s => ({ ...s, [scanning.yolo_label]: true })); setObjects(prev => prev.map(o => o.yolo_label === scanning.yolo_label ? { ...o, vision_labels: labels } : o)); setScanning(null); }} />}
      {editing    && <EditObjectModal object={editing} onClose={() => setEditing(null)} onSaved={updated => { setObjects(prev => prev.map(o => o.yolo_label === updated.yolo_label ? updated : o)); setEditing(null); }} />}
    </div>
  );
}