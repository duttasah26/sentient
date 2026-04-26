import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCamera } from './hooks/useCamera';
import { useConversation } from './hooks/useConversation';

const BACKEND = 'http://localhost:8000';
const LIVE_MS = 2000;

const depthColor = d => {
  if (d == null) return '#e8883a';
  if (d > 0.75)  return '#e8883a';
  if (d > 0.5)   return '#facc15';
  if (d > 0.25)  return '#4ade80';
  return '#4f98a3';
};

function StatusDot({ status }) {
  const cfg = {
    idle:       { c: '#4a4845', label: 'STANDBY' },
    requesting: { c: '#d97706', label: 'INITIALISING', pulse: true },
    live:       { c: '#4ade80', label: 'LIVE', glow: true },
    error:      { c: '#e85a5a', label: 'ERROR' },
  }[status] ?? { c: '#4a4845', label: 'STANDBY' };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6,
      fontFamily:'var(--font-mono)', fontSize:10,
      color:'var(--color-text-faint)', letterSpacing:'0.1em' }}>
      <span style={{
        width:7, height:7, borderRadius:'50%', background:cfg.c,
        boxShadow: cfg.glow  ? `0 0 8px ${cfg.c}` : 'none',
        animation: cfg.pulse ? 'pulse-ring 1.2s ease-in-out infinite' : 'none',
        flexShrink:0,
      }}/>
      {cfg.label}
    </div>
  );
}

// ── Canvas — draws boxes + click detection ────────────────────────────────
function LiveCanvas({ videoRef, objects, onClickObject }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video || video.readyState < 2) {
      animRef.current = requestAnimationFrame(draw); return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const W = canvas.width, H = canvas.height;

    objects.forEach(obj => {
      const { box, label, conf, depth, name } = obj;
      const x  = box.x1 * W, y  = box.y1 * H;
      const bw = (box.x2 - box.x1) * W, bh = (box.y2 - box.y1) * H;
      const dc = depthColor(depth);

      ctx.strokeStyle = dc; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, bw, bh);

      // Corner brackets
      const cs = 14;
      ctx.strokeStyle = '#e8883a'; ctx.lineWidth = 2.5;
      [
        [x,      y,      1,  1],
        [x + bw, y,     -1,  1],
        [x,      y + bh, 1, -1],
        [x + bw, y + bh,-1, -1],
      ].forEach(([px, py, sx, sy]) => {
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + sx*cs, py); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + sy*cs); ctx.stroke();
      });

      // Name tag background
      const tag = name || label;
      ctx.font = `bold 13px 'Syne Mono', monospace`;
      const tw = ctx.measureText(tag).width;
      ctx.fillStyle = 'rgba(17,17,16,0.9)';
      ctx.beginPath();
      ctx.roundRect(x - 1, y - 26, tw + 14, 22, 3);
      ctx.fill();
      ctx.fillStyle = '#e8883a';
      ctx.fillText(tag, x + 6, y - 9);

      // Conf badge
      ctx.font = `10px 'Syne Mono', monospace`;
      ctx.fillStyle = `${dc}bb`;
      ctx.fillText(`${Math.round(conf * 100)}%`, x + 4, y + bh + 14);

      // "TAP TO TALK" hint at bottom of box
      ctx.font = `9px 'Syne Mono', monospace`;
      ctx.fillStyle = 'rgba(232,136,58,0.7)';
      const hint = '[ TAP TO TALK ]';
      const hw = ctx.measureText(hint).width;
      ctx.fillText(hint, x + bw/2 - hw/2, y + bh - 6);
    });

    animRef.current = requestAnimationFrame(draw);
  }, [videoRef, objects]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left)  / rect.width;
    const ny = (e.clientY - rect.top)   / rect.height;
    const hit = objects.find(o =>
      nx >= o.box.x1 && nx <= o.box.x2 &&
      ny >= o.box.y1 && ny <= o.box.y2
    );
    if (hit) onClickObject(hit);
  }, [objects, onClickObject]);

  return (
    <canvas ref={canvasRef} onClick={handleClick} style={{
      position:'absolute', inset:0, width:'100%', height:'100%', cursor:'crosshair',
    }}/>
  );
}

// ── Conversation drawer ───────────────────────────────────────────────────
function ConversationDrawer({ object, onClose }) {
  const { connect, disconnect, send, messages, status, objectMeta } =
    useConversation(object?.label ?? '');
  const [input,     setInput]     = useState('');
  const [started,   setStarted]   = useState(false);
  const [recording, setRecording] = useState(false);
  const bottomRef  = useRef(null);
  const mediaRef   = useRef(null);
  const chunksRef  = useRef([]);

  // Don't auto-connect — wait for user to press TALK
  useEffect(() => {
    return () => disconnect();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTalk = () => {
    setStarted(true);
    connect();
  };

  const handleSend = () => {
    const t = input.trim();
    if (!t || status === 'thinking' || status === 'speaking') return;
    send(t);
    setInput('');
  };

  const startRecording = async () => {
    if (!isReady) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr     = new MediaRecorder(stream);
      const mime   = mr.mimeType || 'audio/webm';
      const ext    = mime.split('/')[1]?.split(';')[0] || 'webm';
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        const form = new FormData();
        form.append('file', blob, `voice.${ext}`);
        try {
          const res  = await fetch(`${BACKEND}/stt`, { method: 'POST', body: form });
          const data = await res.json();
          if (data.text?.trim()) send(data.text.trim());
        } catch(e) { console.error('[STT]', e); }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch(e) { console.error('[Mic]', e); }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    mediaRef.current = null;
    setRecording(false);
  };

  if (!object) return null;

  const isReady = status === 'ready' || status === 'thinking' || status === 'speaking';

  const statusColor = {
    connecting: '#d97706',
    ready:      '#e8883a',
    thinking:   '#facc15',
    speaking:   '#4ade80',
    error:      '#e85a5a',
  }[status] ?? '#4a4845';

  const statusLabel = {
    idle:       'OFFLINE',
    connecting: 'LINKING…',
    ready:      'LISTENING',
    thinking:   'THINKING…',
    speaking:   'SPEAKING…',
    error:      'ERROR',
  }[status] ?? 'OFFLINE';

  return (
    <div style={{
      position:'fixed', top:0, right:0, bottom:0, width:380,
      background:'var(--color-surface)',
      borderLeft:'1px solid var(--color-border)',
      display:'flex', flexDirection:'column',
      animation:'slide-in-right 250ms ease',
      zIndex:50,
      boxShadow:'-8px 0 40px rgba(0,0,0,0.6)',
    }}>
      {/* Header */}
      <div style={{
        padding:'var(--space-5)',
        borderBottom:'1px solid var(--color-border)',
        background:'var(--color-surface-2)',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9,
            color:'var(--color-text-faint)', letterSpacing:'0.14em' }}>
            ENTITY / {object.label.toUpperCase()}
          </span>
          <button onClick={onClose} style={{
            background:'none', border:'none', color:'var(--color-text-faint)',
            cursor:'pointer', fontSize:18, lineHeight:1, padding:4,
          }}>✕</button>
        </div>

        <h2 style={{
          fontFamily:'var(--font-display)', fontSize:22, fontWeight:700,
          color:'var(--color-primary)', marginBottom:4,
        }}>
          {objectMeta?.name ?? object.name ?? object.label}
        </h2>

        {object.backstory && (
          <p style={{ fontSize:11, color:'var(--color-text-muted)', fontStyle:'italic',
            lineHeight:1.6, marginBottom:10,
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
          }}>
            {object.backstory}
          </p>
        )}

        {/* Status + Talk button */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:4 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{
              width:7, height:7, borderRadius:'50%', background:statusColor,
              animation:(status==='speaking'||status==='thinking') ? 'breathe 1s ease infinite' : 'none',
            }}/>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9,
              color:'var(--color-text-faint)', letterSpacing:'0.1em' }}>
              {statusLabel}
            </span>
          </div>

          {/* THE TALK BUTTON */}
          {!started ? (
            <button onClick={handleTalk} style={{
              background:'var(--color-primary)', border:'none',
              borderRadius:'var(--radius-md)',
              padding:'var(--space-2) var(--space-5)',
              color:'#111', fontWeight:700, fontSize:13,
              cursor:'pointer', fontFamily:'var(--font-body)',
              letterSpacing:'0.02em',
              animation:'breathe 2s ease infinite',
            }}>
              ▶ TALK TO IT
            </button>
          ) : (
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9,
              color:'var(--color-text-faint)', letterSpacing:'0.1em' }}>
              SESSION ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto',
        padding:'var(--space-4) var(--space-5)',
        display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>

        {!started && (
          <div style={{
            textAlign:'center', paddingTop:'var(--space-8)',
            color:'var(--color-text-faint)',
            fontFamily:'var(--font-mono)', fontSize:10, lineHeight:2.2, letterSpacing:'0.06em',
          }}>
            // ENTITY DORMANT<br/>
            // PRESS TALK TO WAKE IT
          </div>
        )}

        {started && messages.length === 0 && status === 'connecting' && (
          <div style={{
            textAlign:'center', paddingTop:'var(--space-8)',
            color:'var(--color-text-faint)',
            fontFamily:'var(--font-mono)', fontSize:10, lineHeight:2.2, letterSpacing:'0.06em',
          }}>
            // ESTABLISHING LINK…
          </div>
        )}

        {started && messages.length === 0 && status === 'ready' && (
          <div style={{
            textAlign:'center', paddingTop:'var(--space-8)',
            color:'var(--color-text-faint)',
            fontFamily:'var(--font-mono)', fontSize:10, lineHeight:2.2, letterSpacing:'0.06em',
          }}>
            // ENTITY AWAITING INPUT<br/>
            // SAY SOMETHING
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%', animation:'fade-up 150ms ease',
          }}>
            <div style={{
              padding:'var(--space-3) var(--space-4)',
              borderRadius: m.role === 'user'
                ? 'var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)'
                : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px',
              background: m.role === 'user'
                ? 'var(--color-surface-offset)'
                : 'var(--color-primary-dim)',
              border: m.role === 'user'
                ? '1px solid var(--color-border)'
                : '1px solid rgba(232,136,58,0.25)',
              fontSize:'var(--text-sm)', lineHeight:1.6,
              fontFamily: m.role === 'assistant' ? 'var(--font-display)' : 'var(--font-body)',
              fontStyle: m.role === 'assistant' ? 'italic' : 'normal',
              color: m.role === 'user' ? 'var(--color-text-muted)' : 'var(--color-text)',
            }}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Input — only shown after TALK pressed */}
      {started && (
        <div style={{
          padding:'var(--space-4) var(--space-5)',
          borderTop:'1px solid var(--color-border)',
          display:'flex', gap:'var(--space-2)',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={isReady ? 'speak to it…' : 'connecting…'}
            disabled={!isReady}
            autoFocus
            style={{
              flex:1, background:'var(--color-surface-offset)',
              border:'1px solid var(--color-border)',
              borderRadius:'var(--radius-md)',
              padding:'var(--space-3) var(--space-4)',
              color:'var(--color-text)', fontSize:'var(--text-sm)',
              fontFamily:'var(--font-body)', outline:'none',
            }}
          />
          <button
            onMouseDown={startRecording} onMouseUp={stopRecording}
            onTouchStart={startRecording} onTouchEnd={stopRecording}
            disabled={!isReady}
            title="Hold to speak"
            style={{
              background: recording ? '#e85a5a' : 'var(--color-surface-offset)',
              border: recording ? '1px solid #e85a5a' : '1px solid var(--color-border)',
              borderRadius:'var(--radius-md)',
              padding:'var(--space-3) var(--space-4)',
              cursor: isReady ? 'pointer' : 'not-allowed',
              fontSize:16, transition:'all 0.15s ease',
              opacity: isReady ? 1 : 0.4,
              boxShadow: recording ? '0 0 12px rgba(232,90,90,0.5)' : 'none',
            }}>🎤</button>
          <button onClick={handleSend}
            disabled={!input.trim() || !isReady}
            style={{
              background:'var(--color-primary)', border:'none',
              borderRadius:'var(--radius-md)',
              padding:'var(--space-3) var(--space-4)',
              color:'#111', fontWeight:700, cursor:'pointer',
              fontSize:'var(--text-sm)',
              opacity: (!input.trim() || !isReady) ? 0.4 : 1,
              transition:'opacity var(--transition-interactive)',
            }}>→</button>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function App() {
  const { videoRef, status, resolution, start, stop, captureFrame } = useCamera();
  const [objects,      setObjects]      = useState([]);
  const [flash,        setFlash]        = useState(false);
  const [activeObject, setActiveObject] = useState(null);
  const [identifying,  setIdentifying]  = useState(false);
  const polling      = useRef(false);
  const timerRef     = useRef(null);
  const containerRef = useRef(null);

  const triggerFlash = () => { setFlash(true); setTimeout(() => setFlash(false), 120); };

  const handleObjectClick = useCallback(async (obj) => {
    triggerFlash();
    setIdentifying(true);
    try {
      const canvas = captureFrame();
      if (canvas) {
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.7));
        const form = new FormData();
        form.append('file', blob, 'frame.jpg');
        form.append('x1', obj.box.x1);
        form.append('y1', obj.box.y1);
        form.append('x2', obj.box.x2);
        form.append('y2', obj.box.y2);
        const res  = await fetch(`${BACKEND}/vision/identify`, { method: 'POST', body: form });
        const data = await res.json();
        if (data.matched_label) {
          setActiveObject({ ...obj, label: data.matched_label, name: data.name });
          return;
        }
      }
    } catch {}
    finally { setIdentifying(false); }
    setActiveObject(obj);
  }, [captureFrame]);

  useEffect(() => {
    if (status !== 'live') { clearInterval(timerRef.current); return; }

    timerRef.current = setInterval(async () => {
      if (polling.current) return;
      polling.current = true;
      const canvas = captureFrame();
      if (!canvas) { polling.current = false; return; }
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.6));
      const form = new FormData();
      form.append('file', blob, 'frame.jpg');
      try {
        const res  = await fetch(`${BACKEND}/live/detect`, { method:'POST', body:form });
        const data = await res.json();
        setObjects(data.all_objects ?? []);
      } catch {}
      finally { polling.current = false; }
    }, LIVE_MS);

    return () => { clearInterval(timerRef.current); polling.current = false; };
  }, [status, captureFrame]);

  return (
    <div style={{ display:'grid', gridTemplateRows:'auto 1fr', minHeight:'100dvh', background:'var(--color-bg)' }}>
      <header style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'var(--space-3) var(--space-6)',
        borderBottom:'1px solid var(--color-divider)',
        background:'var(--color-surface)',
        zIndex:10, position:'relative',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
          <span style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700,
            color:'var(--color-primary)' }}>Sentient</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9,
            color:'var(--color-text-faint)', letterSpacing:'0.12em' }}>BEARHACKS 2026</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-4)' }}>
          <Link to="/objects" style={{
            fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-text-faint)',
            textDecoration:'none', letterSpacing:'0.08em',
            borderBottom:'1px solid var(--color-border)', paddingBottom:2,
          }}>OBJECT LIBRARY →</Link>
          {identifying && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              color: 'var(--color-primary)', letterSpacing: '0.12em',
              animation: 'blink 0.7s step-start infinite',
            }}>IDENTIFYING…</span>
          )}
          <StatusDot status={status}/>
        </div>
      </header>

      <main style={{
        display:'flex', alignItems:'flex-start', justifyContent:'center',
        padding:'var(--space-5)', background:'var(--color-bg)',
      }}>
        <div ref={containerRef} style={{
          position:'relative', width:'100%', maxWidth:860, height:'65vh',
          borderRadius:'var(--radius-lg)', overflow:'hidden',
          border:'1px solid var(--color-border)',
          boxShadow:'0 8px 40px rgba(0,0,0,0.5)',
        }}>
          <video ref={videoRef} autoPlay playsInline muted
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>

          {status === 'live' && (
            <LiveCanvas
              videoRef={videoRef}
              objects={objects}
              onClickObject={handleObjectClick}
            />
          )}

          <div style={{
            position:'absolute', inset:0, background:'white',
            opacity: flash ? 0.35 : 0, pointerEvents:'none',
            transition:'opacity 60ms ease',
          }}/>

          {/* HUD corners */}
          {[
            {top:16, left:16,  borderWidth:'2px 0 0 2px', borderRadius:'4px 0 0 0'},
            {top:16, right:16, borderWidth:'2px 2px 0 0', borderRadius:'0 4px 0 0'},
            {bottom:16, left:16,  borderWidth:'0 0 2px 2px', borderRadius:'0 0 0 4px'},
            {bottom:16, right:16, borderWidth:'0 2px 2px 0', borderRadius:'0 0 4px 0'},
          ].map((c, i) => (
            <span key={i} style={{
              position:'absolute', width:24, height:24, ...c,
              borderStyle:'solid', borderColor:'var(--color-primary)', opacity:0.45,
            }}/>
          ))}

          {objects.length > 0 && (
            <div style={{
              position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)',
              fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-primary)',
              background:'rgba(17,17,16,0.85)', border:'1px solid rgba(232,136,58,0.3)',
              borderRadius:'var(--radius-full)', padding:'5px 16px',
              letterSpacing:'0.1em', backdropFilter:'blur(8px)',
              animation:'breathe 2s ease infinite',
            }}>
              ● {objects.length} {objects.length === 1 ? 'ENTITY' : 'ENTITIES'} DETECTED — CLICK TO CONVERSE
            </div>
          )}

          {status !== 'live' && status !== 'requesting' && (
            <div style={{
              position:'absolute', inset:0, display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center', gap:'var(--space-5)',
              background:'rgba(17,17,16,0.75)', backdropFilter:'blur(6px)',
            }}>
              <span style={{ fontFamily:'var(--font-display)', fontSize:36,
                color:'var(--color-primary)', fontStyle:'italic', textAlign:'center' }}>
                wake them up
              </span>
              <button onClick={start} style={{
                padding:'var(--space-3) var(--space-8)',
                background:'var(--color-primary)', border:'none',
                borderRadius:'var(--radius-md)', color:'#111',
                fontWeight:700, fontSize:'var(--text-base)', cursor:'pointer',
                fontFamily:'var(--font-body)',
              }}>▷ Start Camera</button>
            </div>
          )}

          {status === 'live' && (<>
            <button onClick={stop} style={{
              position:'absolute', top:16, right:16,
              background:'rgba(17,17,16,0.85)', border:'1px solid var(--color-border)',
              borderRadius:'var(--radius-sm)', padding:'4px 10px',
              color:'var(--color-text-faint)', cursor:'pointer',
              fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.1em',
            }}>◼ STOP</button>
            <button onClick={() => containerRef.current?.requestFullscreen()} style={{
              position:'absolute', bottom:16, right:16,
              background:'rgba(17,17,16,0.85)', border:'1px solid var(--color-border)',
              borderRadius:'var(--radius-sm)', padding:'4px 10px',
              color:'var(--color-text-faint)', cursor:'pointer',
              fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.1em',
            }}>⛶ FULL</button>
          </>)}
        </div>
      </main>

      {activeObject && (
        <ConversationDrawer
          object={activeObject}
          onClose={() => setActiveObject(null)}
        />
      )}
    </div>
  );
}