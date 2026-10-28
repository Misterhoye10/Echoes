'use client'

import { useEffect, useRef, useState } from 'react'

export function AmbientAudio() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.3)
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const chords = [
    [146.83, 220.00, 277.18, 369.99], // D maj7 (D3, A3, C#4, F#4)
    [196.00, 246.94, 293.66, 369.99], // G maj7 (G3, B3, D4, F#4)
    [123.47, 185.00, 220.00, 277.18], // B m7   (B2, F#3, A3, C#4)
    [110.00, 164.81, 220.00, 277.18], // A sus  (A2, E3, A3, C#4)
  ]

  const playChord = (chord: number[]) => {
    if (!ctxRef.current || !gainRef.current) return
    const ctx = ctxRef.current
    const now = ctx.currentTime

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const noteGain = ctx.createGain()

      osc.type = idx === 0 ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(freq, now)

      noteGain.gain.setValueAtTime(0, now)
      noteGain.gain.linearRampToValueAtTime(0.08, now + 1.2 + idx * 0.1)
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5)

      osc.connect(noteGain)
      noteGain.connect(gainRef.current!)

      osc.start(now)
      osc.stop(now + 6)
    })
  }

  const toggle = () => {
    if (isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current)
      if (ctxRef.current && ctxRef.current.state === 'running') {
        ctxRef.current.suspend()
      }
      setIsPlaying(false)
    } else {
      if (!ctxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        ctxRef.current = new AudioContextClass()
        const masterGain = ctxRef.current.createGain()
        masterGain.gain.setValueAtTime(volume, ctxRef.current.currentTime)
        masterGain.connect(ctxRef.current.destination)
        gainRef.current = masterGain
      } else if (ctxRef.current.state === 'suspended') {
        ctxRef.current.resume()
      }

      let chordIndex = 0
      playChord(chords[chordIndex])
      timerRef.current = setInterval(() => {
        chordIndex = (chordIndex + 1) % chords.length
        playChord(chords[chordIndex])
      }, 5000)

      setIsPlaying(true)
    }
  }

  useEffect(() => {
    if (gainRef.current && ctxRef.current) {
      gainRef.current.gain.setValueAtTime(volume, ctxRef.current.currentTime)
    }
  }, [volume])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (ctxRef.current) ctxRef.current.close()
    }
  }, [])

  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--gold)]/20 bg-white/5 px-3 py-1.5 text-xs">
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-[var(--gold)] hover:text-[var(--ivory)] transition"
        title={isPlaying ? 'Pause ambient atmosphere' : 'Play ambient candlelight atmosphere'}
      >
        <span>{isPlaying ? '🎵' : '🔇'}</span>
        <span className="font-medium tracking-wide">
          {isPlaying ? 'Ambient Atmosphere' : 'Play Atmosphere'}
        </span>
      </button>
      {isPlaying && (
        <input
          type="range"
          min="0.05"
          max="0.8"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="h-1 w-14 accent-[var(--gold)] cursor-pointer"
          title="Atmosphere volume"
        />
      )}
    </div>
  )
}
