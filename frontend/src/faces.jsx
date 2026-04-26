import { useState, useRef, useEffect, useCallback } from 'react';
import { useCamera } from './hooks/useCamera';

const BACKEND = 'http://localhost:8000';

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function Avatar({ name }) {
  const initials = name.slice(0, 2).toUpperCase();
  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
      background: `oklch(0.55 0.14 ${hue})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '0.05em',
      userSelect: 'none',
    }}>{initials}</div>
  );
}

function CaptureModal({ onCapture, onClose }) {
  const { videoRef, status, start, stop, captureFrame } = useCamera();
  const [preview, setPreview] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);

  useEffect(() => { start(); return () => stop(); }, []);

  const handleSnap = useCallback(async () => {
    const canvas = captureFrame();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const blob = await new Promise(res => canvas.toBlob(b => res(b), 'image/jpeg', 0.92));
    setPreview(dataUrl);
    setCapturedBlob(blob);
  }, [captureFrame]);

  const handleRetake = () => { setPreview(null); setCapturedBlob(null); };
  const handleConfirm = () => { if (capturedBlob) onCapture(capturedBlob); };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'oklch(0.1 0.01 192 / 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)', overflow: 'hidden',
        width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--color-divider)',
        }}>
          <span style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>Take Photo</span>
          <button onClick={onClose} aria-label="Close" style={{
            width: 28, height: 28, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--color-border)', cursor: 'pointer',
            background: 'transparent', color: 'var(--color-text-muted)', fontSize: 16,
          }}>✕</button>
        </div>

        <div style={{ position: 'relative', aspectRatio: '4/3', background: '#0a0a09', overflow: 'hidden' }}>
          {!preview ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: '42%', aspectRatio: '3/4',
                  border: '2px dashed var(--color-primary)',
                  borderRadius: '50%', opacity: 0.5,
                }} />
              </div>
              <div style={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                fontSize: 'var(--text-xs)', color: 'var(--color-primary)',
                fontFamily: 'ui-monospace, monospace',
                background: 'oklch(0.18 0.02 192 / 0.85)',
                padding: '3px 12px', borderRadius: 'var(--radius-full)',
                backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
              }}>
                {status === 'live' ? 'Position face in oval' : 'Starting camera…'}
              </div>
            </>
          ) : (
            <img src={preview} alt="Captured face"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>

        <div style={{
          display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end',
          padding: 'var(--space-4) var(--space-5)',
          borderTop: '1px solid var(--color-divider)',
        }}>
          {!preview ? (
            <button onClick={handleSnap} disabled={status !== 'live'} style={{
              padding: 'var(--space-2) var(--space-5)',
              background: 'var(--color-primary)', color: '#111',
              border: 'none', borderRadius: 'var(--radius-md)',
              fontWeight: 600, fontSize: 'var(--text-sm)',
              cursor: status !== 'live' ? 'not-allowed' : 'pointer',
              opacity: status !== 'live' ? 0.4 : 1,
              transition: 'all var(--transition-interactive)',
            }}>📸 Snap</button>
          ) : (
            <>
              <button onClick={handleRetake} style={{
                padding: 'var(--space-2) var(--space-4)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                background: 'transparent', color: 'var(--color-text-muted)',
                fontSize: 'var(--text-sm)', cursor: 'pointer',
              }}>Retake</button>
              <button onClick={handleConfirm} style={{
                padding: 'var(--space-2) var(--space-5)',
                background: 'var(--color-primary)', color: '#111',
                border: 'none', borderRadius: 'var(--radius-md)',
                fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer',
              }}>✓ Use Photo</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RegisterModal({ onDone, onClose }) {
  const [step, setStep] = useState('name');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const validateName = (v) => {
    if (!v.trim()) return 'Name is required';
    if (!/^[a-zA-Z0-9_]+$/.test(v.trim())) return 'Letters, numbers, underscores only';
    return '';
  };

  const handleNameNext = () => {
    const err = validateName(name);
    if (err) { setNameError(err); return; }
    setNameError('');
    setStep('capture');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBlob(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStep('upload');
  };

  const handleCapture = (b) => {
    setBlob(b);
    setPreviewUrl(URL.createObjectURL(b));
    setStep('upload');
  };

  const handleSubmit = async () => {
    if (!blob || !name.trim()) return;
    setSubmitting(true); setError('');
    const form = new FormData();
    form.append('file', blob, `${name.trim()}.jpg`);
    try {
      const res = await fetch(`${BACKEND}/faces/register?name=${encodeURIComponent(name.trim())}`, {
        method: 'POST', body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      onDone();
    } catch (e) {
      setError(e.message ?? 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'oklch(0.1 0.01 192 / 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {step === 'capture' ? (
        <CaptureModal onCapture={handleCapture} onClose={() => setStep('name')} />
      ) : (
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', overflow: 'hidden',
          width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--color-divider)',
          }}>
            <span style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>
              {step === 'name' ? 'Register Face' : `Confirm — ${capitalize(name)}`}
            </span>
            <button onClick={onClose} aria-label="Close" style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--color-border)', cursor: 'pointer',
              background: 'transparent', color: 'var(--color-text-muted)', fontSize: 16,
            }}>✕</button>
          </div>

          <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {step === 'name' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Name
                  </label>
                  <input
                    autoFocus
                    value={name}
                    onChange={e => { setName(e.target.value); setNameError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleNameNext()}
                    placeholder="e.g. Sahil"
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'var(--color-surface-offset)',
                      border: `1px solid ${nameError ? 'var(--color-error)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-base)', color: 'var(--color-text)',
                      outline: 'none', width: '100%',
                    }}
                  />
                  {nameError && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{nameError}</span>}
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                    Letters, numbers and underscores only. This is what shows in the interaction log.
                  </span>
                </div>
                <button onClick={handleNameNext} style={{
                  padding: 'var(--space-3)', background: 'var(--color-primary)', color: '#111',
                  border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600,
                  fontSize: 'var(--text-sm)', cursor: 'pointer', width: '100%',
                }}>Continue →</button>
              </>
            )}

            {step === 'upload' && previewUrl && (
              <>
                <img src={previewUrl} alt="Face preview" style={{
                  width: '100%', aspectRatio: '1', objectFit: 'cover',
                  borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
                }} />
                {error && (
                  <div style={{
                    padding: 'var(--space-3)', background: 'var(--color-error-highlight)',
                    border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-xs)', color: 'var(--color-error)',
                  }}>{error}</div>
                )}
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <button onClick={() => { setStep('capture'); setBlob(null); setPreviewUrl(null); }} style={{
                    flex: 1, padding: 'var(--space-2)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                    background: 'transparent', color: 'var(--color-text-muted)',
                    fontSize: 'var(--text-sm)', cursor: 'pointer',
                  }}>Retake</button>
                  <button onClick={handleSubmit} disabled={submitting} style={{
                    flex: 2, padding: 'var(--space-2)',
                    background: 'var(--color-primary)', color: '#111',
                    border: 'none', borderRadius: 'var(--radius-md)',
                    fontWeight: 600, fontSize: 'var(--text-sm)',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1,
                  }}>{submitting ? 'Registering…' : `✓ Register ${capitalize(name)}`}</button>
                </div>
              </>
            )}
          </div>

          {step === 'name' && (
            <div style={{
              padding: 'var(--space-3) var(--space-5)',
              borderTop: '1px solid var(--color-divider)',
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>or</span>
              <button onClick={() => { const err = validateName(name); if (err) { setNameError(err); return; } fileInputRef.current?.click(); }}
                style={{
                  fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-1) var(--space-3)', cursor: 'pointer', background: 'transparent',
                }}>Upload photo</button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Faces() {
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  };

  const loadFaces = async () => {
    try {
      const res = await fetch(`${BACKEND}/faces`);
      const data = await res.json();
      setFaces((data.faces ?? []).map(name => ({ name })));
    } catch {
      showToast('Could not load faces', false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFaces(); }, []);

  const handleDelete = async (name) => {
    setDeleting(name);
    try {
      await fetch(`${BACKEND}/faces/${encodeURIComponent(name)}`, { method: 'DELETE' });
      showToast(`${capitalize(name)} removed`);
      await loadFaces();
    } catch {
      showToast('Delete failed', false);
    } finally {
      setDeleting(null);
    }
  };

  const handleRegistered = async () => {
    setShowRegister(false);
    showToast('Face registered ✓');
    await loadFaces();
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-4) var(--space-6)',
        borderBottom: '1px solid var(--color-divider)',
        background: 'var(--color-surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none" style={{ color: 'var(--color-primary)', flexShrink: 0 }}>
            <rect x="3" y="3" width="26" height="26" rx="6" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="16" cy="14" r="4" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 26c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Sentient{' '}
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 400 }}>/ faces</span>
          </span>
        </div>
        <button onClick={() => setShowRegister(true)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-4)',
          background: 'var(--color-primary)', color: '#111',
          border: 'none', borderRadius: 'var(--radius-md)',
          fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer',
          transition: 'all var(--transition-interactive)',
        }}>+ Register Face</button>
      </header>

      <main style={{ flex: 1, padding: 'var(--space-6)', maxWidth: 640, width: '100%', margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 72, borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(90deg,var(--color-surface-offset) 25%,var(--color-surface-dynamic) 50%,var(--color-surface-offset) 75%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite',
              }} />
            ))}
            <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
          </div>
        ) : faces.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 'var(--space-4)', paddingTop: 'var(--space-16)',
            color: 'var(--color-text-muted)', textAlign: 'center',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.2" opacity="0.3">
              <circle cx="12" cy="8" r="4"/>
              <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6"/>
              <path d="M19 8l2-2M21 8l-2-2"/>
            </svg>
            <div>
              <p style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
                No faces registered yet
              </p>
              <p style={{ fontSize: 'var(--text-sm)', maxWidth: '28ch' }}>
                Register your team so Sentient can identify them during live tracking.
              </p>
            </div>
            <button onClick={() => setShowRegister(true)} style={{
              padding: 'var(--space-3) var(--space-6)',
              background: 'var(--color-primary)', color: '#111',
              border: 'none', borderRadius: 'var(--radius-md)',
              fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer',
            }}>Register first face</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginBottom: 'var(--space-1)' }}>
              {faces.length} {faces.length === 1 ? 'person' : 'people'} registered
            </p>
            {faces.map(({ name }) => (
              <div key={name} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                padding: 'var(--space-4)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
              }}>
                <Avatar name={name} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
                    {capitalize(name)}
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontFamily: 'ui-monospace, monospace' }}>
                    id: {name}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(name)}
                  disabled={deleting === name}
                  aria-label={`Remove ${name}`}
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'transparent',
                    color: deleting === name ? 'var(--color-text-faint)' : 'var(--color-error)',
                    cursor: deleting === name ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, transition: 'all var(--transition-interactive)',
                  }}>
                  {deleting === name ? '…' : '✕'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer style={{
        display: 'flex', justifyContent: 'space-between',
        padding: 'var(--space-4) var(--space-6)',
        borderTop: '1px solid var(--color-divider)',
        fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)',
      }}>
        <span>Sentient — BearHacks 2026</span>
        <span>FastAPI → :8000</span>
      </footer>

      {showRegister && (
        <RegisterModal onDone={handleRegistered} onClose={() => setShowRegister(false)} />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 'var(--space-6)', left: '50%', transform: 'translateX(-50%)',
          padding: 'var(--space-3) var(--space-5)',
          background: toast.ok ? 'var(--color-primary)' : 'var(--color-error)',
          color: toast.ok ? '#111' : '#fff',
          borderRadius: 'var(--radius-full)',
          fontSize: 'var(--text-sm)', fontWeight: 600,
          boxShadow: 'var(--shadow-lg)', zIndex: 200, whiteSpace: 'nowrap',
          animation: 'fadeUp 200ms ease',
        }}>
          {toast.msg}
          <style>{`@keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
        </div>
      )}
    </div>
  );
}