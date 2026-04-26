import { useRef, useState, useCallback, useEffect } from 'react';

const BACKEND_WS = 'ws://localhost:8000';

/**
 * useConversation(yoloLabel)
 *
 * Opens a WebSocket to /ws/chat/{yoloLabel} on connect().
 * Streams reply tokens, accumulates full reply, then triggers TTS.
 *
 * Returns: { connect, disconnect, send, messages, status, objectMeta }
 * status: 'idle' | 'connecting' | 'ready' | 'thinking' | 'speaking' | 'error'
 */
export function useConversation(yoloLabel) {
  const wsRef       = useRef(null);
  const audioRef    = useRef(null);
  const [status,     setStatus]     = useState('idle');
  const [messages,   setMessages]   = useState([]);   // { role, text }[]
  const [objectMeta, setObjectMeta] = useState(null); // { name, voice_id }

  const appendMessage = useCallback((role, text) => {
    setMessages(prev => [...prev, { role, text, id: Date.now() + Math.random() }]);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current) return;
    setStatus('connecting');
    setMessages([]);
    const ws = new WebSocket(`${BACKEND_WS}/ws/chat/${yoloLabel}`);
    wsRef.current = ws;

    ws.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data);

      if (msg.type === 'ready') {
        setObjectMeta({ name: msg.name, voice_id: msg.voice_id });
        setStatus('ready');
      }

      if (msg.type === 'token') {
        // tokens accumulate — we show the full reply when 'done' arrives
      }

      if (msg.type === 'done') {
        appendMessage('assistant', msg.full);
        setStatus('speaking');
        // TTS
        try {
          const res = await fetch(`http://localhost:8000/tts/${yoloLabel}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ message: msg.full }),
          });
          const blob = await res.blob();
          const url  = URL.createObjectURL(blob);
          if (audioRef.current) {
            audioRef.current.pause();
            URL.revokeObjectURL(audioRef.current.src);
          }
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => { setStatus('ready'); URL.revokeObjectURL(url); };
          audio.play();
        } catch {
          setStatus('ready');
        }
      }

      if (msg.type === 'error') {
        setStatus('error');
      }
    };

    ws.onerror = ()  => setStatus('error');
    ws.onclose = ()  => { wsRef.current = null; setStatus('idle'); };
  }, [yoloLabel, appendMessage]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    audioRef.current?.pause();
    setStatus('idle');
    setMessages([]);
    setObjectMeta(null);
  }, []);

  const send = useCallback((text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    appendMessage('user', text);
    setStatus('thinking');
    wsRef.current.send(JSON.stringify({ message: text }));
  }, [appendMessage]);

  // Cleanup on unmount
  useEffect(() => () => { wsRef.current?.close(); audioRef.current?.pause(); }, []);

  return { connect, disconnect, send, messages, status, objectMeta };
}