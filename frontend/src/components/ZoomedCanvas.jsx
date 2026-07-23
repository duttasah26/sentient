import { useCallback, useEffect, useRef } from 'react';

export function ZoomedCanvas({ videoRef, box, speaking }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video || video.readyState < 2) { animRef.current = requestAnimationFrame(draw); return; }
    const W = video.videoWidth, H = video.videoHeight;
    const b = box ?? { x1: 0, y1: 0, x2: 1, y2: 1 };
    const sx = b.x1 * W, sy = b.y1 * H;
    const sw = Math.max(1, (b.x2 - b.x1) * W);
    const sh = Math.max(1, (b.y2 - b.y1) * H);
    canvas.width  = sw;
    canvas.height = sh;
    canvas.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    animRef.current = requestAnimationFrame(draw);
  }, [videoRef, box]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%', height: '100%', objectFit: 'cover', display: 'block',
        boxSizing: 'border-box',
        animation: speaking ? 'speakingRing 0.8s ease-in-out infinite' : 'none',
      }}
    />
  );
}
