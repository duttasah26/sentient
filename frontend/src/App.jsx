import { useState, useCallback, useEffect } from 'react';
import { useCamera } from './hooks/useCamera';

const BACKEND = 'http://localhost:8000';

// ── Status Badge ──────────────────────────────────────────
const STATES = {
  idle:       { color: '#4a4845', label: 'Waiting' },
  requesting: { color: '#d97706', label: 'Requesting…', pulse: true },
  live:       { color: '#4ade80', label: 'Live', glow: true },
  error:      { color: '#f87171', label: 'Camera error' },
};

function StatusBadge({ status }) {
  const s = STATES[status] ?? STATES.idle;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
      fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
      padding: 'var(--space-1) var(--space-3)',
      background: 'var(--color-surface-offset)',
      borderRadius: 'var(--radius-full)',
      border: '1px solid var(--color-border)',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: s.color,
        boxShadow: s.glow ? `0 0 6px ${s.color}` : 'none',
        animation: s.pulse ? 'pulse 1s ease-in-out infinite' : 'none',
        flexShrink: 0,
      }} />
      {s.label}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}

// ── Camera View ───────────────────────────────────────────
function CameraView({ videoRef, status, resolution, onStart, onStop, flash }) {
  const isLive = status === 'live';

  const toolbarBtn = (onClick, disabled, label, text) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-4)',
        fontSize: 'var(--text-sm)', fontWeight: 500,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        color: disabled ? 'var(--color-text-faint)' : 'var(--color-text-muted)',
        background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background var(--transition-interactive)', 
      }}
    >
      {text}
    </button>
  );

  return (
    <div style={{
      width: '100%', maxWidth: 800,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-lg)',
    }}>
      {/* Viewport */}
      <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0a0a09', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Corner brackets */}
        {[
          { top: 12,    left: 12,  bw: '2px 0 0 2px', br: '3px 0 0 0' },
          { top: 12,    right: 12, bw: '2px 2px 0 0', br: '0 3px 0 0' },
          { bottom: 12, left: 12,  bw: '0 0 2px 2px', br: '0 0 0 3px' },
          { bottom: 12, right: 12, bw: '0 2px 2px 0', br: '0 0 3px 0' },
        ].map((c, i) => (
          <span key={i} style={{
            position: 'absolute', width: 18, height: 18,
            ...c,
            borderStyle: 'solid',
            borderColor: 'var(--color-primary)',
            borderWidth: c.bw,
            borderRadius: c.br,
            opacity: 0.55,
          }} />
        ))}

        {/* Empty state */}
        {!isLive && status !== 'requesting' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 'var(--space-3)', color: 'var(--color-text-faint)',
            fontSize: 'var(--text-sm)',
          }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3">
              <path d="M1 1l22 22M11 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12c.7 0 1.37-.23 1.9-.6M15 5h2l.5 3M3 11h18"/>
            </svg>
            <p style={{ maxWidth: '22ch', textAlign: 'center', lineHeight: 1.4 }}>
              {status === 'error' ? 'Camera access denied. Check permissions.' : 'Click Start Camera to begin'}
            </p>
          </div>
        )}

        {/* Capture flash */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'white',
          opacity: flash ? 0.55 : 0,
          pointerEvents: 'none',
          transition: 'opacity 60ms ease',
        }} />
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-5)',
        background: 'var(--color-surface-2)',
        borderTop: '1px solid var(--color-divider)',
        flexWrap: 'wrap', gap: 'var(--space-3)',
      }}>
        <span style={{
          fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {resolution ? `${resolution.w} × ${resolution.h}` : '—'}
        </span>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {toolbarBtn(onStart, isLive || status === 'requesting', 'Start camera', '▷ Start Camera')}
          {toolbarBtn(onStop,  !isLive,                           'Stop camera',  '◼ Stop')}
        </div>
      </div>
    </div>
  );
}

// ── Capture Button ────────────────────────────────────────
function CaptureButton({ disabled, onClick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label="Capture frame"
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: disabled ? 'transparent' : 'var(--color-primary)',
          border: disabled ? '2px solid var(--color-surface-offset)' : 'none',
          color: '#111',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          
          boxShadow: disabled
            ? '0 0 0 4px var(--color-surface-offset)'
            : '0 0 0 4px var(--color-surface-offset), 0 4px 20px oklch(0.48 0.12 192 / 0.45)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.35 : 1,
          transition: 'all var(--transition-interactive)', 
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
          stroke={disabled ? 'var(--color-text-faint)' : '#111'}
          strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="14.31" y1="8"   x2="20.05" y2="17.94"/>
          <line x1="9.69"  y1="8"   x2="21.17" y2="8"/>
          <line x1="7.38"  y1="12"  x2="13.12" y2="2.06"/>
          <line x1="9.69"  y1="16"  x2="3.95"  y2="6.06"/>
          <line x1="14.31" y1="16"  x2="2.83"  y2="16"/>
          <line x1="16.62" y1="12"  x2="10.88" y2="21.94"/>
        </svg>
      </button>
      <span style={{
        fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)',
        letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>
        {disabled ? 'Start camera to capture' : 'Press to capture · Space'}
      </span>
    </div>
  );
}

// ── Result Panel ──────────────────────────────────────────
function ResultPanel({ result, onClear }) {
  if (!result) return null;
  return (
    <div style={{
      width: '100%', maxWidth: 800,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
      animation: 'slideUp 240ms cubic-bezier(0.16,1,0.3,1)',
    }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-5)',
        borderBottom: '1px solid var(--color-divider)',
      }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-muted)' }}>
          Capture result
        </span>
        <button onClick={onClear} style={{
          fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
          padding: 'var(--space-1) var(--space-3)',
          cursor: 'pointer',
        }}>✕ Clear</button>
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--color-divider)' }}>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            RGB Frame
          </span>
          {result.localDataUrl
            ? <img src={result.localDataUrl} alt="Captured frame" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
            : <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-offset)' }} />
          }
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Backend Response
          </span>
          <pre style={{
            fontSize: 11, fontFamily: 'Menlo, Consolas, monospace',
            color: 'var(--color-text-muted)',
            background: 'var(--color-surface-offset)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            overflowX: 'auto', whiteSpace: 'pre-wrap', 
            border: '1px solid var(--color-border)',
            flex: 1, minHeight: 80, margin: 0,
          }}>
            {result.loading
              ? 'Sending to backend…'
              : result.error
                ? `Error: ${result.error}\n\nIs FastAPI running on :8000?`
                : JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-5)',
        borderTop: '1px solid var(--color-divider)',
      }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {result.loading ? 'Processing…' : result.error ? 'Backend unreachable' : `Response in ${result.ms}ms`}
        </span>
        {result.timestamp && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
            {result.timestamp}
          </span>
        )}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────
export default function App() {
  const { videoRef, status, resolution, start, stop, captureFrame } = useCamera();
  const [flash,  setFlash]  = useState(false);
  const [result, setResult] = useState(null);


  const triggerFlash = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 140);
  }, []);

  const handleCapture = useCallback(async () => {
    const canvas = captureFrame();
    if (!canvas) return;
    triggerFlash();

    const localDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setResult({ localDataUrl, loading: true, data: null, error: null, ms: null, timestamp: null });

    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
    const form = new FormData();
    form.append('file', blob, 'capture.jpg');

    const t0 = Date.now();
    try {
      const res  = await fetch(`${BACKEND}/capture`, { method: 'POST', body: form });
      const data = await res.json();
      setResult({
        localDataUrl, loading: false, data, error: null,
        ms: Date.now() - t0,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err) {
     
      setResult(prev => ({
        ...prev,
        loading: false,
        error: err.message,
        timestamp: new Date().toLocaleTimeString(),
      }));
    }
  }, [captureFrame, triggerFlash]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space') return;
      if (status !== 'live') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      handleCapture();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, handleCapture]);

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: '100dvh' }}>
      {/* Header */}
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
            <path d="M23 10c1.5 1 2.5 2.8 2.5 4.5s-1 3.5-2.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.45"/>
            <path d="M9 10C7.5 11 6.5 12.8 6.5 14.5S7.5 18 9 19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.45"/>
          </svg>
          <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Sentient{' '}
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 400 }}>
              / vision capture
            </span>
          </span>
        </div>
        <StatusBadge status={status} />
      </header>

      {/* Main */}
      <main style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 'var(--space-8) var(--space-6)', gap: 'var(--space-8)',
      }}>
        <CameraView
          videoRef={videoRef}
          status={status}
          resolution={resolution}
          onStart={start}
          onStop={stop}
          flash={flash}
        />
        <CaptureButton disabled={status !== 'live'} onClick={handleCapture} />
        <ResultPanel result={result} onClear={() => setResult(null)} />
      </main>

      {/* Footer */}
      <footer style={{
        display: 'flex', justifyContent: 'space-between',
        padding: 'var(--space-4) var(--space-6)',
        borderTop: '1px solid var(--color-divider)',
        fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)',
      }}>
        <span>Sentient — BearHacks 2026</span>
        <span>FastAPI → :8000</span>
      </footer>
    </div>
  );
}