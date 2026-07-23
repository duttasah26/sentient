import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  WindowsXPMyComputer,
  WindowsXPMyDocuments,
  WindowsXPFolderOpen,
  WindowsXPMail,
  AdministrativeToolsXP,
} from 'react-old-icons';
import { XP, OldIcon, XPWindow, XPButton, XPSunken } from './components/xp';
import { NewObjectModal } from './components/objects/NewObjectModal';
import { ScanModal } from './components/objects/ScanModal';
import { ConversationModal } from './components/objects/ConversationModal';
import { EditObjectModal } from './components/objects/EditObjectModal';
import { ObjectRow } from './components/objects/ObjectRow';

const BACKEND = 'http://localhost:8000';

export default function Objects() {
  const [objects,   setObjects]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [scanning,  setScanning]  = useState(null);
  const [editing,   setEditing]   = useState(null);
  const [scanned,   setScanned]   = useState({});
  const [addingNew, setAddingNew] = useState(false);

  const loadObjects = useCallback(() => {
    setLoading(true);
    fetch(`${BACKEND}/objects`)
      .then(r => r.json())
      .then(d => { const objs = d.objects ?? []; setObjects(objs); const pre = {}; objs.forEach(o => { if (o.vision_labels?.length) pre[o.yolo_label] = true; }); setScanned(pre); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadObjects(); }, [loadObjects]);

  return (
    <div style={{ minHeight: '100dvh', background: `${XP.bgPattern}, linear-gradient(180deg,#1f8dd6 0%,#3a9de6 8%,#58b0f0 12%,#3a9de6 100%)`, backgroundSize: '4px 4px, 100% 100%', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>

      {/* Taskbar */}
      <div style={{ background: XP.taskbarBg, padding: '2px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 32, flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'linear-gradient(180deg,#60d840 0%,#30a820 50%,#20881a 100%)', border: '1px solid #187010', borderRadius: 12, padding: '2px 12px 2px 8px', display: 'flex', alignItems: 'center', gap: 5, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)', cursor: 'pointer' }}>
            <OldIcon Icon={WindowsXPMyComputer} size={14} />
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, fontFamily: 'Tahoma, sans-serif', fontStyle: 'italic', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>start</span>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.3)', borderRadius: 2, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <OldIcon Icon={WindowsXPMyDocuments} size={12} />
            <span style={{ color: '#fff', fontSize: 11, fontFamily: 'Tahoma, sans-serif', textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}>Object Library</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/" style={{ color: '#fff', fontSize: 11, fontFamily: 'Tahoma, sans-serif', textDecoration: 'none', textShadow: '1px 1px 1px rgba(0,0,0,0.5)', opacity: 0.9 }}>← Camera</Link>
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, padding: '1px 8px', color: '#fff', fontSize: 11, fontFamily: 'Tahoma, sans-serif', textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Desktop */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, paddingTop: 16 }}>
        <XPWindow title="Sentient — Object Library (BearHacks 2026)" icon={WindowsXPFolderOpen} style={{ width: '100%', maxWidth: 780 }}>
          {/* Toolbar */}
          <div style={{ background: '#d4d0c8', borderBottom: '1px solid #808080', padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <XPButton onClick={() => setAddingNew(true)} primary style={{ minWidth: 'auto', padding: '3px 10px' }}>
              <OldIcon Icon={AdministrativeToolsXP} size={12} /> Register Object
            </XPButton>
            <div style={{ width: 1, height: 18, background: '#808080', margin: '0 2px' }} />
            <XPButton onClick={loadObjects} style={{ minWidth: 'auto', padding: '3px 10px' }}>↻ Refresh</XPButton>
            <span style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: XP.textMid, marginLeft: 8 }}>
              {loading ? 'Loading…' : `${objects.length} object${objects.length !== 1 ? 's' : ''} in memory — click a row to converse`}
            </span>
          </div>

          {/* Column headers */}
          <div style={{ background: '#d4d0c8', borderBottom: '1px solid #808080', display: 'grid', gridTemplateColumns: '16px 1fr 90px 70px 80px 160px', gap: 0, padding: '2px 8px', fontFamily: 'Tahoma, sans-serif', fontSize: 11, fontWeight: 700, color: XP.textDark }}>
            <span/><span>Name / Backstory</span><span>Identifier</span><span>Voice</span><span>Fingerprint</span><span>Actions</span>
          </div>

          {/* Content */}
          <XPSunken style={{ margin: 6, minHeight: 240, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
            {loading ? (
              [1,2,3,4].map(i => <div key={i} style={{ height: 52, background: 'linear-gradient(90deg,#e8e4d8 25%,#f0ede4 50%,#e8e4d8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite', borderBottom: '1px solid #d4d0c8' }} />)
            ) : objects.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12, color: XP.textMid, fontFamily: 'Tahoma, sans-serif', textAlign: 'center' }}>
                <OldIcon Icon={WindowsXPMail} size={48} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: XP.textDark, marginBottom: 4 }}>No objects registered yet</div>
                  <div style={{ fontSize: 11, maxWidth: 280 }}>Start the camera and scan some objects, or register one manually using the toolbar above.</div>
                </div>
                <XPButton onClick={() => setAddingNew(true)} primary>
                  <OldIcon Icon={AdministrativeToolsXP} size={12} /> Register First Object
                </XPButton>
              </div>
            ) : (
              objects.map((obj, idx) => (
                <ObjectRow key={obj.yolo_label} obj={obj} idx={idx} isScanned={!!scanned[obj.yolo_label]} onConverse={() => setSelected(obj)} onScan={() => setScanning(obj)} onEdit={() => setEditing(obj)} />
              ))
            )}
          </XPSunken>

          {/* Status bar */}
          <div style={{ background: '#d4d0c8', borderTop: '1px solid #fff', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, fontFamily: 'Tahoma, sans-serif', color: XP.textMid }}>
            <span style={{ borderRight: '1px solid #808080', paddingRight: 8, marginRight: 4 }}>{objects.length} object{objects.length !== 1 ? 's' : ''}</span>
            <span style={{ color: XP.statusGreen }}>{Object.keys(scanned).length} fingerprinted</span>
            <span style={{ marginLeft: 'auto' }}>Sentient v2.0 · BearHacks 2026</span>
          </div>
        </XPWindow>
      </main>

      {selected   && <ConversationModal object={selected} onClose={() => setSelected(null)} />}
      {addingNew  && <NewObjectModal onClose={() => setAddingNew(false)} onCreated={() => { setAddingNew(false); loadObjects(); }} />}
      {scanning   && <ScanModal object={scanning} onClose={() => setScanning(null)} onSaved={labels => { setScanned(s => ({ ...s, [scanning.yolo_label]: true })); setObjects(prev => prev.map(o => o.yolo_label === scanning.yolo_label ? { ...o, vision_labels: labels } : o)); setScanning(null); }} />}
      {editing    && <EditObjectModal object={editing} onClose={() => setEditing(null)} onSaved={updated => { setObjects(prev => prev.map(o => o.yolo_label === updated.yolo_label ? updated : o)); setEditing(null); }} />}
    </div>
  );
}
