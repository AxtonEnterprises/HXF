import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const defaultHXF = {
  format: 'HXF',
  version: '0.1',
  sampleRate: 44100,
  duration: 4,
  title: 'Helix Test Pattern',
  frames: [
    {
      time: 0,
      duration: 1,
      harmonics: [
        { id: 1, frequency: 220, amplitude: 0.35, phase: 0 },
        { id: 2, frequency: 440, amplitude: 0.18, phase: 0.5 },
        { id: 3, frequency: 660, amplitude: 0.08, phase: 1.2 }
      ]
    },
    {
      time: 1,
      duration: 1,
      harmonics: [
        { id: 1, frequency: 246.94, amplitude: 0.35, phase: 0 },
        { id: 2, frequency: 493.88, amplitude: 0.18, phase: 0.5 },
        { id: 3, frequency: 740.82, amplitude: 0.08, phase: 1.2 }
      ]
    },
    {
      time: 2,
      duration: 1,
      harmonics: [
        { id: 1, frequency: 261.63, amplitude: 0.35, phase: 0 },
        { id: 2, frequency: 523.26, amplitude: 0.18, phase: 0.5 },
        { id: 3, frequency: 784.89, amplitude: 0.08, phase: 1.2 }
      ]
    },
    {
      time: 3,
      duration: 1,
      harmonics: [
        { id: 1, frequency: 329.63, amplitude: 0.35, phase: 0 },
        { id: 2, frequency: 659.26, amplitude: 0.18, phase: 0.5 },
        { id: 3, frequency: 988.89, amplitude: 0.08, phase: 1.2 }
      ]
    }
  ]
};

function synthesizeHXF(hxf) {
  const sampleRate = hxf.sampleRate || 44100;
  const totalSamples = Math.floor(hxf.duration * sampleRate);
  const audioData = new Float32Array(totalSamples);

  for (const frame of hxf.frames) {
    const startSample = Math.floor(frame.time * sampleRate);
    const frameSamples = Math.floor(frame.duration * sampleRate);

    for (let i = 0; i < frameSamples; i++) {
      const globalIndex = startSample + i;
      if (globalIndex >= totalSamples) break;

      const t = i / sampleRate;
      const fadeIn = Math.min(1, i / 800);
      const fadeOut = Math.min(1, (frameSamples - i) / 800);
      const envelope = fadeIn * fadeOut;

      let sample = 0;

      for (const h of frame.harmonics) {
        const angle = 2 * Math.PI * h.frequency * t + h.phase;

        const cosineStrand = Math.cos(angle);
        const sineStrand = Math.sin(angle);

        // The cosine side becomes audible pressure.
        // The sine side preserves the paired helix/quadrature strand.
        sample += h.amplitude * cosineStrand;

        // You can experiment by blending in the sine strand:
        // sample += h.amplitude * 0.25 * sineStrand;
      }

      audioData[globalIndex] += sample * envelope;
    }
  }

  return audioData;
}

function playHXF(hxf) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioContext();

  const samples = synthesizeHXF(hxf);
  const buffer = ctx.createBuffer(1, samples.length, hxf.sampleRate);

  buffer.copyToChannel(samples, 0);

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();

  gain.gain.value = 0.75;

  source.buffer = buffer;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();

  return { ctx, source };
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function App() {
  const [hxfText, setHxfText] = useState(JSON.stringify(defaultHXF, null, 2));
  const [status, setStatus] = useState('Ready');
  const audioRef = useRef(null);

  function getParsedHXF() {
    try {
      return JSON.parse(hxfText);
    } catch {
      setStatus('Invalid HXF JSON');
      return null;
    }
  }

  function handlePlay() {
    const hxf = getParsedHXF();
    if (!hxf) return;

    try {
      if (audioRef.current?.ctx) {
        audioRef.current.ctx.close();
      }

      audioRef.current = playHXF(hxf);
      setStatus(`Playing: ${hxf.title || 'Untitled HXF'}`);
    } catch (err) {
      console.error(err);
      setStatus('Playback failed');
    }
  }

  function handleStop() {
    try {
      audioRef.current?.source?.stop();
      audioRef.current?.ctx?.close();
      setStatus('Stopped');
    } catch {
      setStatus('Stopped');
    }
  }

  function handleDownload() {
    const hxf = getParsedHXF();
    if (!hxf) return;

    downloadJSON(hxf, `${hxf.title || 'harmonic-helix'}.hxf.json`);
  }

  return (
    <main className="app">
      <section className="hero">
        <h1>Harmonic Helix</h1>
        <p>
          Experimental audio format prototype based on sine and cosine harmonic
          strands.
        </p>
      </section>

      <section className="controls">
        <button onClick={handlePlay}>Play Helix</button>
        <button onClick={handleStop}>Stop</button>
        <button onClick={handleDownload}>Download HXF</button>
      </section>

      <p className="status">{status}</p>

      <section className="panel">
        <h2>HXF Data</h2>
        <textarea
          value={hxfText}
          onChange={(e) => setHxfText(e.target.value)}
          spellCheck="false"
        />
      </section>

      <section className="panel">
        <h2>Format Idea</h2>
        <pre>{`sample(t) = Σ amplitude × cos(2π × frequency × t + phase)

x(t) = amplitude × cos(2πft + phase)
y(t) = amplitude × sin(2πft + phase)`}</pre>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
