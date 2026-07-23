export const XP = {
  titleBarGrad: 'linear-gradient(180deg, #1f8dd6 0%, #2563b0 4%, #1957a5 8%, #1a5ca8 50%, #1855a3 92%, #1650a0 96%, #1048a0 100%)',
  titleBarText: '#ffffff',
  titleBarShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
  windowBorder: '#0055e5',
  windowBg: '#ece9d8',
  windowInner: '#ffffff',
  windowShadow: '2px 2px 0 #7b7b7b, 4px 4px 0 #555, inset -1px -1px 0 #888',
  btnBg: 'linear-gradient(180deg, #f8f8f8 0%, #e4e0d0 100%)',
  btnBorder: '#7f9db9',
  btnActive: 'linear-gradient(180deg, #d4cebf 0%, #e8e4d4 100%)',
  btnHoverBorder: '#316ac5',
  taskbarBg: 'linear-gradient(180deg, #2b7dd8 0%, #1e5fb4 50%, #1851a3 100%)',
  textDark: '#000000',
  textMid: '#4a4848',
  textBlue: '#063289',
  textLink: '#0000cc',
  fieldBg: '#ffffff',
  fieldBorder: '#7f9db9',
  fieldBorderFocus: '#316ac5',
  statusRed: '#cc0000',
  statusGreen: '#008000',
  statusYellow: '#ccaa00',
  statusGray: '#808080',
  bgPattern: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='2' height='2' fill='%23d4d0c8' opacity='0.5'/%3E%3C/svg%3E")`,
};

export const depthColor = d => {
  if (d == null) return '#316ac5';
  if (d > 0.75)  return '#cc0000';
  if (d > 0.5)   return '#ccaa00';
  if (d > 0.25)  return '#008000';
  return '#316ac5';
};
