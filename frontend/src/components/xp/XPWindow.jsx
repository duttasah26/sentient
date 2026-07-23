import { useState } from 'react';
import { XP } from './theme';
import { OldIcon } from './OldIcon';

export function XPTitleBtn({ label, color, hov, onClick }) {
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

export function XPWindow({ title, icon, children, style, onClose, resizable = false, titleExtra }) {
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
