import { useRef, useState, useCallback, useEffect } from 'react';

const BACKEND    = 'http://localhost:8000';
const BACKEND_WS = 'ws://localhost:8000';

export function useConversation(yoloLabel) {
  const wsRef    = useRef(null);
  const audioRef = useRef(null);
  // Speech Recognition
  const srRef      = useRef(null);   // SpeechRecognition instance
  const mediaRef   = useRef(null);   // MediaRecorder (ElevenLabs fallback)
  const chunksRef  = useRef([]);

  const [status,      setStatus]      = useState('idle');
  const [messages,    setMessages]    = useState([]);
  const [objectMeta,  setObjectMeta]  = useState(null);
  const [transcript,  setTranscript]  = useState('');   // ← live transcript
  const [listening,   setListening]   = useState(false);

  const appendMessage = useCallback((role, text) => {
    setMessages(prev => [...prev, { role, text, id: Date.now() + Math.random() }]);
  }, []);

  // ── WebSocket ────────────────────────────────────────────────────────────
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

      if (msg.type === 'done') {
        appendMessage('assistant', msg.full);
        setStatus('speaking');
        try {
          const res        = await fetch(`${BACKEND}/tts/${yoloLabel}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ message: msg.full }),
          });
          const blob = await res.blob();
          const url  = URL.createObjectURL(blob);
          if (audioRef.current) {
            audioRef.current.pause();
            URL.revokeObjectURL(audioRef.current.src);
          }
          const audio       = new Audio(url);
          audioRef.current  = audio;
          audio.onended = () => { setStatus('ready'); URL.revokeObjectURL(url); };
          audio.play();
        } catch {
          setStatus('ready');
        }
      }

      if (msg.type === 'error') setStatus('error');
    };

    ws.onerror = ()  => setStatus('error');
    ws.onclose = ()  => { wsRef.current = null; setStatus('idle'); };
  }, [yoloLabel, appendMessage]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    audioRef.current?.pause();
    srRef.current?.abort();
    mediaRef.current?.stop();
    setStatus('idle');
    setMessages([]);
    setObjectMeta(null);
    setTranscript('');
    setListening(false);
  }, []);

  const send = useCallback((text) => {
    const trimmed = text.trim();
    if (!trimmed || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    appendMessage('user', trimmed);
    setStatus('thinking');
    setTranscript('');
    wsRef.current.send(JSON.stringify({ message: trimmed }));
  }, [appendMessage]);

  // ── Speech Recognition (Web Speech API — real-time) ──────────────────────
  const browserSRSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(async () => {
    if (listening) return;

    // ── Path A: Web Speech API (Chrome/Edge — real-time, zero latency) ──
    if (browserSRSupported) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const sr = new SR();
      sr.continuous      = true;   // keep listening until we call stop()
      sr.interimResults  = true;   // fire events with partial results
      sr.lang            = 'en-US';
      srRef.current      = sr;

      sr.onresult = (e) => {
        let interim = '';
        let final   = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += t;
          else interim += t;
        }
        // Show live interim text in the input box
        setTranscript(prev => {
          const base = prev.replace(/\s*\[.*\]$/, ''); // strip old interim tag
          return (base + final + (interim ? ` [${interim}]` : '')).trimStart();
        });
      };

      sr.onerror = (e) => {
        console.error('SR error', e.error);
        setListening(false);
      };

      sr.onend = () => setListening(false);

      sr.start();
      setListening(true);
      return;
    }

    // ── Path B: ElevenLabs /stt fallback (non-Chrome browsers) ──────────
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr     = new MediaRecorder(stream);
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        const form = new FormData();
        form.append('file', blob, 'voice.webm');
        try {
          const res  = await fetch(`${BACKEND}/stt`, { method: 'POST', body: form });
          const data = await res.json();
          if (data.text?.trim()) setTranscript(data.text.trim());
        } catch (err) {
          console.error('STT fallback error', err);
        }
        setListening(false);
      };

      mr.start();
      mediaRef.current = mr;
      setListening(true);
    } catch (err) {
      console.error('Mic access denied', err);
    }
  }, [listening, browserSRSupported]);

  const stopListening = useCallback(() => {
    if (srRef.current) {
      srRef.current.stop();
      srRef.current = null;
      // Clean up interim tag, leave final clean text
      setTranscript(prev => prev.replace(/\s*\[.*\]$/, '').trim());
    }
    if (mediaRef.current) {
      mediaRef.current.stop();
      mediaRef.current = null;
    }
    setListening(false);
  }, []);

  useEffect(() => () => {
    wsRef.current?.close();
    audioRef.current?.pause();
    srRef.current?.abort();
    mediaRef.current?.stop();
  }, []);

  return {
    connect, disconnect, send,
    messages, status, objectMeta,
    transcript, setTranscript,   // ← expose so input can be typed too
    listening, startListening, stopListening,
    browserSRSupported,
  };
}