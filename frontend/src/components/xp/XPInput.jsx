import { XP } from './theme';

export function XPInput({ value, onChange, onKeyDown, placeholder, disabled, autoFocus, highlighted, multiline, rows, style }) {
  const base = {
    boxSizing: 'border-box',
    background: XP.fieldBg,
    border: highlighted ? `2px inset ${XP.fieldBorderFocus}` : `2px inset ${XP.fieldBorder}`,
    borderRadius: 0, padding: '3px 6px',
    fontFamily: 'Tahoma, "MS Sans Serif", sans-serif',
    color: XP.textDark, outline: 'none',
    boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.2)',
    ...style,
  };

  if (multiline) {
    return (
      <textarea
        value={value} onChange={onChange} onKeyDown={onKeyDown}
        placeholder={placeholder} disabled={disabled} rows={rows || 3}
        style={{ ...base, resize: 'vertical', lineHeight: 1.5 }}
      />
    );
  }

  return (
    <input
      value={value} onChange={onChange} onKeyDown={onKeyDown}
      placeholder={placeholder} disabled={disabled} autoFocus={autoFocus}
      style={base}
    />
  );
}
