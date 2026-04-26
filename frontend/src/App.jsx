import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCamera } from './hooks/useCamera';
import { useConversation } from './hooks/useConversation';
import {
  WindowsXPMyComputer,
  WindowsXPMovieMaker,
  WindowsXPFolderOpen,
  WindowsXPCamera,
  WindowsXPMagnify,
  WindowsXPUsers,
  WindowsXPSound,
  WindowsXPLogOff,
  WindowsXPDiskDefragmenter,
  WindowsXPConfiguration,
  WindowsXPMyDocuments,
  WindowsXPMail,
  AdministrativeToolsXP,
  MSNMessenger,
} from 'react-old-icons';

const BACKEND = 'http://localhost:8000';
const LIVE_MS = 2000;

const XP = {
  titleBarGrad: 'linear-gradient(180deg, #1f8dd6 0%, #2563b0 4%, #1957a5 8%, #1a5ca8 50%, #1855a3 92%, #1650a0 96%, #1048a0 100%)',
  titleBarText: '#ffffff',
  titleBarShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
  windowBorder: '#0055e5',
  windowBg: '#ece9d8',
  windowInner: '#ffffff',
  windowShadow: '2px 2px 0 #7b7b7b, 4px 4px 0 #555, inset -1px -1px 0 #888',
  btnBg: 'linear-gradient(180deg, #f8f8f8 0%, #e4e0d0 100%)',
  btnBorder: '#7f9db9',
  btnActive: 'linear-gradient(180deg, #d4cebf 0%, #e8e4d4 100%)',
  btnHoverBorder: '#316ac5',
  taskbarBg: 'linear-gradient(180deg, #2b7dd8 0%, #1e5fb4 50%, #1851a3 100%)',
  textDark: '#000000',
  textMid: '#4a4848',
  textBlue: '#063289',
  textLink: '#0000cc',
  fieldBg: '#ffffff',
  fieldBorder: '#7f9db9',
  fieldBorderFocus: '#316ac5',
  statusRed: '#cc0000',
  statusGreen: '#008000',
  statusYellow: '#ccaa00',
  statusGray: '#808080',
  bgPattern: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='2' height='2' fill='%23d4d0c8' opacity='0.5'/%3E%3C/svg%3E")`,
};

const depthColor = d => {
  if (d == null) return '#316ac5';
  if (d > 0.75)  return '#cc0000';
  if (d > 0.5)   return '#ccaa00';
  if (d > 0.25)  return '#008000';
  return '#316ac5';
};

// ── Shared icon wrapper — keeps icons crisp at any size ───────────────────
function OldIcon({ Icon, size = 16, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1, ...style }}>
      <Icon size={size} />
    </span>
  );
}

function XPWindow({ title, icon, children, style, onClose, resizable = false, titleExtra }) {
  return (
    <div style={{
      border: `2px solid ${XP.windowBorder}`,
      borderRadius: '8px 8px 4px 4px',
      boxShadow: '3px 3px 8px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.3)',
      background: XP.windowBg,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      ...style,
    }}>
      <div style={{
        background: XP.titleBarGrad,
        boxShadow: XP.titleBarShadow,
        padding: '3px 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 28, flexShrink: 0, userSelect: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {icon && <OldIcon Icon={icon} size={14} />}
          <span style={{
            color: XP.titleBarText, fontSize: 12, fontWeight: 700,
            fontFamily: 'Tahoma, "MS Sans Serif", sans-serif',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            letterSpacing: '0.01em',
          }}>{title}</span>
          {titleExtra}
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          <XPTitleBtn label="─" color="linear-gradient(180deg,#f8c860 0%,#e09820 100%)" hov="#ffd060" />
          {resizable && <XPTitleBtn label="□" color="linear-gradient(180deg,#80d840 0%,#40a820 100%)" hov="#a0f060" />}
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
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 21, height: 19,
        background: hovered ? hov : color,
        border: '1px solid rgba(0,0,0,0.4)', borderRadius: 3,
        color: '#fff', fontSize: 9, fontWeight: 900,
        fontFamily: 'Tahoma, sans-serif',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textShadow: '0 1px 1px rgba(0,0,0,0.6)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)', padding: 0,
      }}
    >{label}</button>
  );
}

function XPButton({ children, onClick, disabled, style, primary }) {
  const [hov, setHov] = useState(false);
  const [act, setAct] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setAct(false); }}
      onMouseDown={() => setAct(true)}
      onMouseUp={() => setAct(false)}
      style={{
        background: act
          ? XP.btnActive
          : primary
            ? 'linear-gradient(180deg, #5ba8f8 0%, #2060d0 50%, #1850c0 100%)'
            : hov ? 'linear-gradient(180deg,#fff 0%,#e8e4d8 100%)' : XP.btnBg,
        border: hov || primary ? `1px solid ${XP.btnHoverBorder}` : `1px solid ${XP.btnBorder}`,
        borderRadius: 3,
        color: primary ? '#fff' : XP.textDark,
        fontFamily: 'Tahoma, "MS Sans Serif", sans-serif',
        fontSize: 11, fontWeight: primary ? 700 : 400,
        padding: '3px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        boxShadow: act
          ? 'inset 1px 1px 2px rgba(0,0,0,0.3)'
          : 'inset 0 1px 0 rgba(255,255,255,0.7), 1px 1px 0 rgba(0,0,0,0.15)',
        minWidth: 75, display: 'flex', alignItems: 'center', gap: 4,
        ...style,
      }}
    >{children}</button>
  );
}

function XPStatusBar({ status }) {
  const cfg = {
    idle:       { c: XP.statusGray,   label: 'Standby' },
    requesting: { c: XP.statusYellow, label: 'Initialising...', blink: true },
    live:       { c: XP.statusGreen,  label: 'Live' },
    error:      { c: XP.statusRed,    label: 'Error' },
  }[status] ?? { c: XP.statusGray, label: 'Standby' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', fontSize: 11, color: XP.textDark }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.c, boxShadow: `0 0 4px ${cfg.c}`, animation: cfg.blink ? 'blink 0.8s step-start infinite' : 'none' }}/>
      {cfg.label}
    </div>
  );
}

function XPInput({ value, onChange, onKeyDown, placeholder, disabled, autoFocus, highlighted }) {
  return (
    <input
      value={value} onChange={onChange} onKeyDown={onKeyDown}
      placeholder={placeholder} disabled={disabled} autoFocus={autoFocus}
      style={{
        flex: 1,
        background: XP.fieldBg,
        border: highlighted ? `2px inset ${XP.fieldBorderFocus}` : `2px inset ${XP.fieldBorder}`,
        borderRadius: 0, padding: '3px 6px',
        fontSize: 11, fontFamily: 'Tahoma, "MS Sans Serif", sans-serif',
        color: XP.textDark, outline: 'none',
        boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.2)',
      }}
    />
  );
}

function XPSunken({ children, style }) {
  return (
    <div style={{
      border: `2px inset ${XP.fieldBorder}`,
      background: '#000',
      boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.4)',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Object Monitor feed panel ─────────────────────────────────────────────────
function ObjectFeedPanel({ allObjects, liveObjects, feedLog, objectMessages, activeLabel }) {
  const liveSet  = new Set(liveObjects.map(o => o.label));
  const logEndRef = useRef(null);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [feedLog]);

  const onlineObjs  = liveObjects;
  const offlineObjs = allObjects.filter(o => !liveSet.has(o.yolo_label));

  return (
    <XPWindow title="Object Monitor" icon={MSNMessenger} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {/* Status strip */}
      <div style={{ background: '#d4d0c8', borderBottom: '1px solid #808080', borderTop: '1px solid #fff', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Tahoma, sans-serif', fontSize: 10, flexShrink: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: liveObjects.length > 0 ? XP.statusGreen : XP.statusGray, boxShadow: liveObjects.length > 0 ? '0 0 5px #00cc00' : 'none', display: 'inline-block' }}/>
        <span style={{ color: XP.textDark }}>{liveObjects.length} online · {allObjects.length} registered</span>
      </div>

      {/* Contact list */}
      <div style={{ flex: 1, overflowY: 'auto', background: XP.windowInner, fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', fontSize: 11 }}>
        {/* Online section */}
        <div style={{ background: 'linear-gradient(180deg,#e0ecf8 0%,#ccdcf0 100%)', borderBottom: '1px solid #b0c4dc', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#1a3a6a' }}>Online ({onlineObjs.length})</span>
        </div>

        {onlineObjs.length === 0 && (
          <div style={{ padding: '10px 8px', fontSize: 10, color: XP.textMid, fontStyle: 'italic', textAlign: 'center' }}>
            <OldIcon Icon={WindowsXPMagnify} size={18} style={{ margin: '0 auto 4px' }} /><br />
            Scanning for objects…
          </div>
        )}

        {onlineObjs.map(obj => {
          const lastMsg = objectMessages[obj.label];
          const isActive = activeLabel === obj.label;
          return (
            <div key={obj.label} style={{ padding: '5px 8px 6px', borderBottom: '1px solid #eceae6', background: isActive ? '#dce8f8' : 'transparent', transition: 'background 150ms' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: XP.statusGreen, boxShadow: '0 0 6px #00cc00', animation: 'onlinePulse 2s ease-in-out infinite', flexShrink: 0 }}/>
                <OldIcon Icon={WindowsXPUsers} size={13} />
                <span style={{ fontWeight: 700, color: XP.textDark, fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{obj.name || obj.label}</span>
                {isActive && <span style={{ fontSize: 9, color: '#000080', flexShrink: 0 }}>💬</span>}
              </div>
              {lastMsg?.role === 'assistant' && (
                <div style={{ marginLeft: 20, marginTop: 3, background: '#fffde7', border: '1px solid #c8b400', borderRadius: '0 5px 5px 5px', padding: '3px 7px', fontSize: 10, color: XP.textDark, fontStyle: 'italic', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {lastMsg.text}
                </div>
              )}
              {isActive && !lastMsg && (
                <div style={{ marginLeft: 20, marginTop: 3, fontSize: 10, color: XP.textMid, animation: 'blink 1s step-start infinite' }}>typing…</div>
              )}
            </div>
          );
        })}

        {/* Offline section */}
        {offlineObjs.length > 0 && <>
          <div style={{ background: '#e8e4e0', borderBottom: '1px solid #c8c4c0', borderTop: '1px solid #f0eee8', padding: '2px 8px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: XP.textMid }}>Offline ({offlineObjs.length})</span>
          </div>
          {offlineObjs.map(obj => (
            <div key={obj.yolo_label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderBottom: '1px solid #eeecec', opacity: 0.6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#808080', flexShrink: 0 }}/>
              <OldIcon Icon={WindowsXPUsers} size={13} style={{ opacity: 0.5 }} />
              <span style={{ color: XP.textMid, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{obj.name || obj.yolo_label}</span>
            </div>
          ))}
        </>}

        {allObjects.length === 0 && liveObjects.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: XP.textMid, fontSize: 11 }}>
            <OldIcon Icon={WindowsXPLogOff} size={24} style={{ margin: '0 auto 6px' }} /><br />
            No objects registered
          </div>
        )}
      </div>

      {/* Green terminal event log */}
      <div style={{ background: '#060a06', borderTop: '2px inset #7f9db9', padding: '4px 6px', height: 130, overflowY: 'auto', fontFamily: '"Courier New", Courier, monospace', fontSize: 9, lineHeight: 1.65, flexShrink: 0 }}>
        <div style={{ color: '#00aa00', marginBottom: 2, fontSize: 8, letterSpacing: '0.05em' }}>C:\SENTIENT\EVENTS.LOG</div>
        {feedLog.length === 0
          ? <div style={{ color: '#004400' }}>_</div>
          : feedLog.map(e => (
            <div key={e.id} style={{ color: e.type === 'online' ? '#00ff41' : '#ff5050' }}>
              <span style={{ color: '#555' }}>[{e.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
              {' '}{e.type === 'online' ? '+' : '-'} {e.name}
            </div>
          ))
        }
        <div ref={logEndRef}/>
      </div>

      {/* Scrolling ticker */}
      <div style={{ background: XP.taskbarBg, borderTop: '1px solid rgba(0,0,0,0.3)', overflow: 'hidden', height: 18, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <div style={{ whiteSpace: 'nowrap', animation: 'marquee 22s linear infinite', fontFamily: 'Tahoma, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.75)', paddingLeft: '100%' }}>
          Sentient v2.0 — BearHacks 2026 — Object AI system nominal — Vision API active — Backboard agents online — All entities reporting — System status: OK — Sentient v2.0 — BearHacks 2026
        </div>
      </div>
    </XPWindow>
  );
}

function LiveCanvas({ videoRef, objects, onClickObject }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video || video.readyState < 2) { animRef.current = requestAnimationFrame(draw); return; }
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
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = dc; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, bw, bh);
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y + 2, bw - 4, bh - 4);
      const tag = name || label;
      ctx.font = `bold 12px Tahoma, sans-serif`;
      const tw = ctx.measureText(tag).width;
      ctx.fillStyle = '#ffffe1';
      ctx.fillRect(x, y - 22, tw + 12, 19);
      ctx.strokeStyle = '#000080'; ctx.lineWidth = 1; ctx.setLineDash([]);
      ctx.strokeRect(x, y - 22, tw + 12, 19);
      ctx.fillStyle = '#000000';
      ctx.fillText(tag, x + 6, y - 8);
      ctx.font = `10px Tahoma, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,225,0.9)';
      ctx.fillText(`${Math.round(conf * 100)}%`, x + 4, y + bh + 14);
      ctx.font = `9px Tahoma, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,225,0.85)';
      const hint = '[ CLICK TO TALK ]';
      const hw = ctx.measureText(hint).width;
      ctx.fillText(hint, x + bw / 2 - hw / 2, y + bh - 5);
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
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top)  / rect.height;
    const hit = objects.find(o => nx >= o.box.x1 && nx <= o.box.x2 && ny >= o.box.y1 && ny <= o.box.y2);
    if (hit) onClickObject(hit);
  }, [objects, onClickObject]);

  return <canvas ref={canvasRef} onClick={handleClick} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'crosshair' }} />;
}

function ConversationDrawer({ object, onClose, onNewMessage }) {
  const { connect, disconnect, send, messages, status, objectMeta, transcript, setTranscript, listening, startListening, stopListening, browserSRSupported } = useConversation(object?.label ?? '');
  const [started, setStarted] = useState(false);
  const bottomRef = useRef(null);
  const input = transcript;
  const setInput = setTranscript;

  useEffect(() => { return () => disconnect(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (messages.length > 0 && onNewMessage) {
      onNewMessage(object.label, messages[messages.length - 1]);
    }
  }, [messages]);

  const handleTalk = () => { setStarted(true); connect(); };
  const handleSend = () => {
    const t = input.trim();
    if (!t || status === 'thinking' || status === 'speaking') return;
    send(t.replace(/\s*\[.*\]$/, '').trim());
  };
  const handleMicToggle = () => {
    if (listening) {
      stopListening();
      setTimeout(() => {
        setTranscript(prev => {
          const clean = prev.replace(/\s*\[.*\]$/, '').trim();
          if (clean && status === 'ready') send(clean);
          return clean;
        });
      }, 400);
    } else { startListening(); }
  };

  if (!object) return null;
  const isReady = status === 'ready' || status === 'thinking' || status === 'speaking';
  const statusColor = { connecting: XP.statusYellow, ready: XP.statusGreen, thinking: XP.statusYellow, speaking: '#0000cc', error: XP.statusRed }[status] ?? XP.statusGray;
  const statusLabel = { idle: 'Offline', connecting: 'Connecting...', ready: 'Ready', thinking: 'Thinking...', speaking: 'Speaking...', error: 'Error' }[status] ?? 'Offline';

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, display: 'flex', flexDirection: 'column', zIndex: 50, animation: 'slide-in-right 200ms ease', background: XP.windowBg, borderLeft: `2px solid ${XP.windowBorder}`, boxShadow: '-4px 0 16px rgba(0,0,0,0.4)' }}>
      {/* Title bar */}
      <div style={{ background: XP.titleBarGrad, boxShadow: XP.titleBarShadow, padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 30, flexShrink: 0, userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <OldIcon Icon={MSNMessenger} size={15} />
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
            {objectMeta?.name ?? object.name ?? object.label} — Sentient Chat
          </span>
        </div>
        <XPTitleBtn label="✕" color="linear-gradient(180deg,#e84040 0%,#b81020 100%)" hov="#ff6060" onClick={onClose} />
      </div>

      {/* Object info */}
      <div style={{ padding: '8px 10px', background: '#d4d0c8', borderBottom: `1px solid #808080`, borderTop: `1px solid #fff` }}>
        <div style={{ background: XP.windowBg, border: `1px solid #808080`, borderRight: `1px solid #fff`, borderBottom: `1px solid #fff`, padding: '6px 8px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <OldIcon Icon={WindowsXPUsers} size={28} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Tahoma, sans-serif', color: XP.textDark }}>
              {objectMeta?.name ?? object.name ?? object.label}
            </div>
            <div style={{ fontSize: 10, fontFamily: 'Tahoma, sans-serif', color: XP.textMid, marginTop: 1 }}>
              Type: {object.label} &nbsp;|&nbsp; Conf: {Math.round((object.conf ?? 0) * 100)}%
            </div>
            {object.backstory && (
              <div style={{ fontSize: 10, fontFamily: 'Tahoma, sans-serif', color: XP.textMid, marginTop: 4, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {object.backstory}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 4px ${statusColor}`, animation: (status === 'thinking' || status === 'speaking') ? 'blink 0.8s step-start infinite' : 'none' }}/>
            <span style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 11, color: XP.textDark }}>{statusLabel}</span>
          </div>
          {!started
            ? <XPButton onClick={handleTalk} primary>▶ Connect</XPButton>
            : <span style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: XP.textMid }}>Session active</span>
          }
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', background: XP.windowInner, border: `2px inset ${XP.fieldBorder}`, margin: '6px 8px', padding: '6px 8px', fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6, boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.2)' }}>
        {!started && (
          <div style={{ color: XP.textMid, textAlign: 'center', paddingTop: 32, fontSize: 11, lineHeight: 2 }}>
            <OldIcon Icon={WindowsXPLogOff} size={32} style={{ margin: '0 auto 8px' }} /><br />
            Entity dormant.<br />Press <strong>Connect</strong> to wake it up.
          </div>
        )}
        {started && messages.length === 0 && status === 'connecting' && (
          <div style={{ color: XP.textMid, textAlign: 'center', paddingTop: 32 }}>
            <OldIcon Icon={WindowsXPDiskDefragmenter} size={28} style={{ margin: '0 auto 8px' }} /><br />Establishing link...
          </div>
        )}
        {started && messages.length === 0 && status === 'ready' && (
          <div style={{ color: XP.textMid, textAlign: 'center', paddingTop: 32 }}>
            <OldIcon Icon={MSNMessenger} size={28} style={{ margin: '0 auto 8px' }} /><br />Entity is ready. Say something!
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
            <div style={{ fontSize: 9, color: m.role === 'user' ? '#000080' : '#800000', fontWeight: 700, marginBottom: 2, paddingLeft: 2 }}>
              {m.role === 'user' ? 'You' : (objectMeta?.name ?? object.label)}:
            </div>
            <div style={{ background: m.role === 'user' ? '#dce8f8' : '#fffde7', border: m.role === 'user' ? '1px solid #7f9db9' : '1px solid #c8b400', borderRadius: m.role === 'user' ? '8px 8px 2px 8px' : '8px 8px 8px 2px', padding: '5px 9px', fontSize: 11, lineHeight: 1.55, color: XP.textDark, fontStyle: m.role === 'assistant' ? 'italic' : 'normal', boxShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {started && (
        <div style={{ padding: '4px 8px 8px', borderTop: `1px solid #808080`, background: '#d4d0c8', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {listening && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: XP.statusRed }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: XP.statusRed, animation: 'blink 0.5s step-start infinite', display: 'inline-block' }}/>
              {browserSRSupported ? 'Transcribing live...' : 'Recording...'}
            </div>
          )}
          <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
            <XPInput
              value={input.replace(/\s*\[.*\]$/, '')}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={isReady ? (listening ? 'Listening...' : 'Type or speak a message...') : 'Connecting...'}
              disabled={!isReady}
              autoFocus
              highlighted={listening}
            />
            <button
              onClick={handleMicToggle}
              disabled={!isReady}
              title={listening ? 'Stop recording' : 'Start voice input'}
              style={{ background: listening ? 'linear-gradient(180deg,#ff8080 0%,#cc2020 100%)' : XP.btnBg, border: `1px solid ${listening ? '#aa0000' : XP.btnBorder}`, borderRadius: 3, padding: '3px 8px', cursor: isReady ? 'pointer' : 'not-allowed', opacity: isReady ? 1 : 0.5, boxShadow: listening ? 'inset 1px 1px 2px rgba(0,0,0,0.4)' : 'inset 0 1px 0 rgba(255,255,255,0.7)', flexShrink: 0, display: 'flex', alignItems: 'center' }}
            >
              <OldIcon Icon={WindowsXPSound} size={14} />
            </button>
            <XPButton onClick={handleSend} disabled={!input.replace(/\s*\[.*\]$/, '').trim() || !isReady} primary style={{ minWidth: 60, flexShrink: 0 }}>
              Send
            </XPButton>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { videoRef, status, start, stop, captureFrame } = useCamera();
  const [objects,        setObjects]        = useState([]);
  const [allObjects,     setAllObjects]     = useState([]);
  const [feedLog,        setFeedLog]        = useState([]);
  const [objectMessages, setObjectMessages] = useState({});
  const [flash,          setFlash]          = useState(false);
  const [activeObject,   setActiveObject]   = useState(null);
  const [identifying,    setIdentifying]    = useState(false);
  const polling           = useRef(false);
  const timerRef          = useRef(null);
  const containerRef      = useRef(null);
  const prevLabelsRef     = useRef(new Set());

  // Fetch all registered objects (for the feed panel offline list)
  useEffect(() => {
    const load = () => fetch(`${BACKEND}/objects`).then(r => r.json()).then(d => setAllObjects(d.objects ?? [])).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Build event log from detection changes
  useEffect(() => {
    const prev = prevLabelsRef.current;
    const currMap = new Map(objects.map(o => [o.label, o]));
    const events = [];
    for (const [label, obj] of currMap) {
      if (!prev.has(label)) events.push({ id: `${Date.now()}-${label}`, time: new Date(), type: 'online',  label, name: obj.name || label });
    }
    for (const label of prev) {
      if (!currMap.has(label)) {
        const name = allObjects.find(o => o.yolo_label === label)?.name || label;
        events.push({ id: `${Date.now()}-${label}-off`, time: new Date(), type: 'offline', label, name });
      }
    }
    if (events.length > 0) setFeedLog(prev => [...prev, ...events].slice(-60));
    prevLabelsRef.current = new Set(objects.map(o => o.label));
  }, [objects]);

  const handleNewMessage = useCallback((label, msg) => {
    setObjectMessages(prev => ({ ...prev, [label]: msg }));
  }, []);

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
        form.append('x1', obj.box.x1); form.append('y1', obj.box.y1);
        form.append('x2', obj.box.x2); form.append('y2', obj.box.y2);
        const res  = await fetch(`${BACKEND}/vision/identify`, { method: 'POST', body: form });
        const data = await res.json();
        if (data.matched_label) { setActiveObject({ ...obj, label: data.matched_label, name: data.name }); return; }
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
        const res  = await fetch(`${BACKEND}/live/detect`, { method: 'POST', body: form });
        const data = await res.json();
        setObjects(data.all_objects ?? []);
      } catch {}
      finally { polling.current = false; }
    }, LIVE_MS);
    return () => { clearInterval(timerRef.current); polling.current = false; };
  }, [status, captureFrame]);

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', background: `${XP.bgPattern}, linear-gradient(180deg, #1f8dd6 0%, #3a9de6 8%, #58b0f0 12%, #3a9de6 100%)`, backgroundSize: '4px 4px, 100% 100%', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes slide-in-right{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes onlinePulse{0%,100%{box-shadow:0 0 3px #00cc00}50%{box-shadow:0 0 9px #00ff41,0 0 16px #00cc0066}}
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
      `}</style>

      {/* Taskbar */}
      <div style={{ background: XP.taskbarBg, padding: '2px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 32, flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Start button */}
          <div style={{ background: 'linear-gradient(180deg, #60d840 0%, #30a820 50%, #20881a 100%)', border: '1px solid #187010', borderRadius: 12, padding: '2px 12px 2px 8px', display: 'flex', alignItems: 'center', gap: 5, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)', cursor: 'pointer' }}>
            <OldIcon Icon={WindowsXPMyComputer} size={14} />
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, fontFamily: 'Tahoma, sans-serif', fontStyle: 'italic', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>start</span>
          </div>
          {/* App taskbar button */}
          <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.3)', borderRadius: 2, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <OldIcon Icon={WindowsXPMovieMaker} size={12} />
            <span style={{ color: '#fff', fontSize: 11, fontFamily: 'Tahoma, sans-serif', textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}>Sentient.exe</span>
          </div>
        </div>

        {/* System tray */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/objects" style={{ color: '#fff', fontSize: 11, fontFamily: 'Tahoma, sans-serif', textDecoration: 'none', textShadow: '1px 1px 1px rgba(0,0,0,0.5)', opacity: 0.9, display: 'flex', alignItems: 'center', gap: 4 }}>
            <OldIcon Icon={WindowsXPFolderOpen} size={12} /> Object Library
          </Link>
          {identifying && (
            <span style={{ color: '#ffe040', fontSize: 11, fontFamily: 'Tahoma, sans-serif', animation: 'blink 0.7s step-start infinite', display: 'flex', alignItems: 'center', gap: 4 }}>
              <OldIcon Icon={WindowsXPMagnify} size={12} /> Identifying...
            </span>
          )}
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, padding: '1px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <XPStatusBar status={status} />
          </div>
          <span style={{ color: '#fff', fontSize: 11, fontFamily: 'Tahoma, sans-serif', textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Desktop */}
      <main style={{ flex: 1, minHeight: 0, display: 'flex', gap: 10, padding: '10px 14px', alignItems: 'stretch', overflow: 'hidden' }}>
        {/* Left: Object Monitor */}
        <div style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <ObjectFeedPanel
            allObjects={allObjects}
            liveObjects={objects}
            feedLog={feedLog}
            objectMessages={objectMessages}
            activeLabel={activeObject?.label}
          />
        </div>

        {/* Right: Camera window */}
        <XPWindow
          title="00.sentient.org"
          icon={WindowsXPMovieMaker}
          resizable
          style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          titleExtra={
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'Tahoma, sans-serif', marginLeft: 8 }}>
              {status === 'live' ? `● ${objects.length} object(s) detected` : ''}
            </span>
          }
        >
          {/* Toolbar */}
          <div style={{ background: '#d4d0c8', borderBottom: '1px solid #808080', padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <XPButton onClick={status === 'live' ? stop : start} primary={status !== 'live'}>
              {status === 'live' ? '⏹ Stop' : '▶ Start Camera'}
            </XPButton>
            {status === 'live' && (
              <XPButton onClick={() => containerRef.current?.requestFullscreen()}>⛶ Full Screen</XPButton>
            )}
            <div style={{ marginLeft: 8, height: 18, borderLeft: '1px solid #808080', borderRight: '1px solid #fff' }}/>
            <span style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: XP.textMid }}>
              Click on a detected object to start a conversation
            </span>
          </div>

          {/* Video */}
          <div ref={containerRef} style={{ position: 'relative', margin: '0 6px 6px', flex: 1, minHeight: 0, background: '#000', border: '2px inset #7f9db9', boxShadow: 'inset 1px 1px 4px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {status === 'live' && <LiveCanvas videoRef={videoRef} objects={objects} onClickObject={handleObjectClick} />}

            {/* Flash */}
            <div style={{ position: 'absolute', inset: 0, background: 'white', opacity: flash ? 0.4 : 0, pointerEvents: 'none', transition: 'opacity 60ms ease' }}/>

            {/* Start prompt */}
            {status !== 'live' && status !== 'requesting' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(0,0,0,0.6)' }}>
                <OldIcon Icon={WindowsXPCamera} size={48} />
                <span style={{ color: '#fff', fontFamily: 'Tahoma, sans-serif', fontSize: 13 }}>Camera not started</span>
              </div>
            )}

            {/* HUD */}
            {status === 'live' && objects.length > 0 && (
              <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(17,17,16,0.8)', border: '1px solid #7f9db9', padding: '2px 8px', fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: '#ffffe1', backdropFilter: 'blur(4px)' }}>
                {objects.length} ENTITIES DETECTED — CLICK TO CONVERSE
              </div>
            )}
          </div>

          {/* Status bar */}
          <div style={{ background: '#d4d0c8', borderTop: '1px solid #fff', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, fontFamily: 'Tahoma, sans-serif', color: XP.textMid }}>
            <XPStatusBar status={status} />
            <span style={{ marginLeft: 'auto' }}>Sentient v2.0 · BearHacks 2026</span>
          </div>
        </XPWindow>
      </main>

      {activeObject && <ConversationDrawer object={activeObject} onClose={() => setActiveObject(null)} onNewMessage={handleNewMessage} />}
    </div>
  );
}