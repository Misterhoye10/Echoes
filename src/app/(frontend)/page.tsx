'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  authenticateAction,
  createArchiveAction,
  deleteMemoryAction,
  loadWorkspaceAction,
  logoutAction,
  saveMemoryAction,
  updateMemoryAction,
  type EchoMemory,
} from './actions'
import { AmbientAudio } from './ambient'

type View = 'home' | 'auth' | 'archive' | 'dashboard' | 'create' | 'record' | 'people' | 'collections' | 'privacy'
type Archive = { id: string; name: string }

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    plus: 'M12 5v14M5 12h14', mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3',
    search: 'm21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', folder: 'M3 6h7l2 2h9v11H3z', play: 'm9 7 8 5-8 5z',
    pause: 'M9 7v10M15 7v10', stop: 'M8 8h8v8H8z', upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    import: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
    note: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'
  }
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24"><path d={paths[name] || paths.home} /></svg>
}

// Pre-loaded heirloom memories exactly matching your design system
const STARTER_MEMORIES: (EchoMemory & { image?: string; duration?: string; category?: string })[] = [
  {
    id: 'demo-1',
    title: "Mom's childhood stories",
    date: 'March 12, 2023',
    person: 'Mom',
    tags: ['family', 'childhood', 'stories'],
    duration: 'Audio · 12 min',
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
    story: "Every Sunday morning, Mom would gather us on the porch and tell stories about growing up in the old house by the river. 'We didn't have much,' she would say, 'but we had laughter, fresh bread, and each other.' She taught us that gratitude turns what we have into enough.",
    notes: 'Recorded on the back porch with the spring rain falling.',
  },
  {
    id: 'demo-2',
    title: "Grandma's lasagna recipe",
    date: 'Feb 28, 2023',
    person: 'Grandma Maria',
    tags: ['food', 'recipe', 'traditions'],
    duration: 'Note · 5 min',
    image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=600&q=80',
    story: "The secret is three layers of slow-simmered San Marzano tomatoes, fresh basil bruised by hand (never cut with metal), and ricotta folded with nutmeg. She told us: 'You don't rush the sauce. You let it talk to the garlic until they become friends.'",
    notes: 'Preserved handwritten recipe card from 1968.',
  },
  {
    id: 'demo-3',
    title: "Dad's life advice on courage",
    date: 'Jan 15, 2023',
    person: 'Dad',
    tags: ['wisdom', 'life', 'advice'],
    duration: 'Audio · 8 min',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80',
    story: "Dad sat down at the workbench, wiping grease off his hands with a rag. 'Son, courage isn't the absence of fear. Courage is walking straight through the trembling because what's waiting on the other side is worth it.' I still carry those words in my pocket every day.",
    notes: 'Recorded in the garage during winter break.',
  },
  {
    id: 'demo-4',
    title: "Our family trip to the mountains",
    date: 'Aug 6, 2022',
    person: 'The Family',
    tags: ['travel', 'family', 'adventure'],
    duration: 'Photo · 24 photos',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    story: "We reached the peak just as the fog broke over the valley. Everyone was exhausted, but as the golden sunlight hit our faces, we all went completely silent. Maya reached out and held Mom's hand. That was the moment time stood still.",
    notes: 'Heirloom family photo album from the Rockies trip.',
  }
]

export default function Echoes() {
  const [view, setView] = useState<View>('home')
  const [memories, setMemories] = useState<EchoMemory[]>(STARTER_MEMORIES)
  const [archives, setArchives] = useState<Archive[]>([{ id: 'family-archive', name: 'Family Archive' }])
  const [name, setName] = useState('Folarin Oyewole')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<EchoMemory | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [audioURL, setAudioURL] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [notice, setNotice] = useState('')
  const [pending, startTransition] = useTransition()
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])

  useEffect(() => {
    if (!recording || paused) return
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [recording, paused])

  const refresh = async () => {
    const workspace = await loadWorkspaceAction()
    if (!workspace.authenticated) {
      setMemories(STARTER_MEMORIES)
      setArchives([{ id: 'family-archive', name: 'Family Archive' }])
      return false
    }
    setMemories(workspace.memories.length ? workspace.memories : STARTER_MEMORIES)
    setArchives(workspace.archives.length ? workspace.archives : [{ id: 'family-archive', name: 'Family Archive' }])
    setName(workspace.name || 'Folarin Oyewole')
    return true
  }

  const enter = () => startTransition(async () => {
    const workspace = await loadWorkspaceAction()
    if (!workspace.authenticated) {
      setView('dashboard')
      return
    }
    setMemories(workspace.memories.length ? workspace.memories : STARTER_MEMORIES)
    setArchives(workspace.archives.length ? workspace.archives : [{ id: 'family-archive', name: 'Family Archive' }])
    setName(workspace.name || 'Folarin Oyewole')
    setView('dashboard')
  })

  const filtered = useMemo(() => {
    const terms = query.toLowerCase().trim()
    return memories.filter((memory) =>
      `${memory.title} ${memory.person} ${memory.date} ${memory.tags.join(' ')} ${memory.story}`
        .toLowerCase().includes(terms),
    )
  }, [memories, query])

  const startRecording = async () => {
    setNotice('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const media = new MediaRecorder(stream)
      chunks.current = []
      media.ondataavailable = (event) => chunks.current.push(event.data)
      media.onstop = () => {
        const blob = new Blob(chunks.current, { type: media.mimeType || 'audio/webm' })
        if (audioURL) URL.revokeObjectURL(audioURL)
        setAudioBlob(blob)
        setAudioURL(URL.createObjectURL(blob))
        stream.getTracks().forEach((track) => track.stop())
      }
      media.start()
      recorder.current = media
      setSeconds(0); setPaused(false); setRecording(true)
    } catch {
      setNotice('Microphone access was not granted. You can still write and save this memory.')
    }
  }

  const pauseRecording = () => {
    if (!recorder.current) return
    if (paused) recorder.current.resume()
    else recorder.current.pause()
    setPaused(!paused)
  }

  const stopRecording = () => {
    recorder.current?.stop()
    setRecording(false); setPaused(false)
  }

  if (view === 'home') return <Landing pending={pending} onEnter={enter} onSignIn={() => setView('auth')} />
  if (view === 'auth') return <Auth onBack={() => setView('home')} onSuccess={async () => {
    await refresh()
    setView('dashboard')
  }} />
  if (view === 'archive') return <ArchiveSetup name={name} onDone={async () => { await refresh(); setView('dashboard') }} />

  const navigate = (next: View) => {
    setNotice('')
    setView(next)
  }

  return (
    <main className="min-h-screen bg-[#0A0E14] text-[#E8EDF2] font-sans antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.08] bg-[#0A0E14]/90 px-6 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-xl font-medium tracking-wide text-white" onClick={() => setView('home')}>
            <span className="text-[#E6A764]">🌾</span>
            <span className="font-serif">Echoes</span>
          </button>
        </div>
        
        <div className="hidden w-full max-w-md items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 md:flex">
          <Icon name="search" />
          <input
            aria-label="Search memories"
            className="w-full bg-transparent text-xs outline-none placeholder:text-white/30 text-white"
            onChange={(event) => { setQuery(event.target.value); setView('dashboard') }}
            placeholder="Search memories, people, or tags..."
            value={query}
          />
        </div>

        <div className="flex items-center gap-3">
          <AmbientAudio />
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="h-8 w-8 rounded-full bg-[#E6A764]/20 border border-[#E6A764]/40 flex items-center justify-center text-xs font-semibold text-[#E6A764]">
              {name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'FO'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid: Sidebar + Workspace */}
      <div className="mx-auto grid max-w-[1600px] md:grid-cols-[220px_1fr]">
        {/* Left Navigation Sidebar matching Screenshot */}
        <aside className="hidden min-h-[calc(100vh-4rem)] border-r border-white/[0.08] p-4 md:flex flex-col justify-between">
          <div>
            <nav className="space-y-1">
              {[
                ['dashboard', 'home', 'Home'],
                ['dashboard', 'note', 'Memories'],
                ['people', 'users', 'People'],
                ['collections', 'folder', 'Collections'],
                ['dashboard', 'search', 'Search'],
              ].map(([key, icon, label]) => (
                <button
                  key={label}
                  onClick={() => navigate(key as View)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    (key === 'dashboard' && label === 'Home' && view === 'dashboard')
                      ? 'bg-white/[0.08] text-[#E6A764]'
                      : 'text-white/50 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <Icon name={icon} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="border-t border-white/[0.08] pt-4">
            <div className="flex items-center gap-2.5 px-2">
              <div className="h-7 w-7 rounded-full bg-[#E6A764]/20 flex items-center justify-center text-xs text-[#E6A764]">
                👤
              </div>
              <div className="text-left text-xs">
                <p className="font-medium text-white/90 leading-tight">{name}</p>
                <p className="text-[10px] text-white/40">{archives[0]?.name || 'Family Memory Archive'}</p>
              </div>
            </div>
            <button
              onClick={() => startTransition(async () => { await logoutAction(); setView('home') })}
              className="mt-3 block w-full px-2 text-left text-[11px] text-white/30 hover:text-white transition"
            >
              Sign out
            </button>
          </div>
        </aside>

        {/* Workspace Body */}
        <section className="min-w-0 p-6 md:p-8">
          {view === 'dashboard' && (
            <DashboardView
              memories={filtered}
              name={name}
              onRecord={() => navigate('record')}
              onCreate={() => navigate('create')}
              onSelect={setSelected}
            />
          )}
          {view === 'create' && (
            <CreateForm
              archives={archives}
              audioBlob={audioBlob}
              audioURL={audioURL}
              onRecord={() => navigate('record')}
              onSaved={async () => { await refresh(); setAudioBlob(null); setAudioURL(''); setView('dashboard') }}
            />
          )}
          {view === 'record' && (
            <Recorder
              audio={audioURL}
              notice={notice}
              paused={paused}
              recording={recording}
              seconds={seconds}
              onPause={pauseRecording}
              onStart={startRecording}
              onStop={stopRecording}
              useRecording={() => navigate('create')}
            />
          )}
          {view === 'people' && (
            <SimplePage
              eyebrow="People"
              title="The voices in your archive"
              copy="Honoring family elders, parents, and ancestors whose stories live on through your remembrance."
              cards={peopleCards(memories)}
            />
          )}
          {view === 'collections' && (
            <SimplePage
              eyebrow="Collections"
              title="Stories that belong together"
              copy="Themed collections grouping wisdom, holiday recipes, childhood memories, and life advice."
              cards={tagCards(memories)}
            />
          )}
          {view === 'privacy' && <Privacy memories={memories.length} />}
        </section>
      </div>

      <MobileNavigation current={view} navigate={navigate} />
      {selected && <Detail memory={selected} onClose={() => setSelected(null)} onChanged={async () => { setSelected(null); await refresh() }} />}
    </main>
  )
}

function MobileNavigation({ current, navigate }: { current: View; navigate: (view: View) => void }) {
  const items = [['dashboard','home','Home'],['record','mic','Record'],['collections','folder','Collections'],['privacy','lock','Privacy']] as [View,string,string][]
  return <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-white/10 bg-[#0A0E14]/95 p-2 backdrop-blur-xl md:hidden">{items.map(([key, icon, label]) => <button className={`flex flex-1 flex-col items-center gap-1 py-1.5 text-[10px] ${current === key ? 'text-[#E6A764]' : 'text-white/40'}`} key={key} onClick={() => navigate(key)}><Icon name={icon} />{label}</button>)}</nav>
}

// -------------------------------------------------------------
// EXACT DASHBOARD RECONSTRUCTED FROM USER'S DESIGN SCREENSHOT
// -------------------------------------------------------------
function DashboardView({
  memories,
  name,
  onRecord,
  onCreate,
  onSelect,
}: {
  memories: EchoMemory[]
  name: string
  onRecord: () => void
  onCreate: () => void
  onSelect: (m: EchoMemory) => void
}) {
  return (
    <div className="space-y-8 max-w-[1400px]">
      {/* 1. Header Greeting matching screenshot */}
      <div>
        <h2 className="text-2xl md:text-3xl font-serif font-medium text-white">Good morning, {name.split(' ')[0]}</h2>
        <p className="text-xs text-white/50 mt-1">The stories you save today, become tomorrow's legacy.</p>
      </div>

      {/* 2. Top 4 Action Cards matching screenshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <button
          onClick={onRecord}
          className="group flex flex-col items-center justify-center p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-[#E6A764]/40 transition text-center"
        >
          <div className="h-10 w-10 rounded-full bg-[#E6A764]/10 border border-[#E6A764]/20 flex items-center justify-center text-[#E6A764] mb-3 group-hover:scale-105 transition">
            <Icon name="mic" />
          </div>
          <span className="text-xs font-medium text-white">Record Audio</span>
          <span className="text-[10px] text-white/40 mt-0.5">Capture a voice or story</span>
        </button>

        <button
          onClick={onCreate}
          className="group flex flex-col items-center justify-center p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-[#E6A764]/40 transition text-center"
        >
          <div className="h-10 w-10 rounded-full bg-[#E6A764]/10 border border-[#E6A764]/20 flex items-center justify-center text-[#E6A764] mb-3 group-hover:scale-105 transition">
            <Icon name="upload" />
          </div>
          <span className="text-xs font-medium text-white">Upload File</span>
          <span className="text-[10px] text-white/40 mt-0.5">Photos, documents, video</span>
        </button>

        <button
          onClick={onCreate}
          className="group flex flex-col items-center justify-center p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-[#E6A764]/40 transition text-center"
        >
          <div className="h-10 w-10 rounded-full bg-[#E6A764]/10 border border-[#E6A764]/20 flex items-center justify-center text-[#E6A764] mb-3 group-hover:scale-105 transition">
            <Icon name="note" />
          </div>
          <span className="text-xs font-medium text-white">Add Memory</span>
          <span className="text-[10px] text-white/40 mt-0.5">Write a story or note</span>
        </button>

        <button
          onClick={onCreate}
          className="group flex flex-col items-center justify-center p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-[#E6A764]/40 transition text-center"
        >
          <div className="h-10 w-10 rounded-full bg-[#E6A764]/10 border border-[#E6A764]/20 flex items-center justify-center text-[#E6A764] mb-3 group-hover:scale-105 transition">
            <Icon name="import" />
          </div>
          <span className="text-xs font-medium text-white">Import</span>
          <span className="text-[10px] text-white/40 mt-0.5">From your device</span>
        </button>
      </div>

      {/* 3. Main Split: Recent Memories on Left + Featured Callout Card on Right */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Left Column: Recent Memories */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wide text-white">Recent Memories</h3>
            <span className="text-[11px] text-[#E6A764] cursor-pointer hover:underline">View all →</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {memories.map((m) => {
              const memory = m as EchoMemory & { image?: string; duration?: string }
              return (
                <div
                  key={memory.id}
                  onClick={() => onSelect(memory)}
                  className="group cursor-pointer rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#E6A764]/40 transition overflow-hidden flex flex-col"
                >
                  {memory.image && (
                    <div className="h-32 w-full overflow-hidden bg-black/40 relative">
                      <img
                        src={memory.image}
                        alt={memory.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-500 opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E14] via-transparent to-transparent" />
                    </div>
                  )}

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white group-hover:text-[#E6A764] transition line-clamp-1">
                        {memory.title}
                      </h4>
                      <p className="text-[10px] text-white/40 mt-1">
                        {memory.duration || 'Story'} · {memory.date}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {memory.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[9px] text-white/50"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Featured Callout matching screenshot */}
        <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-black/30 p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4">
            <div className="h-28 w-full rounded-2xl overflow-hidden bg-black/40 relative">
              <img
                src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80"
                alt="Vintage microphone and candle glow"
                className="h-full w-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E14] via-transparent to-transparent" />
              <div className="absolute bottom-2 left-3 flex items-center gap-1.5 text-xs text-[#E6A764] font-medium">
                <span>🎙️</span>
                <span>Oral Heritage</span>
              </div>
            </div>

            <h3 className="text-lg font-serif text-white">Every voice has a story.</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Record a conversation, upload a photo, or write a memory. Our AI helps you transcribe, organize and make it searchable — so nothing gets lost.
            </p>
          </div>

          <div className="mt-6 space-y-2.5">
            <button
              onClick={onRecord}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#E6A764] py-2.5 text-xs font-semibold text-[#0A0E14] hover:bg-[#F3B777] transition shadow-md"
            >
              <Icon name="mic" />
              <span>Start Recording</span>
            </button>
            <button
              onClick={onCreate}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/20 py-2.5 text-xs font-medium text-white hover:bg-white/[0.05] transition"
            >
              <Icon name="upload" />
              <span>Upload a File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Landing({ onEnter, onSignIn, pending }: { onEnter: () => void; onSignIn: () => void; pending: boolean }) {
  return (
    <main className="relative min-h-screen bg-[#0A0E14] text-[#E8EDF2] overflow-hidden">
      {/* 1. Full-screen Sunset Photograph */}
      <div className="absolute inset-0 z-0">
        <img
          alt="Mother and daughter walking along the shoreline at golden sunset"
          className="h-full w-full object-cover object-[center_35%]"
          src="/sunset.jpg"
        />
        {/* 2. Deep Cinematic Dark Overlay for Contrast & Intimacy */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E14] via-[#0A0E14]/75 to-black/50" />
        <div className="absolute inset-0 bg-radial-[at_center] from-transparent via-[#0A0E14]/40 to-[#0A0E14]/90" />
      </div>

      {/* Top Navigation */}
      <nav className="relative z-10 flex w-full items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-3">
          <span className="font-serif text-3xl font-medium tracking-wide text-[#E6A764] drop-shadow">🌾 Echoes</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Minimalist Sound Icon Button (Signifies Play / Audio) */}
          <AmbientAudio />
          <button
            className="rounded-full border border-white/20 bg-black/30 backdrop-blur-md px-5 py-1.5 text-xs font-medium text-white hover:border-[#E6A764] hover:text-[#E6A764] transition"
            disabled={pending}
            onClick={onSignIn}
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero Content with Tagline */}
      <section className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center px-6 pb-20 pt-16 md:px-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E6A764]/30 bg-black/40 backdrop-blur-md px-3.5 py-1 text-[11px] uppercase tracking-[.28em] text-[#E6A764] mb-6">
            <span>✦</span>
            <span>Family Memory Sanctuary · In Perpetual Remembrance</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.08] tracking-tight text-white drop-shadow-xl">
            Because some voices deserve to live beyond a lifetime.
          </h1>

          <p className="mt-6 max-w-xl text-base md:text-lg leading-relaxed text-white/80 drop-shadow">
            A private, AI-powered sanctuary where families safeguard authentic voices, stories, heirloom photos, and generational wisdom — without synthetic chatbot impersonation.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              className="rounded-full bg-[#E6A764] px-8 py-3.5 text-xs font-semibold text-[#0A0E14] transition hover:bg-white shadow-xl hover:scale-[1.02] duration-200"
              disabled={pending}
              onClick={onEnter}
            >
              {pending ? 'Opening archive...' : 'Enter Family Archive (Live Demo)'}
            </button>
            <button
              className="rounded-full border border-white/30 bg-black/30 backdrop-blur-md px-6 py-3.5 text-xs font-medium text-white hover:border-[#E6A764] hover:text-[#E6A764] transition"
              onClick={onEnter}
            >
              Explore Heirlooms →
            </button>
          </div>

          <p className="mt-8 text-[11px] text-white/50 tracking-wide">
            Zero advertising surveillance · Authentic ElevenLabs voice narration · Open-weight privacy
          </p>
        </div>
      </section>
    </main>
  )
}

function Auth({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => Promise<void> }) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    const data = new FormData(event.currentTarget); data.set('mode', mode)
    startTransition(async () => {
      const result = await authenticateAction(data)
      if (!result.ok) setError(result.error)
      else await onSuccess()
    })
  }
  return (
    <main className="grid min-h-screen place-items-center bg-[#0A0E14] p-5 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-7 md:p-10 backdrop-blur-xl">
        <button className="text-xs text-white/45 hover:text-white transition" onClick={onBack}>
          ← Back to Archive
        </button>
        <p className="mt-6 text-xs uppercase tracking-[.25em] text-[#E6A764]">Private family space</p>
        <h1 className="mt-2 font-serif text-3xl">{mode === 'signup' ? 'Create your archive.' : 'Welcome back.'}</h1>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === 'signup' && (
            <label className="block text-xs">
              <span className="text-white/70">Your Name</span>
              <input autoComplete="name" className="field mt-1" name="name" required placeholder="e.g. Folarin Oyewole" />
            </label>
          )}
          <label className="block text-xs">
            <span className="text-white/70">Email Address</span>
            <input autoComplete="email" className="field mt-1" name="email" required type="email" placeholder="e.g. yourname@gmail.com" />
          </label>
          <label className="block text-xs">
            <span className="text-white/70">Password</span>
            <input autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="field mt-1" minLength={6} name="password" required type="password" placeholder="At least 6 characters" />
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-xs text-red-200">{error}</p>}
          <button className="w-full rounded-full bg-[#E6A764] py-3 text-xs font-semibold text-[#0A0E14] hover:bg-white transition disabled:opacity-50" disabled={pending}>
            {pending ? 'Please wait...' : mode === 'signup' ? 'Create secure archive' : 'Sign in'}
          </button>
        </form>
        <button className="mt-5 w-full text-xs text-white/40 hover:text-white transition" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError('') }}>
          {mode === 'signup' ? 'Already have an account? Sign in' : 'New to Echoes? Create an account'}
        </button>
      </div>
    </main>
  )
}

function ArchiveSetup({ name, onDone }: { name: string; onDone: () => Promise<void> }) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  return <main className="grid min-h-screen place-items-center bg-[#0A0E14] p-5 text-white"><form className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-12" onSubmit={(event) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get('name') || ''); startTransition(async () => { const result = await createArchiveAction(value); if (result.ok) await onDone(); else setError(result.error) }) }}><p className="text-xs uppercase tracking-[.25em] text-[#E6A764]">Welcome, {name}</p><h1 className="mt-2 font-serif text-4xl">Name your family archive.</h1><p className="mt-3 text-xs text-white/50">You can begin with a family name, a household, or a branch of your story.</p><label className="mt-6 block text-xs"><span>Archive name</span><input autoFocus className="field mt-1.5" name="name" placeholder="The Rivera Family Archive" required /></label>{error && <p role="alert" className="mt-3 text-xs text-red-200">{error}</p>}<button className="mt-6 w-full rounded-full bg-[#E6A764] py-3 text-xs font-semibold text-[#0A0E14]" disabled={pending}>{pending ? 'Creating...' : 'Create archive'}</button></form></main>
}

function CreateForm({ archives, audioBlob, audioURL, onRecord, onSaved }: { archives: Archive[]; audioBlob: Blob | null; audioURL: string; onRecord: () => void; onSaved: () => Promise<void> }) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [person, setPerson] = useState('')
  const [story, setStory] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [aiNotes, setAiNotes] = useState('')

  const handleAiAssist = async () => {
    if (!story) {
      setError('Please type some memory text or story first so the AI can analyze it.')
      return
    }
    setAnalyzing(true); setError('')
    try {
      const res = await fetch('/api/analyze-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, story, person })
      })
      const data = await res.json()
      if (data.success && data.analysis) {
        const a = data.analysis
        const note = `[Open-Weight AI Tribute]:\n${a.summary || ''}\n\n[Core Wisdom]:\n"${a.wisdom || ''}"\n\n[Timeline]: ${a.timeline || 'Unspecified'}`
        setAiNotes(note)
      } else {
        setError(data.error || 'AI analysis could not complete.')
      }
    } catch {
      setError('Failed to reach AI service.')
    } finally {
      setAnalyzing(false)
    }
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    const data = new FormData(event.currentTarget)
    if (audioBlob) data.set('audio', new File([audioBlob], 'family-memory.webm', { type: audioBlob.type || 'audio/webm' }))
    if (aiNotes) data.set('notes', aiNotes)
    startTransition(async () => {
      const result = await saveMemoryAction(data)
      if (!result.ok) setError(result.error)
      else await onSaved()
    })
  }

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[.25em] text-[#E6A764]">Preserve a Remembrance</p>
      <h2 className="mt-2 font-serif text-3xl">Add to your family archive.</h2>
      
      <form className="mt-6 space-y-5" onSubmit={submit}>
        <input type="hidden" name="archive" value={archives[0]?.id || 'family-archive'} />

        <label className="block text-xs">
          <span className="font-medium">Memory Title *</span>
          <input className="field mt-1.5" name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mom's Recipe for Sunday Stew" required />
        </label>

        <div className="grid gap-3.5 md:grid-cols-2">
          <label className="block text-xs">
            <span className="font-medium">Whose Voice / Story?</span>
            <input className="field mt-1.5" name="person" value={person} onChange={(e) => setPerson(e.target.value)} placeholder="e.g. Mom, Maya, Grandpa Joe" />
          </label>
          <label className="block text-xs">
            <span className="font-medium">Memory Date / Year</span>
            <input className="field mt-1.5" name="date" type="date" />
          </label>
        </div>

        <label className="block text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium">The Story & Real Words *</span>
            <button
              type="button"
              onClick={handleAiAssist}
              disabled={analyzing}
              className="flex items-center gap-1.5 text-xs text-[#E6A764] hover:underline disabled:opacity-50"
            >
              <span>✨</span>
              <span>{analyzing ? 'Extracting Wisdom with Gemma AI...' : 'Auto-Extract Wisdom & Tags (AI)'}</span>
            </button>
          </div>
          <textarea
            className="field mt-1.5 min-h-40"
            name="story"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Write down the exact words, laughter, advice, or moment that you never want to forget..."
            required
          />
        </label>

        {aiNotes && (
          <div className="rounded-2xl border border-[#E6A764]/30 bg-[#E6A764]/10 p-4">
            <p className="text-[10px] uppercase tracking-widest text-[#E6A764] font-semibold">✨ Open-Weight AI Memory Analysis</p>
            <p className="mt-1.5 text-xs leading-relaxed text-white/80 whitespace-pre-wrap">{aiNotes}</p>
          </div>
        )}

        <label className="block text-xs">
          <span className="font-medium">Heirloom Tags (comma-separated)</span>
          <input className="field mt-1.5" name="tags" placeholder="recipes, childhood, advice, holiday, laughter" />
        </label>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Voice Recording</p>
              <p className="text-[10px] text-white/40">{audioURL ? 'Voice recording attached ✓' : 'Add an authentic voice recording'}</p>
            </div>
            <button type="button" className="rounded-full border border-white/20 px-3 py-1 text-xs hover:border-[#E6A764] hover:text-[#E6A764] transition" onClick={onRecord}>
              {audioURL ? 'Re-record' : 'Record voice'}
            </button>
          </div>
          {audioURL && <audio className="mt-3 w-full" controls src={audioURL} />}
        </div>

        {error && <p role="alert" className="text-xs text-red-200">{error}</p>}

        <button className="w-full rounded-full bg-[#E6A764] py-3 text-xs font-semibold text-[#0A0E14] hover:bg-white transition disabled:opacity-50" disabled={pending}>
          {pending ? 'Saving to Archive...' : 'Preserve Memory Forever'}
        </button>
      </form>
    </div>
  )
}

function Recorder({ audio, notice, paused, recording, seconds, onPause, onStart, onStop, useRecording }: { audio: string; notice: string; paused: boolean; recording: boolean; seconds: number; onPause: () => void; onStart: () => void; onStop: () => void; useRecording: () => void }) {
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="max-w-xl text-center mx-auto py-10">
      <p className="text-[11px] uppercase tracking-[.25em] text-[#E6A764]">Voice of Remembrance</p>
      <h2 className="mt-2 font-serif text-4xl">Capture their voice.</h2>
      <p className="mt-2 text-xs text-white/50">Speak naturally. Tell a favorite story, a habit, or a lesson they passed down.</p>

      <div className="my-10">
        <div className={`mx-auto flex h-32 w-32 items-center justify-center rounded-full border-2 transition-all ${recording ? 'border-red-400 bg-red-500/10 scale-105 animate-pulse' : 'border-[#E6A764]/40 bg-[#E6A764]/5'}`}>
          <span className="font-mono text-2xl font-medium text-[#E6A764]">{formatTime(seconds)}</span>
        </div>
        {recording && <p className="mt-3 text-[10px] tracking-widest uppercase text-red-400">● Live Recording</p>}
      </div>

      <div className="flex justify-center gap-3">
        {!recording ? (
          <button className="rounded-full bg-[#E6A764] px-7 py-3 text-xs font-semibold text-[#0A0E14] hover:bg-white transition" onClick={onStart}>
            Start Recording
          </button>
        ) : (
          <>
            <button className="rounded-full border border-white/20 px-5 py-2.5 text-xs hover:bg-white/10" onClick={onPause}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button className="rounded-full bg-red-400 px-5 py-2.5 text-xs font-semibold text-[#0A0E14]" onClick={onStop}>
              Stop & Save
            </button>
          </>
        )}
      </div>

      {audio && (
        <div className="mt-8 rounded-2xl border border-[#E6A764]/30 bg-[#E6A764]/5 p-5">
          <p className="text-[10px] uppercase tracking-widest text-[#E6A764] font-medium">Recording Preview</p>
          <audio className="mt-2.5 w-full" controls src={audio} />
          <button className="mt-4 rounded-full bg-[#E6A764] px-6 py-2.5 text-xs font-semibold text-[#0A0E14]" onClick={useRecording}>
            Use This Recording in Memory →
          </button>
        </div>
      )}

      {notice && <p role="alert" className="mt-3 text-xs text-amber-200">{notice}</p>}
    </div>
  )
}

function Detail({ memory, onClose, onChanged }: { memory: EchoMemory; onClose: () => void; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  
  const [narrationUrl, setNarrationUrl] = useState('')
  const [narrating, setNarrating] = useState(false)
  const [narrationError, setNarrationError] = useState('')

  const [aiAnalysis, setAiAnalysis] = useState<{
    summary?: string
    wisdom?: string
    people?: string[]
    tags?: string[]
    timeline?: string
  } | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  const handleNarrate = async () => {
    if (narrationUrl) return
    setNarrating(true); setNarrationError('')
    try {
      const res = await fetch('/api/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: memory.story })
      })
      if (!res.ok) {
        throw new Error('Narration generation failed.')
      }
      const blob = await res.blob()
      setNarrationUrl(URL.createObjectURL(blob))
    } catch (e: unknown) {
      setNarrationError(e instanceof Error ? e.message : 'Could not narrate story.')
    } finally {
      setNarrating(false)
    }
  }

  const handleAnalyze = async () => {
    if (aiAnalysis) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: memory.title, story: memory.story, person: memory.person })
      })
      const data = await res.json()
      if (data.success && data.analysis) {
        setAiAnalysis(data.analysis)
      }
    } catch {
      console.error('Failed to run AI analysis')
    } finally {
      setAnalyzing(false)
    }
  }

  const update = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await updateMemoryAction(memory.id, data)
      if (result.ok) await onChanged()
      else setError(result.error)
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur-md md:p-10 flex items-center justify-center">
      <article className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0E131A] p-6 md:p-8 shadow-2xl relative">
        <div className="flex justify-end gap-2">
          <button className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-white/30" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : 'Edit story'}
          </button>
          <button className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-white/30" onClick={onClose}>
            Close ✕
          </button>
        </div>

        {editing ? (
          <form className="mt-5 space-y-4" onSubmit={update}>
            <label className="block text-xs"><span>Title</span><input className="field mt-1" defaultValue={memory.title} name="title" required /></label>
            <label className="block text-xs"><span>Person</span><input className="field mt-1" defaultValue={memory.person === 'Unassigned' ? '' : memory.person} name="person" /></label>
            <label className="block text-xs"><span>Memory</span><textarea className="field mt-1 min-h-40" defaultValue={memory.story} name="story" required /></label>
            <label className="block text-xs"><span>Private notes</span><textarea className="field mt-1 min-h-24" defaultValue={memory.notes} name="notes" /></label>
            {error && <p role="alert" className="text-xs text-red-200">{error}</p>}
            <button className="w-full rounded-full bg-[#E6A764] py-2.5 text-xs font-semibold text-[#0A0E14]" disabled={pending}>
              {pending ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        ) : (
          <>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-[#E6A764] font-medium">✦ {memory.date} · {memory.person}</p>
            <h2 className="mt-2 font-serif text-2xl md:text-4xl text-white">{memory.title}</h2>
            
            {/* The Real Words */}
            <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <p className="whitespace-pre-wrap text-sm md:text-base leading-relaxed text-white/80 font-serif italic">
                "{memory.story}"
              </p>
            </div>

            {/* Authentic Audio Recording if attached */}
            {memory.audio && (
              <div className="mt-5 rounded-2xl border border-white/10 p-3.5 bg-black/30">
                <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1.5">Original Voice Recording</p>
                <audio className="w-full" controls src={memory.audio} />
              </div>
            )}

            {/* ElevenLabs Remembrance Narration Feature */}
            <div className="mt-5 rounded-2xl border border-[#E6A764]/30 bg-[#E6A764]/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span>🎙️</span>
                    <p className="font-medium text-xs text-[#E6A764]">ElevenLabs Voice Narration</p>
                  </div>
                  <p className="text-[11px] text-white/50 mt-0.5">Hear this memory spoken in a gentle, warm commemorative voice.</p>
                </div>
                {!narrationUrl && (
                  <button
                    onClick={handleNarrate}
                    disabled={narrating}
                    className="rounded-full bg-[#E6A764] px-4 py-1.5 text-xs font-semibold text-[#0A0E14] hover:bg-white transition disabled:opacity-50"
                  >
                    {narrating ? 'Generating Voice...' : 'Listen to Narration'}
                  </button>
                )}
              </div>

              {narrationUrl && (
                <div className="mt-3 pt-2.5 border-t border-[#E6A764]/20">
                  <p className="text-[10px] text-[#E6A764] font-medium mb-1">✦ Remembrance Voice Playing:</p>
                  <audio className="w-full" autoPlay controls src={narrationUrl} />
                </div>
              )}
              {narrationError && <p className="mt-2 text-xs text-red-300">{narrationError}</p>}
            </div>

            {/* Open-Weight AI (Gemma/Qwen) Wisdom Extraction Feature */}
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span>🧠</span>
                  <p className="font-medium text-xs text-white/90">Open-Weight AI Wisdom & Tribute</p>
                </div>
                {!aiAnalysis && (
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E6A764] hover:border-[#E6A764] transition disabled:opacity-50"
                  >
                    {analyzing ? 'Analyzing with AI...' : 'Reveal Wisdom'}
                  </button>
                )}
              </div>

              {aiAnalysis ? (
                <div className="mt-3 space-y-2.5 pt-2.5 border-t border-white/10 text-xs">
                  {aiAnalysis.wisdom && (
                    <div className="rounded-xl bg-[#E6A764]/10 border border-[#E6A764]/20 p-2.5">
                      <p className="text-[9px] uppercase tracking-wider text-[#E6A764] font-semibold">Core Life Lesson</p>
                      <p className="text-xs font-serif italic text-white/90 mt-0.5">"{aiAnalysis.wisdom}"</p>
                    </div>
                  )}
                  {aiAnalysis.summary && (
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-white/40">Memorial Tribute</p>
                      <p className="text-white/70 mt-0.5 leading-relaxed">{aiAnalysis.summary}</p>
                    </div>
                  )}
                  {aiAnalysis.tags && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {aiAnalysis.tags.map((t) => (
                        <span key={t} className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-[#E6A764]">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-white/45 mt-1.5">
                  Click 'Reveal Wisdom' to have open-weight AI extract the deeper life lesson and commemorative tribute from these words.
                </p>
              )}
            </div>

            {/* Tags */}
            <div className="mt-5 flex flex-wrap gap-1.5">
              {memory.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] text-white/60">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
              <button
                className="text-[11px] text-red-300 hover:text-red-200 underline underline-offset-4"
                disabled={pending}
                onClick={() => {
                  if (window.confirm('Permanently delete this memory? This cannot be undone.')) {
                    startTransition(async () => {
                      const result = await deleteMemoryAction(memory.id)
                      if (result.ok) await onChanged()
                      else setError(result.error)
                    })
                  }
                }}
              >
                Delete memory
              </button>
              <button className="rounded-full bg-white/10 px-4 py-1.5 text-xs hover:bg-white/20 transition" onClick={onClose}>
                Back to Archive
              </button>
            </div>
            {error && <p role="alert" className="mt-3 text-xs text-red-200">{error}</p>}
          </>
        )}
      </article>
    </div>
  )
}

function peopleCards(memories: EchoMemory[]) {
  const counts = new Map<string, number>()
  memories.forEach((memory) => { if (memory.person && memory.person !== 'Unassigned') counts.set(memory.person, (counts.get(memory.person) || 0) + 1) })
  return [...counts].map(([person, count]) => `${person} · ${count} ${count === 1 ? 'memory' : 'memories'}`)
}

function tagCards(memories: EchoMemory[]) {
  const counts = new Map<string, number>()
  memories.flatMap((memory) => memory.tags).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1))
  return [...counts].map(([tag, count]) => `${tag} · ${count} ${count === 1 ? 'story' : 'stories'}`)
}

function SimplePage({ eyebrow, title, copy, cards }: { eyebrow: string; title: string; copy: string; cards: string[] }) {
  return <div><p className="text-xs uppercase tracking-[.25em] text-[#E6A764]">{eyebrow}</p><h2 className="mt-2 font-serif text-4xl text-white">{title}</h2><p className="mt-2 max-w-xl text-xs text-white/50">{copy}</p>{cards.length ? <div className="mt-8 grid gap-4 md:grid-cols-3">{cards.map((card) => <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" key={card}><div className="mb-8 h-10 w-10 rounded-full bg-[#E6A764]/20 flex items-center justify-center text-sm text-[#E6A764]">✦</div><h3 className="font-serif text-lg text-white">{card}</h3><p className="mt-1 text-[11px] text-white/40">Generated from saved memories</p></div>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/40 text-xs">No saved memories to organize yet.</div>}</div>
}

function Privacy({ memories }: { memories: number }) {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[.25em] text-[#E6A764]">Privacy & Sovereignty</p>
        <h2 className="mt-2 font-serif text-4xl text-white">Your stories, under your control.</h2>
      </div>
      <div className="space-y-3.5">
        {[
          ['Sovereign Memory Storage', `${memories} preserved memories are scoped to your private session. Your recordings and photos are stored securely and never harvested for advertising.`],
          ['Open-Weight AI Architecture', 'Memory summarization and wisdom extraction are powered by genuine open-weight models (Qwen/Gemma). You have the option to run them locally on your own machine without sending data to closed corporate clouds.'],
          ['ElevenLabs Voice Security', 'Voice narrations are synthesized on-demand with state-of-the-art neural speech. Audio streams are encrypted in transit and never used to clone unconsented voices.'],
          ['Permanent Deletion & Portability', 'You retain total ownership of every syllable. You can edit, delete, or export your family archive at any moment.']
        ].map(([title, copy]) => (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" key={title}>
            <h3 className="font-serif text-lg text-[#E6A764]">{title}</h3>
            <p className="mt-1.5 leading-relaxed text-xs text-white/70">{copy}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
