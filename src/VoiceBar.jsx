import React, { useState, useEffect, useRef, useCallback } from 'react';
import { startRecording } from './audioUtils';

const S = { IDLE: 'idle', RECORDING: 'recording', PROCESSING: 'processing', DONE: 'done', ERROR: 'error' };

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function VoiceBar({ currentStep, onFieldsExtracted }) {
  const [state, setState] = useState(S.IDLE);
  const [transcript, setTranscript] = useState('');
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [secs, setSecs] = useState(0);
  const recRef = useRef(null);
  const timerRef = useRef(null);
  const secsRef = useRef(0);

  const startRec = useCallback(async () => {
    try {
      setState(S.RECORDING);
      setTranscript(''); setFields({}); setError('');
      secsRef.current = 0; setSecs(0);
      timerRef.current = setInterval(() => { secsRef.current++; setSecs(secsRef.current); }, 1000);
      recRef.current = await startRecording();
    } catch (err) {
      setState(S.ERROR);
      setError(err.message.includes('ermission') ? 'Microphone access denied — check browser permissions.' : err.message);
    }
  }, []);

  const stopRec = useCallback(async () => {
    if (!recRef.current) return;
    clearInterval(timerRef.current);
    setState(S.PROCESSING);
    try {
      const wav = await recRef.current.stop();
      recRef.current = null;

      const tRes = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transcribe', audio: wav.base64 }),
      });
      const tData = await tRes.json();
      if (!tRes.ok) throw new Error(tData.error || 'Transcription failed');

      const text = tData.transcript || '';

      const eRes = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract', transcript: text, step: currentStep }),
      });
      const eData = await eRes.json();

      setTranscript(text);
      setFields(eData.fields || {});
      setState(S.DONE);
    } catch (err) {
      setState(S.ERROR);
      setError(err.message);
    }
  }, [currentStep]);

  const apply = useCallback(() => {
    onFieldsExtracted(fields);
    setState(S.IDLE); setTranscript(''); setFields({});
  }, [fields, onFieldsExtracted]);

  const discard = useCallback(() => {
    setState(S.IDLE); setTranscript(''); setFields({});
  }, []);

  // Space key shortcut — toggle recording when not in a form element
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space') return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
      e.preventDefault();
      if (state === S.IDLE) startRec();
      else if (state === S.RECORDING) stopRec();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, startRec, stopRec]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (recRef.current) recRef.current.stop().catch(() => {});
  }, []);

  const fieldCount = Object.keys(fields).length;

  return (
    <div className={`voice-bar voice-bar--${state}`} aria-label="Voice input">

      {state === S.IDLE && (
        <button className="voice-btn voice-btn--idle" onClick={startRec} title="Start voice input (Space)">
          <MicIcon /> <span className="voice-btn__label">Voice</span>
        </button>
      )}

      {state === S.RECORDING && (
        <div className="voice-bar__pill">
          <span className="voice-bar__rec-dot" />
          <span className="voice-bar__rec-label">Recording {fmt(secs)}</span>
          <button className="voice-btn voice-btn--stop" onClick={stopRec} title="Stop (Space)">
            <StopIcon /> Done
          </button>
        </div>
      )}

      {state === S.PROCESSING && (
        <div className="voice-bar__pill">
          <div className="voice-bar__spinner" />
          <span className="voice-bar__status">Transcribing…</span>
        </div>
      )}

      {state === S.DONE && (
        <div className="voice-bar__result">
          <p className="voice-bar__transcript">{transcript || '(no speech detected)'}</p>
          {fieldCount > 0 && (
            <p className="voice-bar__field-count">{fieldCount} field{fieldCount !== 1 ? 's' : ''} extracted</p>
          )}
          <div className="voice-bar__actions">
            <button className="voice-btn voice-btn--discard" onClick={discard}>Discard</button>
            {fieldCount > 0 && (
              <button className="voice-btn voice-btn--apply" onClick={apply}>
                Apply {fieldCount} field{fieldCount !== 1 ? 's' : ''}
              </button>
            )}
            <button className="voice-btn voice-btn--idle" onClick={startRec} title="Record again" style={{ padding: '8px 10px' }}>
              <MicIcon />
            </button>
          </div>
        </div>
      )}

      {state === S.ERROR && (
        <div className="voice-bar__pill voice-bar__pill--error">
          <span className="voice-bar__error">{error}</span>
          <button className="voice-btn voice-btn--idle" onClick={() => { setState(S.IDLE); setError(''); }}
            style={{ padding: '6px 12px', fontSize: '12px' }}>
            Retry
          </button>
        </div>
      )}

    </div>
  );
}

const MicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const StopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
  </svg>
);
