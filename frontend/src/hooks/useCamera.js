import { useState, useRef, useCallback } from 'react';

export function useCamera() {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus]         = useState('idle');
  const [resolution, setResolution] = useState(null);

  const start = useCallback(async () => {
    try {
      setStatus('requesting');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      video.addEventListener('loadedmetadata', () =>
        setResolution({ w: video.videoWidth, h: video.videoHeight }), { once: true });
      setStatus('live');
    } catch (err) {
      setStatus('error');
      console.error('Camera error:', err);
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setResolution(null);
    setStatus('idle');
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || status !== 'live') return null;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas;
  }, [status]);

  return { videoRef, status, resolution, start, stop, captureFrame };
}