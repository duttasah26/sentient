import { useState } from 'react';
import { XP } from './theme';

export function XPButton({ children, onClick, disabled, style, primary }) {
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
