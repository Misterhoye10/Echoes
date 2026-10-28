'use client'

import { useEffect, useRef, useState } from 'react'

export function AmbientAudio() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [showVolume, setShowVolume] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const togglePlay = async () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (err) {
        console.error('Audio playback error:', err)
      }
    }
  }

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShowVolume(true)}
      onMouseLeave={() => setShowVolume(false)}
    >
      {/* Official "See You Again" Instrumental Audio Element */}
      <audio
        ref={audioRef}
        src="/audio/see-you-again-instrumental.mp3"
        loop
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Minimalist Sound Icon Button */}
      <button
        onClick={togglePlay}
        className={`group relative flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 ${
          isPlaying
            ? 'border-[#E6A764]/70 bg-[#E6A764]/20 text-[#E6A764] shadow-md shadow-[#E6A764]/20'
            : 'border-white/15 bg-white/[0.04] text-white/70 hover:border-[#E6A764]/50 hover:bg-white/[0.08] hover:text-[#E6A764]'
        }`}
        title={isPlaying ? 'Pause Instrumental' : 'Play "See You Again" Instrumental'}
        aria-label={isPlaying ? 'Pause music' : 'Play music'}
      >
        {isPlaying ? (
          /* Animated sound wave bars signifying playback */
          <div className="flex items-center gap-[2.5px] h-3.5 px-1">
            <span className="w-[2.5px] h-2 bg-[#E6A764] rounded-full animate-[pulse_0.7s_ease-in-out_infinite]" />
            <span className="w-[2.5px] h-3.5 bg-[#E6A764] rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.15s]" />
            <span className="w-[2.5px] h-2.5 bg-[#E6A764] rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.3s]" />
            <span className="w-[2.5px] h-3 bg-[#E6A764] rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.45s]" />
          </div>
        ) : (
          /* Elegant speaker audio icon signifying play */
          <svg
            className="h-4 w-4 transition-transform group-hover:scale-110"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 5L6 9H2v6h4l5 4V5z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.54 8.46a5 5 0 0 1 0 7.07"
              className="opacity-70"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.07 4.93a10 10 0 0 1 0 14.14"
              className="opacity-40"
            />
          </svg>
        )}
      </button>

      {/* Smooth volume slider reveals when playing or hovered */}
      {isPlaying && (
        <div className={`flex items-center pl-2 transition-all duration-300 ${showVolume ? 'opacity-100 max-w-20' : 'opacity-40 max-w-16'}`}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="h-1 w-14 accent-[#E6A764] cursor-pointer"
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
        </div>
      )}
    </div>
  )
}
