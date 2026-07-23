import { useCallback, useEffect, useRef } from 'react';
import { depthColor } from './xp';

export function LiveCanvas({ videoRef, objects, onClickObject }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video || video.readyState < 2) { animRef.current = requestAnimationFrame(draw); return; }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const W = canvas.width, H = canvas.height;

    objects.forEach(obj => {
      const { box, label, conf, depth, name } = obj;
      const x  = box.x1 * W, y  = box.y1 * H;
      const bw = (box.x2 - box.x1) * W, bh = (box.y2 - box.y1) * H;
      const dc = depthColor(depth);
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = dc; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, bw, bh);
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y + 2, bw - 4, bh - 4);
      const tag = name || label;
      ctx.font = `bold 12px Tahoma, sans-serif`;
      const tw = ctx.measureText(tag).width;
      ctx.fillStyle = '#ffffe1';
      ctx.fillRect(x, y - 22, tw + 12, 19);
      ctx.strokeStyle = '#000080'; ctx.lineWidth = 1; ctx.setLineDash([]);
      ctx.strokeRect(x, y - 22, tw + 12, 19);
      ctx.fillStyle = '#000000';
      ctx.fillText(tag, x + 6, y - 8);
      ctx.font = `10px Tahoma, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,225,0.9)';
      ctx.fillText(`${Math.round(conf * 100)}%`, x + 4, y + bh + 14);
      ctx.font = `9px Tahoma, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,225,0.85)';
      const hint = '[ TAP TO CHAT ]';
      const hw = ctx.measureText(hint).width;
      ctx.fillText(hint, x + bw / 2 - hw / 2, y + bh - 5);
    });

    animRef.current = requestAnimationFrame(draw);
  }, [videoRef, objects]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top)  / rect.height;
    const hit = objects.find(o => nx >= o.box.x1 && nx <= o.box.x2 && ny >= o.box.y1 && ny <= o.box.y2);
    if (hit) onClickObject(hit);
  }, [objects, onClickObject]);

  return <canvas ref={canvasRef} onClick={handleClick} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'crosshair' }} />;
}
