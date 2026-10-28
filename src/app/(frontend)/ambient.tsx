'use client'

import { useEffect, useRef, useState } from 'react'

type TrackOption = {
  id: string
  name: string
  src: string
  label: string
}

const TRACKS: TrackOption[] = [
  {
    id: 'instrumental',
    name: 'See You Again (Official Instrumental)',
    src: '/audio/see-you-again-instrumental.mp3',
    label: 'Studio Instrumental',
  },
  {
    id: 'piano',
    name: 'See You Again (Acoustic Piano)',
    src: '/audio/see-you-again-piano.mp3',
    label: 'Solo Piano',
  },
]

export function AmbientAudio() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.4)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const currentTrack = TRACKS[currentTrackIndex]

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

  const switchTrack = (index: number) => {
    setCurrentTrackIndex(index)
    if (audioRef.current) {
      audioRef.current.src = TRACKS[index].src
      audioRef.current.currentTime = 0
      if (isPlaying) {
        audioRef.current.play().catch((err) => console.error(err))
      }
    }
  }

  const formatTime = (sec: number) => {
    if (isNaN(sec) || sec === 0) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-[#E6A764]/40 bg-white/[0.04] px-3.5 py-1.5 text-xs shadow-md backdrop-blur-md">
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack.src}
        loop
        preload="auto"
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration)
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Main Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="flex items-center gap-1.5 text-[#E6A764] hover:text-white transition font-medium"
        title={isPlaying ? 'Pause Instrumental' : 'Play See You Again Instrumental'}
      >
        <span className={isPlaying ? 'animate-pulse text-sm' : 'text-sm'}>
          {isPlaying ? '🎵' : '▶️'}
        </span>
        <span className="tracking-wide">
          {isPlaying ? 'See You Again' : 'Play Instrumental'}
        </span>
      </button>

      {/* When Playing: Show Track Switcher, Time & Volume */}
      {isPlaying && (
        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          {/* Track switch toggle (Official vs Piano) */}
          <div className="flex rounded-md bg-white/[0.06] p-0.5 text-[10px]">
            {TRACKS.map((track, i) => (
              <button
                key={track.id}
                onClick={() => switchTrack(i)}
                className={`rounded px-1.5 py-0.5 transition ${
                  currentTrackIndex === i
                    ? 'bg-[#E6A764] text-[#0A0E14] font-semibold'
                    : 'text-white/60 hover:text-white'
                }`}
                title={`Switch to ${track.name}`}
              >
                {track.label}
              </button>
            ))}
          </div>

          {/* Time indicator */}
          <span className="text-[10px] text-white/40 tabular-nums">
            {formatTime(currentTime)}
          </span>

          {/* Volume slider */}
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
