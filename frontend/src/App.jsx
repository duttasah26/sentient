import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCamera } from './hooks/useCamera';
import {
  WindowsXPMyComputer,
  WindowsXPMovieMaker,
  WindowsXPCamera,
  WindowsXPMagnify,
  WindowsXPMyDocuments,
  WindowsXPConfiguration,
  MSNMessenger,
} from 'react-old-icons';
import { XP, OldIcon, XPWindow, XPButton, XPStatusBar } from './components/xp';
import { ObjectFeedPanel } from './components/ObjectFeedPanel';
import { LiveCanvas } from './components/LiveCanvas';
import { MeetingPanel } from './components/MeetingPanel';
import { WantsToTalkBubble } from './components/WantsToTalkBubble';

const BACKEND = 'http://localhost:8000';
const LIVE_MS = 2000;

export default function App() {
  const { videoRef, status, start, stop, captureFrame } = useCamera();
  const [objects,        setObjects]        = useState([]);
  const [allObjects,     setAllObjects]     = useState([]);
  const [feedLog,        setFeedLog]        = useState([]);
  const [objectMessages, setObjectMessages] = useState({});
  const [flash,          setFlash]          = useState(false);
  const [conversations,  setConversations]  = useState(new Map()); // Map<label, {object, box}>
  const [wantsToTalk,    setWantsToTalk]    = useState(null);      // { label, object } | null
  const [identifying,    setIdentifying]    = useState(false);
  const polling           = useRef(false);
  const timerRef          = useRef(null);
  const containerRef      = useRef(null);
  const prevLabelsRef     = useRef(new Set());
  const objectsRef        = useRef([]);
  const conversationsRef  = useRef(new Map());

  // Keep refs in sync for use inside closures/timers
  useEffect(() => { objectsRef.current = objects; }, [objects]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  // Fetch all registered objects for the feed panel
  useEffect(() => {
    const load = () => fetch(`${BACKEND}/objects`).then(r => r.json()).then(d => setAllObjects(d.objects ?? [])).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Detection event log
  useEffect(() => {
    const prev = prevLabelsRef.current;
    const currMap = new Map(objects.map(o => [o.label, o]));
    const events = [];
    for (const [label, obj] of currMap) {
      if (!prev.has(label)) events.push({ id: `${Date.now()}-${label}`, time: new Date(), type: 'online',  label, name: obj.name || label });
    }
    for (const label of prev) {
      if (!currMap.has(label)) {
        const name = allObjects.find(o => o.yolo_label === label)?.name || label;
        events.push({ id: `${Date.now()}-${label}-off`, time: new Date(), type: 'offline', label, name });
      }
    }
    if (events.length > 0) setFeedLog(prev => [...prev, ...events].slice(-60));
    prevLabelsRef.current = new Set(objects.map(o => o.label));
  }, [objects]);

  // Auto-dismiss WantsToTalkBubble after 8 s
  useEffect(() => {
    if (!wantsToTalk) return;
    const t = setTimeout(() => setWantsToTalk(null), 8000);
    return () => clearTimeout(t);
  }, [wantsToTalk]);

  // Random "wants to talk" trigger — fires every 25-60 s while live
  useEffect(() => {
    if (status !== 'live') return;
    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      const delay = 25000 + Math.random() * 35000;
      setTimeout(() => {
        if (cancelled) return;
        const candidates = objectsRef.current.filter(o => !conversationsRef.current.has(o.label));
        if (candidates.length > 0) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          setWantsToTalk(prev => prev ? prev : { label: pick.label, object: pick });
        }
        schedule();
      }, delay);
    };
    schedule();
    return () => { cancelled = true; };
  }, [status]);

  const handleNewMessage = useCallback((label, msg) => {
    setObjectMessages(prev => ({ ...prev, [label]: msg }));
  }, []);

  const triggerFlash = () => { setFlash(true); setTimeout(() => setFlash(false), 120); };

  const openConversation = useCallback((obj) => {
    if (conversationsRef.current.has(obj.label)) return;
    if (conversationsRef.current.size >= 2) {
      alert('Maximum 2 concurrent sessions open.\n\nClose an existing session first.');
      return;
    }
    setConversations(prev => {
      if (prev.has(obj.label) || prev.size >= 2) return prev;
      const next = new Map(prev);
      next.set(obj.label, { object: obj, box: obj.box ?? null });
      return next;
    });
    setWantsToTalk(prev => prev?.label === obj.label ? null : prev);
  }, []);

  const handleObjectClick = useCallback(async (obj) => {
    if (conversationsRef.current.size >= 2 && !conversationsRef.current.has(obj.label)) {
      alert('Maximum 2 concurrent sessions open.\n\nClose an existing session first.');
      return;
    }
    triggerFlash();
    setIdentifying(true);
    try {
      const canvas = captureFrame();
      if (canvas) {
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.7));
        const form = new FormData();
        form.append('file', blob, 'frame.jpg');
        form.append('x1', obj.box.x1); form.append('y1', obj.box.y1);
        form.append('x2', obj.box.x2); form.append('y2', obj.box.y2);
        const res  = await fetch(`${BACKEND}/vision/identify`, { method: 'POST', body: form });
        const data = await res.json();
        if (data.matched_label) {
          openConversation({ ...obj, label: data.matched_label, name: data.name });
          return;
        }
      }
    } catch {}
    finally { setIdentifying(false); }
    openConversation(obj);
  }, [captureFrame, openConversation]);

  const closeConversation = useCallback((label) => {
    setConversations(prev => {
      const next = new Map(prev);
      next.delete(label);
      return next;
    });
  }, []);

  // Live detection polling — also updates bounding boxes for open conversations
  useEffect(() => {
    if (status !== 'live') { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(async () => {
      if (polling.current) return;
      polling.current = true;
      const canvas = captureFrame();
      if (!canvas) { polling.current = false; return; }
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.6));
      const form = new FormData();
      form.append('file', blob, 'frame.jpg');
      try {
        const res  = await fetch(`${BACKEND}/live/detect`, { method: 'POST', body: form });
        const data = await res.json();
        const newObjs = (data.all_objects ?? []).filter(o => o.label !== 'person' && o.label !== 'human');
        setObjects(newObjs);
        // Track bounding boxes for open conversation panels
        setConversations(prev => {
          let changed = false;
          const next = new Map(prev);
          for (const [label, entry] of prev) {
            const match = newObjs.find(o => o.label === label);
            const newBox = match ? match.box : null;
            const oldBox = entry.box;
            if (JSON.stringify(oldBox) !== JSON.stringify(newBox)) {
              next.set(label, { ...entry, box: newBox });
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      } catch {}
      finally { polling.current = false; }
    }, LIVE_MS);
    return () => { clearInterval(timerRef.current); polling.current = false; };
  }, [status, captureFrame]);

  const convEntries = [...conversations.entries()];

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', background: 'linear-gradient(180deg, #4a9edc 0%, #6ab8f0 15%, #8dd0f8 30%, #5db0e8 55%, #3a8fd8 75%, #2070c0 100%)', display: 'flex', flexDirection: 'column', fontFamily: 'Tahoma, "MS Sans Serif", Arial, sans-serif' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; font-family: Tahoma, "MS Sans Serif", Arial, sans-serif; }
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes slide-in-right{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes onlinePulse{0%,100%{box-shadow:0 0 3px #00cc00}50%{box-shadow:0 0 9px #00ff41,0 0 16px #00cc0066}}
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes speakingRing{0%,100%{box-shadow:0 0 0 2px #00cc00}50%{box-shadow:0 0 0 5px #00ff41,0 0 12px #00cc0066}}
        @keyframes progressBar{0%{transform:translateX(-50%)}100%{transform:translateX(0%)}}
        @keyframes scanline{0%{top:-4%}100%{top:104%}}
        .neo-border { outline: 4px solid; outline-color: transparent; box-shadow: 0 0 0 3px #7ab6d6, 0 0 0 6px white, 0 0 0 9px #7ab6d6; }
        .xp-divider { height: 1px; background: linear-gradient(90deg, transparent, #808080, transparent); border-bottom: 1px solid #fff; margin: 2px 0; }
      `}</style>

      {/* Taskbar */}
      <div style={{ background: XP.taskbarBg, padding: '2px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 32, flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Start button */}
          <div style={{ background: 'linear-gradient(180deg, #60d840 0%, #30a820 50%, #20881a 100%)', border: '1px solid #187010', borderRadius: 12, padding: '2px 12px 2px 8px', display: 'flex', alignItems: 'center', gap: 5, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)', cursor: 'pointer' }}>
            <OldIcon Icon={WindowsXPMyComputer} size={14} />
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, fontFamily: 'Tahoma, sans-serif', fontStyle: 'italic', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>start</span>
          </div>
          {/* App taskbar button */}
          <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.3)', borderRadius: 2, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <OldIcon Icon={WindowsXPMovieMaker} size={12} />
            <span style={{ color: '#fff', fontSize: 11, fontFamily: 'Tahoma, sans-serif', textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}>Sentient.exe</span>
          </div>
          {/* Meeting panel pills */}
          {convEntries.map(([label, { object }]) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 2, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'default', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}>
              <OldIcon Icon={MSNMessenger} size={12} />
              <span style={{ color: '#fff', fontSize: 10, fontFamily: 'Tahoma, sans-serif', textShadow: '1px 1px 1px rgba(0,0,0,0.5)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {object.name || label}
              </span>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 4px #00ff41', flexShrink: 0 }} />
            </div>
          ))}
        </div>

        {/* System tray */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/objects" style={{ color: '#fff', fontSize: 11, fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', textDecoration: 'none', textShadow: '1px 1px 1px rgba(0,0,0,0.5)', opacity: 0.9, display: 'flex', alignItems: 'center', gap: 4 }}>
            <OldIcon Icon={WindowsXPMyDocuments} size={12} /> Object Library
          </Link>
          {identifying && (
            <span style={{ color: '#ffe040', fontSize: 11, fontFamily: 'Tahoma, sans-serif', animation: 'blink 0.7s step-start infinite', display: 'flex', alignItems: 'center', gap: 4 }}>
              <OldIcon Icon={WindowsXPMagnify} size={12} /> Identifying...
            </span>
          )}
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, padding: '1px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <XPStatusBar status={status} />
          </div>
          <span style={{ color: '#fff', fontSize: 11, fontFamily: 'Tahoma, sans-serif', textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Desktop — centered layout matching reference */}
      <main style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'stretch',
        justifyContent: 'center',
        padding: '10px 14px',
      }}>
        {/* Centered content wrapper — mirrors the reference screenshot */}
        <div style={{
          display: 'flex', gap: 10, width: '100%',
          maxWidth: 1100, alignItems: 'stretch',
          margin: '0 auto',
        }}>
          {/* Left: Object Monitor (narrow sidebar) */}
          <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <ObjectFeedPanel
              allObjects={allObjects}
              liveObjects={objects}
              feedLog={feedLog}
              objectMessages={objectMessages}
              activeLabels={new Set(conversations.keys())}
            />
          </div>

          {/* Center: Camera — dominant, fills remaining space */}
          <XPWindow
            title="00.sentient.org"
            icon={WindowsXPMovieMaker}
            resizable
            style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}
            titleExtra={
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'Tahoma, sans-serif', marginLeft: 8 }}>
                {status === 'live' ? `● ${objects.length} object(s) detected` : ''}
              </span>
            }
          >
            {/* Toolbar */}
            <div style={{ background: '#d4d0c8', borderBottom: '1px solid #808080', padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <XPButton onClick={status === 'live' ? stop : start} primary={status !== 'live'}>
                {status === 'live' ? '⏹ Stop' : '▶ Start Camera'}
              </XPButton>
              {status === 'live' && (
                <XPButton onClick={() => containerRef.current?.requestFullscreen()}>⛶ Full Screen</XPButton>
              )}
              <div style={{ marginLeft: 8, height: 18, borderLeft: '1px solid #808080', borderRight: '1px solid #fff' }}/>
              <span style={{ fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: XP.textMid }}>
                Tap any highlighted object to chat with it
              </span>
            </div>

            {/* Video — fills remaining height */}
            <div ref={containerRef} style={{ position: 'relative', margin: '0 6px 6px', flex: 1, minHeight: 0, background: '#000', border: '2px inset #7f9db9', boxShadow: 'inset 1px 1px 4px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {status === 'live' && <LiveCanvas videoRef={videoRef} objects={objects} onClickObject={handleObjectClick} />}

              <div style={{ position: 'absolute', inset: 0, background: 'white', opacity: flash ? 0.4 : 0, pointerEvents: 'none', transition: 'opacity 60ms ease' }}/>

              {status !== 'live' && status !== 'requesting' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: 'linear-gradient(180deg,#0a1a3a 0%,#0d2a5a 100%)' }}>
                  <OldIcon Icon={WindowsXPCamera} size={56} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#fff', fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Camera not started</div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Tahoma, sans-serif' }}>Press ▶ Start Camera to begin</div>
                  </div>
                  <OldIcon Icon={WindowsXPMovieMaker} size={20} style={{ opacity: 0.3 }} />
                </div>
              )}

              {status === 'live' && objects.length > 0 && (
                <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(17,17,16,0.8)', border: '1px solid #7f9db9', padding: '2px 8px', fontFamily: 'Tahoma, sans-serif', fontSize: 10, color: '#ffffe1', backdropFilter: 'blur(4px)' }}>
                  {objects.length} object{objects.length !== 1 ? 's' : ''} found — tap one to start chatting!
                </div>
              )}

              {wantsToTalk && (
                <WantsToTalkBubble
                  object={wantsToTalk.object}
                  box={objects.find(o => o.label === wantsToTalk.label)?.box ?? wantsToTalk.object.box}
                  containerRef={containerRef}
                  onOpen={() => { openConversation(wantsToTalk.object); setWantsToTalk(null); }}
                  onDismiss={() => setWantsToTalk(null)}
                />
              )}
            </div>

            {/* Status bar */}
            <div style={{ background: '#d4d0c8', borderTop: '1px solid #fff', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', color: XP.textMid, flexShrink: 0 }}>
              <XPStatusBar status={status} />
              {conversations.size > 0 && (
                <span style={{ color: '#000080', display: 'flex', alignItems: 'center', gap: 3 }}><OldIcon Icon={WindowsXPConfiguration} size={11} /> {conversations.size} session{conversations.size > 1 ? 's' : ''} active</span>
              )}
              <span style={{ marginLeft: 'auto' }}>Sentient v2.0 · BearHacks 2026</span>
            </div>
          </XPWindow>
        </div>
      </main>

      {/* Meeting panels — panel 0 at right:0, panel 1 at right:344 */}
      {convEntries.map(([label, { object, box }], i) => (
        <MeetingPanel
          key={label}
          object={object}
          box={box}
          onClose={() => closeConversation(label)}
          onNewMessage={handleNewMessage}
          videoRef={videoRef}
          panelIndex={i}
        />
      ))}
    </div>
  );
}
