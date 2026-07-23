import { useEffect, useRef } from 'react';
import {
  WindowsXPMagnify,
  WindowsXPUsers,
  WindowsXPLogOff,
  WindowsXPMyDocuments,
  AdministrativeToolsXP,
} from 'react-old-icons';
import { XP, OldIcon, XPWindow } from './xp';

export function ObjectFeedPanel({ allObjects, liveObjects, feedLog, objectMessages, activeLabels }) {
  const liveSet  = new Set(liveObjects.map(o => o.label));
  const logEndRef = useRef(null);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [feedLog]);

  const onlineObjs  = liveObjects.filter((o, i, arr) => arr.findIndex(x => x.label === o.label) === i);
  const offlineObjs = allObjects.filter(o => !liveSet.has(o.yolo_label));

  return (
    <XPWindow title="Object Monitor" icon={WindowsXPMyDocuments} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
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
          const isActive = activeLabels.has(obj.label);
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
        <div style={{ color: '#00aa00', marginBottom: 2, fontSize: 8, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}><OldIcon Icon={AdministrativeToolsXP} size={9} style={{ color: '#00cc00' }} />C:\SENTIENT\EVENTS.LOG</div>
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
