export function OldIcon({ Icon, size = 16, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1, ...style }}>
      <Icon size={size} />
    </span>
  );
}
