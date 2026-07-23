import { useState } from 'react';
import { WindowsXPConfiguration, WindowsXPMyDocuments, WindowsXPDiskDefragmenter, WindowsXPCamera } from 'react-old-icons';
import { XP, OldIcon, XPButton } from '../xp';
import { VOICE_NAMES } from './voices';

export function ObjectRow({ obj, idx, isScanned, onConverse, onScan, onEdit }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'grid', gridTemplateColumns: '16px 1fr 90px 70px 80px 160px', alignItems: 'center', gap: 0, padding: '6px 8px', background: hov ? '#dce8f8' : idx % 2 === 0 ? XP.windowInner : '#f5f3ee', borderBottom: '1px solid #d4d0c8', cursor: 'pointer', transition: 'background 100ms ease' }}
      onClick={onConverse}>
      <OldIcon Icon={isScanned ? WindowsXPConfiguration : WindowsXPMyDocuments} size={12} />
      <div style={{ minWidth: 0, paddingRight: 8 }}>
        <div style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 12, fontWeight: 700, color: XP.textDark }}>{obj.name}</div>
        <div style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: XP.textMid, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{obj.backstory?.slice(0, 80) ?? 'No backstory set'}</div>
      </div>
      <span style={{ fontFamily: 'Courier New, monospace', fontSize: 10, color: XP.textMid }}>{obj.yolo_label}</span>
      <span style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: XP.textMid }}>{VOICE_NAMES[obj.voice_id] ?? '—'}</span>
      <span style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 10, fontWeight: 700, color: isScanned ? XP.statusGreen : XP.statusGray }}>
        {isScanned ? '✓ Scanned' : '⚠ Not scanned'}
      </span>
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
        <XPButton onClick={onEdit} style={{ minWidth: 'auto', padding: '2px 8px', fontSize: 10, gap: 3 }}>
          <OldIcon Icon={WindowsXPDiskDefragmenter} size={11} />Edit
        </XPButton>
        <XPButton onClick={onScan} style={{ minWidth: 'auto', padding: '2px 8px', fontSize: 10, gap: 3 }}>
          <OldIcon Icon={WindowsXPCamera} size={11} />{isScanned ? 'Re-scan' : 'Scan'}
        </XPButton>
      </div>
    </div>
  );
}
