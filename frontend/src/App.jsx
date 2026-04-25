import { useState, useCallback, useEffect, useRef } from 'react';
import { useCamera } from './hooks/useCamera';

const BACKEND = 'http://localhost:8000';
const LIVE_INTERVAL_MS = 800;
const PHASE_IDLE    = 'idle';
const PHASE_SCANNED = 'scanned';

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

// depth float [0,1] → colour (higher = closer = warmer)
function depthColor(d) {
  if (d === undefined || d === null) return '#4f98a3';
  if (d > 0.75) return '#f97316';
  if (d > 0.5)  return '#facc15';
  if (d > 0.25) return '#4ade80';
  return '#4f98a3';
}

function depthLabel(d) {
  if (d === undefined || d === null) return '—';
  if (d > 0.75) return 'very close';
  if (d > 0.5)  return 'near';
  if (d > 0.25) return 'mid';
  return 'far';
}

// ── Object Side Panel ─────────────────────────────────────────────────────────
function ObjectPanel({ objects, activeIds }) {
  if (!objects.length) return (
    <div style={{ padding: 'var(--space-6)', color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>
      No objects detected yet
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto', flex: 1 }}>
      {objects.map(obj => {
        const active = activeIds.has(obj.id);
        const dc = depthColor(obj.depth);
        return (
          <div key={obj.id} style={{
            padding: 'var(--space-3) var(--space-4)',
            background: active ? 'oklch(0.55 0.15 30 / 0.12)' : 'var(--color-surface)',
            borderLeft: `3px solid ${active ? '#f97316' : 'var(--color-border)'}`,
            transition: 'background 200ms ease, border-color 200ms ease',
            display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
              <span style={{
                fontSize: 'var(--text-xs)', fontFamily: 'ui-monospace, monospace',
                color: active ? '#f97316' : 'var(--color-primary)',
                fontWeight: 700, letterSpacing: '0.02em',
              }}>
                {obj.id}
              </span>
              <span style={{
                fontSize: 10, fontFamily: 'ui-monospace, monospace',
                color: 'var(--color-text-faint)',
                background: 'var(--color-surface-offset)',
                padding: '1px 6px', borderRadius: 'var(--radius-full)',
              }}>
                {Math.round(obj.conf * 100)}%
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', fontWeight: 500 }}>
                {obj.label}
              </span>
              <span style={{
                fontSize: 10, padding: '1px 6px',
                background: `${dc}22`,
                color: dc,
                borderRadius: 'var(--radius-full)',
                fontFamily: 'ui-monospace, monospace',
              }}>
                {depthLabel(obj.depth)}
              </span>
              {obj.depth !== undefined && (
                <span style={{
                  fontSize: 10, fontFamily: 'ui-monospace, monospace',
                  color: 'var(--color-text-faint)',
                }}>
                  {obj.depth.toFixed(2)}
                </span>
              )}
            </div>

            <div style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: 'var(--color-text-faint)' }}>
              cx {obj.cx} · cy {obj.cy}
            </div>

            {obj.ocr_text && (
              <div style={{
                fontSize: 10, fontFamily: 'ui-monospace, monospace',
                color: 'var(--color-text-muted)',
                background: 'var(--color-surface-offset)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 6px',
                marginTop: 'var(--space-1)',
                wordBreak: 'break-word',
              }}>
                "{obj.ocr_text.slice(0, 40)}{obj.ocr_text.length > 40 ? '…' : ''}"
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Live Canvas — draws persons + live objects every rAF ──────────────────────
function LiveCanvas({ videoRef, persons, liveObjects, storedObjects, latestInteractions }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  // Use live detections if available, fall back to stored scan positions
  const objectsToDraw = liveObjects.length ? liveObjects : storedObjects;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video || video.readyState < 2) {
      animRef.current = requestAnimationFrame(draw);
      return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const W = canvas.width, H = canvas.height;
    const activeIds = new Set(latestInteractions.map(i => i.object_id));

    objectsToDraw.forEach(obj => {
      const { box, label, conf, depth } = obj;
      const x  = box.x1 * W, y = box.y1 * H;
      const bw = (box.x2 - box.x1) * W, bh = (box.y2 - box.y1) * H;
      const active = activeIds.has(obj.id);
      const dc = depthColor(depth);

      // Box
      ctx.strokeStyle = active ? '#f97316' : dc;
      ctx.lineWidth   = active ? 3 : 1.5;
      ctx.strokeRect(x, y, bw, bh);

      // Depth bar on left edge (height proportion = depth value)
      if (depth !== undefined) {
        const barH = bh * depth;
        ctx.fillStyle = `${dc}55`;
        ctx.fillRect(x - 4, y + bh - barH, 3, barH);
      }

      // Label tag
      const tag = `${label} ${Math.round(conf * 100)}%`;
      ctx.font  = 'bold 12px ui-monospace, monospace';
      const tw  = ctx.measureText(tag).width;
      ctx.fillStyle = active ? '#f97316' : dc;
      ctx.beginPath(); ctx.roundRect(x - 1, y - 22, tw + 10, 20, 3); ctx.fill();
      ctx.fillStyle = active ? '#fff' : '#111';
      ctx.fillText(tag, x + 4, y - 7);

      // Depth label below
      if (depth !== undefined) {
        const dl = depthLabel(depth);
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillStyle = `${dc}cc`;
        ctx.fillText(dl, x + 2, y + bh + 12);
      }
    });

    persons.forEach(person => {
      const { box, depth } = person;
      const x  = box.x1 * W, y = box.y1 * H;
      const bw = (box.x2 - box.x1) * W, bh = (box.y2 - box.y1) * H;
      ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, bw, bh);
      const depthStr = depth !== undefined ? ` · ${depth.toFixed ? depth.toFixed(2) : depth}` : '';
      const tag = `person${depthStr}`;
      ctx.font  = 'bold 12px ui-monospace, monospace';
      const tw  = ctx.measureText(tag).width;
      ctx.fillStyle = '#4ade80';
      ctx.beginPath(); ctx.roundRect(x - 1, y - 22, tw + 10, 20, 3); ctx.fill();
      ctx.fillStyle = '#111'; ctx.fillText(tag, x + 4, y - 7);
    });

    animRef.current = requestAnimationFrame(draw);
  }, [videoRef, persons, objectsToDraw, latestInteractions]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
  );
}

// ── Annotated Canvas (scan snapshot) ─────────────────────────────────────────
function AnnotatedCanvas({ dataUrl, objects }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!dataUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      (objects || []).forEach(obj => {
        const { box, label, conf, depth } = obj;
        const x  = box.x1 * img.naturalWidth,  y  = box.y1 * img.naturalHeight;
        const bw = (box.x2 - box.x1) * img.naturalWidth;
        const bh = (box.y2 - box.y1) * img.naturalHeight;
        const dc = depthColor(depth);
        ctx.strokeStyle = dc; ctx.lineWidth = 2;
        ctx.strokeRect(x, y, bw, bh);
        const tag = `${label} ${Math.round(conf * 100)}%`;
        ctx.font = 'bold 12px ui-monospace, monospace';
        const tw = ctx.measureText(tag).width;
        ctx.fillStyle = dc;
        ctx.beginPath(); ctx.roundRect(x - 1, y - 22, tw + 10, 20, 3); ctx.fill();
        ctx.fillStyle = '#111'; ctx.fillText(tag, x + 4, y - 7);
      });
    };
    img.src = dataUrl;
  }, [dataUrl, objects]);
  return <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 'var(--radius-md)', display: 'block' }} />;
}

// ── Interaction Feed ──────────────────────────────────────────────────────────
function InteractionFeed({ log }) {
  if (!log.length) return (
    <div style={{ padding: 'var(--space-4)', color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>
      No interactions yet
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {[...log].reverse().map((ev, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          background: i === 0 ? 'oklch(0.55 0.15 30 / 0.10)' : 'var(--color-surface)',
          fontSize: 11, fontFamily: 'ui-monospace, monospace',
        }}>
          <span style={{ color: '#f97316', fontWeight: 700, minWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ev.object_id}
          </span>
          <span style={{ color: 'var(--color-text-muted)', flex: 1 }}>{ev.object_label}</span>
          {ev.person_depth !== undefined && (
            <span style={{ color: depthColor(ev.person_depth), fontSize: 10 }}>
              p:{ev.person_depth.toFixed(2)}
            </span>
          )}
          {ev.object_depth !== undefined && (
            <span style={{ color: depthColor(ev.object_depth), fontSize: 10 }}>
              o:{ev.object_depth.toFixed(2)}
            </span>
          )}
          <span style={{ color: 'var(--color-text-faint)', flexShrink: 0 }}>
            {new Date(ev.timestamp * 1000).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Camera View ───────────────────────────────────────────────────────────────
function CameraView({ videoRef, status, resolution, onStart, onStop, flash, phase,
  persons, liveObjects, storedObjects, latestInteractions }) {
  const isLive = status === 'live';

  const btn = (onClick, disabled, label, text, accent) => (
    <button onClick={onClick} disabled={disabled} aria-label={label} style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
      padding: 'var(--space-2) var(--space-4)',
      fontSize: 'var(--text-sm)', fontWeight: 500,
      borderRadius: 'var(--radius-md)',
      border: accent ? 'none' : '1px solid var(--color-border)',
      color: disabled ? 'var(--color-text-faint)' : (accent ? '#111' : 'var(--color-text-muted)'),
      background: accent ? 'var(--color-primary)' : 'transparent',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'all var(--transition-interactive)',
    }}>{text}</button>
  );

  return (
    <div style={{
      flex: 1, background: 'var(--color-surface)',
      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)',
      overflow: 'hidden', boxShadow: 'var(--shadow-lg)',
    }}>
      <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0a0a09', overflow: 'hidden' }}>
        <video ref={videoRef} autoPlay playsInline muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

        {phase === PHASE_SCANNED && isLive && (
          <LiveCanvas
            videoRef={videoRef}
            persons={persons}
            liveObjects={liveObjects}
            storedObjects={storedObjects}
            latestInteractions={latestInteractions}
          />
        )}

        {[
          { top: 12, left: 12, bw: '2px 0 0 2px', br: '3px 0 0 0' },
          { top: 12, right: 12, bw: '2px 2px 0 0', br: '0 3px 0 0' },
          { bottom: 12, left: 12, bw: '0 0 2px 2px', br: '0 0 0 3px' },
          { bottom: 12, right: 12, bw: '0 2px 2px 0', br: '0 0 3px 0' },
        ].map((c, i) => (
          <span key={i} style={{
            position: 'absolute', width: 18, height: 18, ...c,
            borderStyle: 'solid', borderColor: 'var(--color-primary)',
            borderWidth: c.bw, borderRadius: c.br, opacity: 0.55,
          }} />
        ))}

        {phase === PHASE_SCANNED && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'oklch(0.18 0.02 192 / 0.85)', border: '1px solid var(--color-primary)',
            borderRadius: 'var(--radius-full)', padding: '3px 12px',
            fontSize: 'var(--text-xs)', color: 'var(--color-primary)',
            fontFamily: 'ui-monospace, monospace', backdropFilter: 'blur(8px)',
          }}>● TRACKING</div>
        )}

        {!isLive && status !== 'requesting' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 'var(--space-3)', color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)',
          }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3">
              <path d="M1 1l22 22M11 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12c.7 0 1.37-.23 1.9-.6M15 5h2l.5 3M3 11h18"/>
            </svg>
            <p style={{ maxWidth: '22ch', textAlign: 'center', lineHeight: 1.4 }}>
              {status === 'error' ? 'Camera access denied.' : 'Click Start Camera to begin'}
            </p>
          </div>
        )}
        <div style={{
          position: 'absolute', inset: 0, background: 'white',
          opacity: flash ? 0.55 : 0, pointerEvents: 'none', transition: 'opacity 60ms ease',
        }} />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-5)',
        background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-divider)',
        flexWrap: 'wrap', gap: 'var(--space-3)',
      }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontVariantNumeric: 'tabular-nums' }}>
          {resolution ? `${resolution.w} × ${resolution.h}` : '—'}
        </span>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {btn(onStart, isLive || status === 'requesting', 'Start', '▷ Start Camera')}
          {btn(onStop, !isLive, 'Stop', '◼ Stop')}
        </div>
      </div>
    </div>
  );
}

// ── Scan Button ───────────────────────────────────────────────────────────────
function ScanButton({ disabled, scanning, onClick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', paddingTop: 'var(--space-2)' }}>
      <button onClick={onClick} disabled={disabled || scanning} style={{
        width: 56, height: 56, borderRadius: '50%',
        background: disabled ? 'transparent' : 'var(--color-primary)',
        border: disabled ? '2px solid var(--color-surface-offset)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: disabled ? '0 0 0 4px var(--color-surface-offset)' : '0 0 0 4px var(--color-surface-offset), 0 4px 20px oklch(0.48 0.12 192 / 0.45)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        transition: 'all var(--transition-interactive)',
        animation: scanning ? 'pulse 0.8s ease-in-out infinite' : 'none',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={disabled ? 'var(--color-text-faint)' : '#111'}
          strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
          <rect x="7" y="7" width="10" height="10" rx="1"/>
        </svg>
      </button>
      <span style={{
        fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)',
        letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>
        {disabled ? 'Start camera first' : scanning ? 'Scanning…' : 'Scan · Space'}
      </span>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { videoRef, status, resolution, start, stop, captureFrame } = useCamera();

  const [flash,         setFlash]         = useState(false);
  const [phase,         setPhase]         = useState(PHASE_IDLE);
  const [scanning,      setScanning]      = useState(false);
  const [scanDataUrl,   setScanDataUrl]   = useState(null);
  const [storedObjects, setStoredObjects] = useState([]);  // from scan, static positions
  const [liveObjects,   setLiveObjects]   = useState([]);  // from /live/detect, updated positions
  const [persons,       setPersons]       = useState([]);
  const [liveLog,       setLiveLog]       = useState([]);
  const [latestInter,   setLatestInter]   = useState([]);
  const liveTimerRef = useRef(null);

  const activeIds = new Set(latestInter.map(i => i.object_id));

  const triggerFlash = useCallback(() => {
    setFlash(true); setTimeout(() => setFlash(false), 140);
  }, []);

  const handleScan = useCallback(async () => {
    const canvas = captureFrame();
    if (!canvas) return;
    triggerFlash();
    setScanning(true);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const blob    = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
    const form    = new FormData();
    form.append('file', blob, 'scan.jpg');
    try {
      const res  = await fetch(`${BACKEND}/capture`, { method: 'POST', body: form });
      const data = await res.json();
      setStoredObjects(data.objects ?? []);
      setLiveObjects([]);
      setScanDataUrl(dataUrl);
      setPhase(PHASE_SCANNED);
      setLiveLog([]); setLatestInter([]);
    } catch (err) { console.error(err); }
    finally { setScanning(false); }
  }, [captureFrame, triggerFlash]);

  // Live detect loop
  useEffect(() => {
    if (phase !== PHASE_SCANNED || status !== 'live') {
      clearInterval(liveTimerRef.current); return;
    }
    liveTimerRef.current = setInterval(async () => {
      const canvas = captureFrame();
      if (!canvas) return;
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.75));
      const form = new FormData(); form.append('file', blob, 'live.jpg');
      try {
        const res  = await fetch(`${BACKEND}/live/detect`, { method: 'POST', body: form });
        const data = await res.json();
        setPersons(data.persons ?? []);
        setLatestInter(data.interactions ?? []);

        // all_objects has the stored positions; we re-map depth from current response
        // so boxes in the panel reflect the scanned layout but depth is live
        if (data.all_objects?.length) {
          setLiveObjects(data.all_objects);
        }

        if (data.interactions?.length) {
          setLiveLog(prev => [...prev, ...data.interactions]);
        }
      } catch (err) { console.error(err); }
    }, LIVE_INTERVAL_MS);
    return () => clearInterval(liveTimerRef.current);
  }, [phase, status, captureFrame]);

  // Spacebar
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || status !== 'live' || phase !== PHASE_IDLE) return;
      const tag = document.activeElement?.tagName;
      if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
      e.preventDefault(); handleScan();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, phase, handleScan]);

  const handleRescan = () => {
    clearInterval(liveTimerRef.current);
    setPhase(PHASE_IDLE); setStoredObjects([]); setLiveObjects([]);
    setScanDataUrl(null); setPersons([]); setLiveLog([]); setLatestInter([]);
  };

  // Panel shows live positions if available, else stored scan positions
  const displayObjects = liveObjects.length ? liveObjects : storedObjects;

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: '100dvh', background: 'var(--color-bg)' }}>
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
            Sentient{" "}
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 400 }}>
              / {phase === PHASE_SCANNED ? 'tracking' : 'vision capture'}
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {phase === PHASE_SCANNED && (
            <button onClick={handleRescan} style={{
              fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              padding: 'var(--space-1) var(--space-3)', cursor: 'pointer', background: 'transparent',
            }}>↺ Rescan</button>
          )}
          <StatusBadge status={status} />
        </div>
      </header>

      {/* Main */}
      <main style={{
        display: 'grid',
        gridTemplateColumns: phase === PHASE_SCANNED ? '1fr 280px' : '1fr',
        gap: 'var(--space-5)',
        padding: 'var(--space-6)',
        alignItems: 'start',
        transition: 'grid-template-columns 300ms ease',
      }}>

        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <CameraView
            videoRef={videoRef} status={status} resolution={resolution}
            onStart={start} onStop={stop} flash={flash}
            phase={phase} persons={persons}
            liveObjects={liveObjects}
            storedObjects={storedObjects}
            latestInteractions={latestInter}
          />

          {phase === PHASE_IDLE && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ScanButton disabled={status !== 'live'} scanning={scanning} onClick={handleScan} />
            </div>
          )}

          {phase === PHASE_SCANNED && (
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)', overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: '1px solid var(--color-divider)',
              }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Interaction Log
                </span>
                {liveLog.length > 0 && (
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    background: '#f97316', color: '#fff',
                    borderRadius: 'var(--radius-full)', padding: '1px 8px', fontWeight: 600,
                  }}>{liveLog.length}</span>
                )}
              </div>
              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                <InteractionFeed log={liveLog} />
              </div>
            </div>
          )}
        </div>

        {/* Right — object panel */}
        {phase === PHASE_SCANNED && (
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            maxHeight: 'calc(100vh - 160px)',
            position: 'sticky', top: 'var(--space-6)',
          }}>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--color-divider)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Objects in Memory
              </span>
              <span style={{
                fontSize: 'var(--text-xs)',
                background: 'var(--color-primary)', color: '#111',
                borderRadius: 'var(--radius-full)', padding: '1px 8px', fontWeight: 600,
              }}>{displayObjects.length}</span>
            </div>

            {scanDataUrl && (
              <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-divider)' }}>
                <AnnotatedCanvas dataUrl={scanDataUrl} objects={storedObjects} />
              </div>
            )}

            <ObjectPanel objects={displayObjects} activeIds={activeIds} />
          </div>
        )}
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