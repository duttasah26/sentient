import { useState, useEffect, useRef } from 'react';
import { WindowsXPUsers, WindowsXPLogOff, MSNMessenger } from 'react-old-icons';
import { useConversation } from '../../hooks/useConversation';
import { XP, OldIcon, XPWindow, XPButton, XPInput, XPSunken } from '../xp';
import { VOICE_NAMES } from './voices';

export function ConversationModal({ object, onClose }) {
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
          <XPInput value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder={isReady ? 'Type a message…' : 'Connecting...'} disabled={!isReady} style={{ width: '100%', fontSize: 11 }} />
          <XPButton onClick={handleSend} disabled={!input.trim() || !isReady} primary style={{ minWidth: 60, flexShrink: 0 }}>Send</XPButton>
        </div>
      </XPWindow>
    </div>
  );
}
