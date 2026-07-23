import { useState, useEffect, useRef, useCallback } from 'react';
import { WindowsXPCamera } from 'react-old-icons';
import { XP, OldIcon, XPWindow, XPButton, XPSunken } from '../xp';

const BACKEND = 'http://localhost:8000';

export function ScanModal({ object, onClose, onSaved }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [step, setStep]           = useState('camera');
  const [blob, setBlob]           = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      }).catch(() => setError('Camera access denied'));
    return () => { active = false; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const snap = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(b => { setBlob(b); setPreviewUrl(URL.createObjectURL(b)); setStep('preview'); streamRef.current?.getTracks().forEach(t => t.stop()); }, 'image/jpeg', 0.85);
  }, []);

  const retake = () => {
    URL.revokeObjectURL(previewUrl);
    setBlob(null); setPreviewUrl(null); setStep('camera');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then(stream => { streamRef.current = stream; if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); } });
  };

  const save = async () => {
    if (!blob) return;
    setSaving(true); setError(null);
    try {
      const form = new FormData();
      form.append('file', blob, 'fingerprint.jpg');
      const res = await fetch(`${BACKEND}/objects/${encodeURIComponent(object.yolo_label)}/fingerprint`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onSaved(data.labels);
    } catch (e) { setError(e.message || 'Failed'); setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <XPWindow title={`Scan Object — ${object.name}`} icon={WindowsXPCamera} onClose={onClose} style={{ width: 'min(480px,94vw)' }}>
        <div style={{ background: '#d4d0c8', borderBottom: '1px solid #808080', padding: '3px 6px', fontSize: 10, fontFamily: 'Tahoma, sans-serif', color: XP.textMid, display: 'flex', alignItems: 'center', gap: 5 }}>
          <OldIcon Icon={WindowsXPCamera} size={12} />
          {step === 'camera' ? 'Centre the object in frame, then click Snap' : '✅ Confirm — this photo will be saved as the visual fingerprint'}
        </div>
        <XPSunken style={{ margin: 8, aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: '#000' }}>
          {step === 'camera' && <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
          {step === 'preview' && previewUrl && <img src={previewUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
          {error && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6060', fontFamily: 'Tahoma, sans-serif', fontSize: 11, textAlign: 'center', padding: 16 }}>{error}</div>}
          {step === 'camera' && !error && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}><div style={{ width: '40%', aspectRatio: '1', border: '1px dashed rgba(255,255,100,0.7)', borderRadius: 2 }}/></div>}
          {step === 'preview' && <div style={{ position: 'absolute', top: 6, left: 6, background: '#008000', color: '#fff', fontFamily: 'Tahoma, sans-serif', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 2 }}>✓ CAPTURED</div>}
        </XPSunken>
        <div style={{ background: '#d4d0c8', borderTop: '1px solid #fff', padding: '4px 8px 8px', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          {step === 'camera' ? (
            <><XPButton onClick={onClose}>Cancel</XPButton><XPButton onClick={snap} disabled={!!error} primary><OldIcon Icon={WindowsXPCamera} size={11} /> Snap</XPButton></>
          ) : (
            <><XPButton onClick={retake}>↩ Retake</XPButton><XPButton onClick={save} disabled={saving} primary>{saving ? 'Saving…' : '✓ Save Fingerprint'}</XPButton></>
          )}
        </div>
      </XPWindow>
    </div>
  );
}
