import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useConversation } from './hooks/useConversation';

const BACKEND = 'http://localhost:8000';

const VOICE_NAMES = {
  'EXAVITQu4vr4xnSDxMaL': 'Bella',
  'ErXwobaYiN019PkySvjV': 'Antoni',
  'MF3mGyEYCl7XYWbV9V6O': 'Elli',
  'TxGEqnHWrfWFTfGW9XjX': 'Josh',
  'VR6AewLTigWG4xSOukaG': 'Arnold',
};

// ── New object creation modal ─────────────────────────────────────────────────
function NewObjectModal({ onClose, onCreated }) {
  const [name,      setName]      = useState('');
  const [backstory, setBackstory] = useState('');
  const [label,     setLabel]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);

  const derivedLabel = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 30);

  const save = async () => {
    const finalLabel = (label.trim() || derivedLabel);
    if (!name.trim() || !finalLabel) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${BACKEND}/objects/${encodeURIComponent(finalLabel)}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), backstory: backstory.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
    } catch (e) {
      setError(e.message || 'Failed to create object');
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', background: 'var(--color-surface-offset)',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text)',
    fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, backdropFilter: 'blur(6px)',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: 'min(440px, 94vw)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-faint)', letterSpacing: '0.12em' }}>
              ENTITY / CREATE NEW
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-primary)', marginTop: 2 }}>
              New Object
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-faint)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
              NAME *
            </label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mug Maxwell"
              style={inputStyle} autoFocus />
          </div>

          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
              IDENTIFIER (auto-derived if blank)
            </label>
            <input value={label} onChange={e => setLabel(e.target.value)}
              placeholder={derivedLabel || 'e.g. mug_maxwell'}
              style={inputStyle} />
            {derivedLabel && !label && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-faint)', marginTop: 4 }}>
                will use: {derivedLabel}
              </div>
            )}
          </div>

          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
              BACKSTORY (optional — random personality if blank)
            </label>
            <textarea value={backstory} onChange={e => setBackstory(e.target.value)}
              placeholder="A ceramic mug who has held thousands of coffees…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
          </div>

          {error && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-error)', padding: 'var(--space-3)', background: 'rgba(232,90,90,0.08)', borderRadius: 'var(--radius-sm)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button onClick={onClose} style={{
              flex: 1, padding: 'var(--space-3)', background: 'none',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11,
            }}>Cancel</button>
            <button onClick={save} disabled={!name.trim() || saving} style={{
              flex: 2, padding: 'var(--space-3)',
              background: 'var(--color-primary)', border: 'none',
              borderRadius: 'var(--radius-md)', color: '#111',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13,
              opacity: (!name.trim() || saving) ? 0.4 : 1,
            }}>{saving ? 'Creating…' : '＋ Create Object'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inline camera scan modal ──────────────────────────────────────────────────
function ScanModal({ object, onClose, onSaved }) {
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const [step, setStep]       = useState('camera'); // 'camera' | 'preview'
  const [blob, setBlob]       = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    }).then(stream => {
      if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    }).catch(() => setError('Camera access denied'));

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const snap = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(b => {
      setBlob(b);
      setPreviewUrl(URL.createObjectURL(b));
      setStep('preview');
      streamRef.current?.getTracks().forEach(t => t.stop());
    }, 'image/jpeg', 0.85);
  }, []);

  const retake = () => {
    URL.revokeObjectURL(previewUrl);
    setBlob(null); setPreviewUrl(null); setStep('camera');
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    }).then(stream => {
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    });
  };

  const save = async () => {
    if (!blob) return;
    setSaving(true); setError(null);
    try {
      const form = new FormData();
      form.append('file', blob, 'fingerprint.jpg');
      const res = await fetch(`${BACKEND}/objects/${encodeURIComponent(object.yolo_label)}/fingerprint`, {
        method: 'POST', body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onSaved(data.labels);
    } catch (e) {
      setError(e.message || 'Failed to save fingerprint');
      setSaving(false);
    }
  };

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, backdropFilter: 'blur(6px)',
  };

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: 'min(480px, 94vw)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-faint)', letterSpacing: '0.12em' }}>
              SCAN / {object.yolo_label.toUpperCase()}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-primary)', marginTop: 2 }}>
              {object.name}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-faint)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {/* Camera / Preview */}
        <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9' }}>
          {step === 'camera' && (
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
          )}
          {step === 'preview' && previewUrl && (
            <img src={previewUrl} alt="preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
          )}
          {error && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-error)', fontFamily: 'var(--font-mono)', fontSize: 11, textAlign: 'center', padding: 16,
            }}>{error}</div>
          )}
          {/* Crosshair guide */}
          {step === 'camera' && !error && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                width: '40%', aspectRatio: '1',
                border: '1px dashed rgba(232,136,58,0.5)',
                borderRadius: 4,
              }}/>
            </div>
          )}
        </div>

        {/* Instruction text */}
        <div style={{ padding: 'var(--space-3) var(--space-5)', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-faint)', letterSpacing: '0.1em' }}>
          {step === 'camera'
            ? '// CENTRE THE OBJECT IN THE FRAME — THEN SNAP'
            : '// CONFIRM THIS PHOTO WILL BE USED AS THE FINGERPRINT'}
        </div>

        {/* Actions */}
        <div style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', gap: 'var(--space-3)' }}>
          {step === 'camera' ? (
            <>
              <button onClick={onClose} style={{
                flex: 1, padding: 'var(--space-3)', background: 'none',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11,
              }}>Cancel</button>
              <button onClick={snap} disabled={!!error} style={{
                flex: 2, padding: 'var(--space-3)',
                background: 'var(--color-primary)', border: 'none',
                borderRadius: 'var(--radius-md)', color: '#111',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13,
                opacity: error ? 0.4 : 1,
              }}>⊙ Snap</button>
            </>
          ) : (
            <>
              <button onClick={retake} style={{
                flex: 1, padding: 'var(--space-3)', background: 'none',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11,
              }}>↩ Retake</button>
              <button onClick={save} disabled={saving} style={{
                flex: 2, padding: 'var(--space-3)',
                background: 'var(--color-primary)', border: 'none',
                borderRadius: 'var(--radius-md)', color: '#111',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13,
                opacity: saving ? 0.6 : 1,
              }}>{saving ? 'Saving…' : '✓ Save Fingerprint'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Conversation modal ────────────────────────────────────────────────────────
function ConversationModal({ object, onClose }) {
  const { connect, disconnect, send, messages, status, objectMeta } =
    useConversation(object.yolo_label);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { connect(); return () => disconnect(); }, [object.yolo_label]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = () => {
    const t = input.trim();
    if (!t || status === 'thinking' || status === 'speaking') return;
    send(t); setInput('');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, backdropFilter: 'blur(4px)',
      animation: 'fade-up 200ms ease',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: 'min(480px, 92vw)', height: 'min(600px,90vh)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-faint)', letterSpacing: '0.12em', marginBottom: 4 }}>
                {object.yolo_label.toUpperCase()} · {VOICE_NAMES[object.voice_id] ?? 'voice'}
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-primary)', fontWeight: 700 }}>
                {objectMeta?.name ?? object.name}
              </h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-faint)', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8, lineHeight: 1.6, fontStyle: 'italic' }}>
            {object.backstory?.slice(0, 120)}…
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4) var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--color-text-faint)', fontFamily: 'var(--font-mono)', fontSize: 10, paddingTop: 'var(--space-6)', letterSpacing: '0.06em', lineHeight: 2 }}>
              // {status === 'connecting' ? 'ESTABLISHING LINK…' : 'AWAITING INPUT'}
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: m.role === 'user'
                  ? 'var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)'
                  : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px',
                background: m.role === 'user' ? 'var(--color-surface-offset)' : 'var(--color-primary-dim)',
                border: m.role === 'user' ? '1px solid var(--color-border)' : '1px solid rgba(232,136,58,0.25)',
                fontSize: 'var(--text-sm)', lineHeight: 1.6,
                fontFamily: m.role === 'assistant' ? 'var(--font-display)' : 'var(--font-body)',
                fontStyle: m.role === 'assistant' ? 'italic' : 'normal',
                color: m.role === 'user' ? 'var(--color-text-muted)' : 'var(--color-text)',
              }}>{m.text}</div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>

        <div style={{ padding: 'var(--space-4) var(--space-5)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 'var(--space-2)' }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="speak to it…" disabled={status !== 'ready'}
            style={{
              flex: 1, background: 'var(--color-surface-offset)',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text)',
              fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', outline: 'none',
            }}/>
          <button onClick={handleSend}
            disabled={!input.trim() || status === 'thinking' || status === 'speaking'}
            style={{
              background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)', color: '#111', fontWeight: 700,
              cursor: 'pointer', opacity: (!input.trim() || status === 'thinking' || status === 'speaking') ? 0.4 : 1,
            }}>→</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Objects() {
  const [objects,    setObjects]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [scanning,   setScanning]   = useState(null);
  const [scanned,    setScanned]    = useState({});
  const [addingNew,  setAddingNew]  = useState(false);

  const loadObjects = useCallback(() => {
    setLoading(true);
    fetch(`${BACKEND}/objects`)
      .then(r => r.json())
      .then(d => {
        const objs = d.objects ?? [];
        setObjects(objs);
        const pre = {};
        objs.forEach(o => { if (o.vision_labels?.length) pre[o.yolo_label] = true; });
        setScanned(pre);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadObjects(); }, []);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-6)',
        borderBottom: '1px solid var(--color-divider)',
        background: 'var(--color-surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--color-primary)' }}>
            Sentient
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-faint)', letterSpacing: '0.12em' }}>
            / OBJECT LIBRARY
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button onClick={() => setAddingNew(true)} style={{
            background: 'rgba(232,136,58,0.12)',
            border: '1px solid rgba(232,136,58,0.35)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 10px',
            color: 'var(--color-primary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
          }}>＋ NEW OBJECT</button>
          <Link to="/" style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-faint)',
            textDecoration: 'none', letterSpacing: '0.08em', borderBottom: '1px solid var(--color-border)', paddingBottom: 2,
          }}>← CAMERA</Link>
        </div>
      </header>

      <main style={{ flex: 1, padding: 'var(--space-6)', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{
                height: 88, borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(90deg,var(--color-surface-offset) 25%,#2a2926 50%,var(--color-surface-offset) 75%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite',
              }}/>
            ))}
          </div>
        ) : objects.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 'var(--space-16)', color: 'var(--color-text-faint)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em' }}>// NO ENTITIES IN MEMORY</p>
            <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>Start the camera and scan some objects first.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-faint)', letterSpacing: '0.12em', marginBottom: 'var(--space-2)' }}>
              {objects.length} ENTITIES CATALOGUED — SCAN EACH TO ENABLE VISUAL RECOGNITION
            </p>
            {objects.map(obj => (
              <div key={obj.yolo_label} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                padding: 'var(--space-4) var(--space-5)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                transition: 'border-color var(--transition-interactive), background var(--transition-interactive)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-surface-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface)'; }}>
                {/* Pulse dot */}
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: scanned[obj.yolo_label] ? '#4ade80' : 'var(--color-primary)',
                  animation: 'breathe 2.5s ease infinite',
                  boxShadow: scanned[obj.yolo_label] ? '0 0 6px #4ade80' : 'none',
                }}/>

                {/* Info — clickable to open conversation */}
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setSelected(obj)}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
                      {obj.name}
                    </h3>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-faint)', letterSpacing: '0.1em' }}>
                      [{obj.yolo_label}]
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3, lineHeight: 1.5, fontStyle: 'italic',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {obj.backstory?.slice(0, 100)}…
                  </p>
                </div>

                {/* Right side: voice + scan button */}
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-faint)', letterSpacing: '0.08em' }}>
                    {VOICE_NAMES[obj.voice_id] ?? '—'}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setScanning(obj); }}
                    title={scanned[obj.yolo_label] ? 'Re-scan fingerprint' : 'Scan to enable visual recognition'}
                    style={{
                      background: scanned[obj.yolo_label] ? 'rgba(74,222,128,0.1)' : 'rgba(232,136,58,0.12)',
                      border: `1px solid ${scanned[obj.yolo_label] ? '#4ade8066' : 'rgba(232,136,58,0.35)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 10px',
                      color: scanned[obj.yolo_label] ? '#4ade80' : 'var(--color-primary)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
                      transition: 'opacity 0.15s',
                    }}>
                    {scanned[obj.yolo_label] ? '✓ SCANNED' : '⊙ SCAN'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selected && (
        <ConversationModal object={selected} onClose={() => setSelected(null)} />
      )}

      {addingNew && (
        <NewObjectModal
          onClose={() => setAddingNew(false)}
          onCreated={() => { setAddingNew(false); loadObjects(); }}
        />
      )}

      {scanning && (
        <ScanModal
          object={scanning}
          onClose={() => setScanning(null)}
          onSaved={labels => {
            setScanned(s => ({ ...s, [scanning.yolo_label]: true }));
            setObjects(prev => prev.map(o =>
              o.yolo_label === scanning.yolo_label ? { ...o, vision_labels: labels } : o
            ));
            setScanning(null);
          }}
        />
      )}
    </div>
  );
}
