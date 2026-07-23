import { useEffect, useRef } from 'react';
import {
  WindowsXPUsers,
  WindowsXPSound,
  WindowsXPDiskDefragmenter,
  WindowsXPMail,
  MSNMessenger,
} from 'react-old-icons';
import { useConversation } from '../hooks/useConversation';
import { XP, OldIcon, XPTitleBtn, XPButton, XPInput } from './xp';
import { ZoomedCanvas } from './ZoomedCanvas';

export function MeetingPanel({ object, box, onClose, onNewMessage, videoRef, panelIndex }) {
  const {
    connect, disconnect, send, stopSpeaking, messages, status, objectMeta,
    transcript, setTranscript, listening, startListening, stopListening, browserSRSupported,
  } = useConversation(object?.label ?? '');
  const bottomRef = useRef(null);

  useEffect(() => { connect(); return () => disconnect(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    if (messages.length > 0 && onNewMessage) onNewMessage(object.label, messages[messages.length - 1]);
  }, [messages]);

  const handleSend = () => {
    const t = (transcript ?? '').replace(/\s*\[.*\]$/, '').trim();
    if (!t || status === 'thinking') return;
    if (status === 'speaking') stopSpeaking();   // interrupt TTS, then send
    send(t);
    setTranscript('');
  };
  const handleMicToggle = () => {
    if (listening) {
      stopListening();
      // Clean up interim brackets; user reviews the text then presses Send/Enter
      setTimeout(() => {
        setTranscript(prev => (prev ?? '').replace(/\s*\[.*\]$/, '').trim());
      }, 300);
    } else {
      startListening();
    }
  };

  if (!object) return null;
  const isReady   = status === 'ready' || status === 'thinking' || status === 'speaking';
  const speaking  = status === 'speaking';
  const isDetected = box != null;
  const rightOffset = panelIndex === 0 ? 0 : 344;

  const statusColor = { connecting: XP.statusYellow, ready: XP.statusGreen, thinking: XP.statusYellow, speaking: '#0000cc', error: XP.statusRed }[status] ?? XP.statusGray;
  const statusLabel = { idle: 'Offline', connecting: 'Connecting...', ready: 'Ready', thinking: 'Thinking...', speaking: 'Speaking...', error: 'Error' }[status] ?? 'Offline';
  const displayName = objectMeta?.name ?? object.name ?? object.label;

  return (
    <div style={{
      position: 'fixed', top: 32, right: rightOffset, bottom: 0, width: 340,
      display: 'flex', flexDirection: 'column', zIndex: 50,
      background: XP.windowBg,
      border: `2px solid ${XP.windowBorder}`, borderBottom: 'none',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
      animation: 'slide-in-right 200ms ease',
    }}>
      {/* Title bar */}
      <div style={{ background: XP.titleBarGrad, boxShadow: XP.titleBarShadow, padding: '3px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 28, flexShrink: 0, userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
          <OldIcon Icon={MSNMessenger} size={14} />
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', textShadow: '1px 1px 2px rgba(0,0,0,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName} — Sentient Chat
          </span>
          {isDetected && (
            <span style={{ background: '#00cc00', color: '#fff', fontSize: 8, fontFamily: 'Tahoma, sans-serif', padding: '1px 4px', borderRadius: 2, marginLeft: 2, fontWeight: 700, flexShrink: 0 }}>LIVE</span>
          )}
        </div>
        <XPTitleBtn label="✕" color="linear-gradient(180deg,#e84040 0%,#b81020 100%)" hov="#ff6060" onClick={onClose} />
      </div>

      {/* Zoomed video participant view */}
      <div style={{ flexShrink: 0, height: 160, background: '#000', position: 'relative', border: '2px inset #7f9db9', margin: '4px 4px 0', overflow: 'hidden' }}>
        {status === 'connecting' ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#030a03' }}>
            <OldIcon Icon={MSNMessenger} size={32} />
            <OldIcon Icon={WindowsXPMail} size={20} style={{ opacity: 0.6 }} />
            <span style={{ color: '#00cc00', fontSize: 10, fontFamily: '"Courier New", Courier, monospace', letterSpacing: '0.05em' }}>Waking up {displayName}...</span>
            <div style={{ width: '80%', height: 14, background: '#001100', border: '2px inset #7f9db9', overflow: 'hidden', borderRadius: 1 }}>
              <div style={{ height: '100%', background: 'repeating-linear-gradient(90deg,#00cc00 0px,#00cc00 10px,#004400 10px,#004400 14px)', animation: 'progressBar 0.8s linear infinite', width: '200%' }} />
            </div>
          </div>
        ) : box ? (
          <ZoomedCanvas videoRef={videoRef} box={box} speaking={speaking} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#111' }}>
            <OldIcon Icon={WindowsXPUsers} size={28} style={{ opacity: 0.4 }} />
            <span style={{ color: '#555', fontSize: 10, fontFamily: 'Tahoma, sans-serif' }}>NOT IN FRAME</span>
          </div>
        )}
      </div>

      {/* Info strip */}
      <div style={{ background: '#d4d0c8', borderBottom: '1px solid #808080', borderTop: '1px solid #fff', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 5px ${statusColor}`, animation: (status === 'thinking' || status === 'speaking') ? 'blink 0.8s step-start infinite' : 'none', flexShrink: 0 }}/>
        <OldIcon Icon={speaking ? WindowsXPSound : status === 'thinking' ? WindowsXPDiskDefragmenter : WindowsXPUsers} size={12} />
        <span style={{ fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', fontSize: 11, color: XP.textDark, flex: 1, fontWeight: speaking ? 700 : 400 }}>{statusLabel}</span>
        {speaking && (
          <button onClick={stopSpeaking} title="Stop speaking" style={{ background: 'linear-gradient(180deg,#f8f8f8 0%,#d8d4c4 100%)', border: '1px outset #808080', borderRadius: 2, padding: '1px 6px', fontSize: 10, fontFamily: 'Tahoma, sans-serif', cursor: 'pointer' }}>
            ⏹ Stop
          </button>
        )}
        {!speaking && <span style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: XP.textMid }}>{Math.round((object.conf ?? 0) * 100)}%</span>}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', background: XP.windowInner, border: `2px inset ${XP.fieldBorder}`, margin: '4px 4px 0', padding: '5px 7px', fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 5, boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.2)' }}>
        {messages.length === 0 && status === 'connecting' && (
          <div style={{ color: XP.textMid, textAlign: 'center', paddingTop: 24, fontSize: 11 }}>
            <OldIcon Icon={WindowsXPDiskDefragmenter} size={28} style={{ margin: '0 auto 8px', animation: 'blink 1.5s step-start infinite' }} /><br />
            Connecting to <strong>{displayName}</strong>...
          </div>
        )}
        {messages.length === 0 && isReady && (
          <div style={{ color: XP.textMid, textAlign: 'center', paddingTop: 24, fontSize: 11 }}>
            <OldIcon Icon={WindowsXPMail} size={28} style={{ margin: '0 auto 8px' }} /><br />
            <span style={{ fontWeight: 700 }}>{displayName}</span> is ready to chat!<br />
            <span style={{ fontSize: 10 }}>Type below or press the mic button 🎤</span>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '95%' }}>
            <div style={{ fontSize: 10, color: m.role === 'user' ? '#000080' : '#7a3000', fontWeight: 700, marginBottom: 2, paddingLeft: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
              {m.role === 'user'
                ? <><OldIcon Icon={WindowsXPUsers} size={11} /> You</>
                : <><OldIcon Icon={WindowsXPMail} size={11} /> {displayName}</>}
            </div>
            <div style={{ background: m.role === 'user' ? '#dce8f8' : '#fffde7', border: m.role === 'user' ? '2px outset #a0b8d0' : '2px outset #c8b400', borderRadius: m.role === 'user' ? '10px 10px 3px 10px' : '10px 10px 10px 3px', padding: '8px 12px', fontSize: 13, lineHeight: 1.65, color: XP.textDark, boxShadow: '2px 2px 4px rgba(0,0,0,0.15)' }}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '4px 4px 6px', borderTop: `1px solid #808080`, background: '#d4d0c8', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        {listening && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', fontSize: 10, color: XP.statusRed, background: '#fff0f0', border: '1px inset #cc8888', padding: '2px 6px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: XP.statusRed, animation: 'blink 0.4s step-start infinite', display: 'inline-block', flexShrink: 0 }}/>
            <OldIcon Icon={WindowsXPSound} size={11} />
            {browserSRSupported ? '🎤 Listening — speak now, then press Send' : '🎤 Recording… press mic again to stop'}
          </div>
        )}
        <div style={{ display: 'flex', gap: 3, alignItems: 'stretch' }}>
          <XPInput
            value={(transcript ?? '').replace(/\s*\[.*\]$/, '')}
            onChange={e => setTranscript(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={listening ? 'Listening… speak now' : isReady ? 'Type a message and press Send…' : 'Connecting…'}
            disabled={false}
            highlighted={listening}
            style={{ flex: 1, fontSize: 13 }}
          />
          <button
            onClick={handleMicToggle}
            title={listening ? 'Stop recording' : 'Speak your message'}
            style={{ background: listening ? 'linear-gradient(180deg,#ff8080 0%,#cc2020 100%)' : XP.btnBg, border: `2px solid ${listening ? '#aa0000' : XP.btnBorder}`, borderRadius: 3, padding: '5px 10px', cursor: 'pointer', boxShadow: listening ? 'inset 1px 1px 2px rgba(0,0,0,0.4)' : 'inset 0 1px 0 rgba(255,255,255,0.7)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}
          >
            <OldIcon Icon={WindowsXPSound} size={15} />
            <span style={{ fontSize: 11, fontFamily: 'Tahoma, sans-serif', color: listening ? '#fff' : XP.textDark }}>{listening ? 'Stop' : '🎤'}</span>
          </button>
          <XPButton onClick={handleSend} disabled={!(transcript ?? '').replace(/\s*\[.*\]$/, '').trim() || !isReady} primary style={{ minWidth: 64, flexShrink: 0, fontSize: 12, padding: '5px 12px' }}>
            Send ↵
          </XPButton>
        </div>
      </div>
    </div>
  );
}
