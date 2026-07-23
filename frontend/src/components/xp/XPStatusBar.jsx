import { XP } from './theme';

export function XPStatusBar({ status }) {
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
