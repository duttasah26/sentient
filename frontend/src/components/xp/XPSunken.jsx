import { XP } from './theme';

export function XPSunken({ children, style }) {
  return (
    <div style={{
      border: `2px inset ${XP.fieldBorder}`,
      boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.2)',
      background: XP.windowInner,
      ...style,
    }}>
      {children}
    </div>
  );
}
