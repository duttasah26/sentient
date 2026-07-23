import { useEffect, useState } from 'react';
import { MSNMessenger } from 'react-old-icons';
import { XP, OldIcon, XPButton } from './xp';

export function WantsToTalkBubble({ object, box, containerRef, onOpen, onDismiss }) {
  const [pos, setPos] = useState({ x: 80, y: 80 });

  useEffect(() => {
    if (!containerRef?.current || !box) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = box.x1 * rect.width + rect.left;
    const cy = box.y1 * rect.height + rect.top;
    setPos({ x: Math.min(cx, window.innerWidth - 260), y: Math.max(40, cy - 120) });
  }, [box, containerRef]);

  const name = object.name || object.label;

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y,
      zIndex: 300,
      background: '#fffde7',
      border: '3px outset #c8c0b0',
      borderRadius: 4,
      padding: '12px 16px 14px',
      fontFamily: 'Tahoma, "MS Sans Serif", sans-serif',
      boxShadow: '4px 4px 12px rgba(0,0,0,0.45)',
      minWidth: 240,
      animation: 'slide-in-right 150ms ease',
    }}>
      {/* Header */}
      <div style={{ background: XP.titleBarGrad, margin: '-12px -16px 10px', padding: '5px 10px', borderRadius: '2px 2px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
        <OldIcon Icon={MSNMessenger} size={18} />
        <span style={{ fontWeight: 700, fontSize: 13, color: '#fff', fontFamily: 'Tahoma, sans-serif', textShadow: '1px 1px 2px rgba(0,0,0,0.5)', flex: 1 }}>New Message!</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 28 }}>💬</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: XP.textDark }}>{name}</div>
          <div style={{ fontSize: 12, color: '#555' }}>wants to talk with you!</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <XPButton onClick={onOpen} primary style={{ flex: 1, fontSize: 12, padding: '5px 10px', minWidth: 0 }}>
          💬 Open Chat
        </XPButton>
        <XPButton onClick={onDismiss} style={{ fontSize: 12, padding: '5px 10px', minWidth: 0 }}>
          ✕ Later
        </XPButton>
      </div>
      {/* Tooltip arrow */}
      <div style={{ position: 'absolute', bottom: -12, left: 20, width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '12px solid #fffde7', filter: 'drop-shadow(0 3px 2px rgba(0,0,0,0.2))' }} />
    </div>
  );
}
