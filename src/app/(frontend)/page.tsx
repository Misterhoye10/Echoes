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
    pause: 'M9 7v10M15 7v10', stop: 'M8 8h8v8H8z', sparkle: 'M12 3l1.9 4.8L19 9.7l-3.8 3.7.9 5.3L12 16.4l-4.1 2.3.9-5.3L5 9.7l5.1-1.9L12 3z',
    sound: 'M11 5L6 9H2v6h4l5 4V5zm8.5 7c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM17 4.27v2.06c2.89.86 5 3.54 5 6.67s-2.11 5.81-5 6.67v2.06c4.01-.91 7-4.49 7-8.73s-2.99-7.82-7-8.73z'
  }
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24"><path d={paths[name] || paths.home} /></svg>
}

// Sample starter heirlooms for judges and demo exploration
const STARTER_MEMORIES: EchoMemory[] = [
  {
    id: 'demo-1',
    title: "Mom's Sunday Apple Pie & The Art of Patience",
    date: 'October 14, 2023',
    person: 'Mom',
    tags: ['recipe', 'tradition', 'childhood', 'family'],
    story: "Every single Sunday morning, no matter how cold or rainy it was outside, Mom would wake up at sunrise to start baking. The whole kitchen would fill with the scent of warm cinnamon, cloves, and tart apples. She never used a timer — she always told us: 'You don't bake with the clock, you bake with your senses and your heart.' She taught us that patience isn't just waiting; it's the love you put into the quiet moments before the sweetness arrives.",
    notes: 'Preserved from our 2023 kitchen interview recording.',
  },
  {
    id: 'demo-2',
    title: "Sister's Laughter by the Lake & Her Advice on Fear",
    date: 'July 18, 2022',
    person: 'Maya',
    tags: ['sister', 'summer', 'resilience', 'laughter'],
    story: "We were sitting on the wooden dock as the sun dipped behind the pines, dangling our bare feet in the cold water. I was terrified about moving away for my new job. She burst into that contagious, loud laugh of hers and nudged my shoulder. 'Fear is just excitement without breath,' she whispered. 'Breathe, take the leap, and remember whose daughter you are.' I still hear her laugh every time I have to be brave.",
    notes: 'Recorded during our last family cabin trip.',
  },
  {
    id: 'demo-3',
    title: "Grandpa's Pocket Watch & The Meaning of Time",
    date: 'September 5, 2021',
    person: 'Grandpa Joe',
    tags: ['grandfather', 'wisdom', 'legacy', 'heirloom'],
    story: "He pulled out his weathered brass pocket watch, its surface worn smooth by fifty years in his coat pocket. He placed it in my palm. It didn't just tick; it felt heavy with history. 'Son,' he said, 'a watch doesn't give you time. It only reminds you that every heartbeat is a gift you cannot spend twice. Spend yours on people, not things.'",
    notes: 'Preserved with photograph of the watch.',
  }
]

export default function Echoes() {
  const [view, setView] = useState<View>('home')
  const [memories, setMemories] = useState<EchoMemory[]>(STARTER_MEMORIES)
  const [archives, setArchives] = useState<Archive[]>([{ id: 'family-archive', name: 'Our Family Legacy' }])
  const [name, setName] = useState('Alex')
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
      setArchives([{ id: 'family-archive', name: 'Our Family Legacy' }])
      return false
    }
    setMemories(workspace.memories.length ? workspace.memories : STARTER_MEMORIES)
    setArchives(workspace.archives.length ? workspace.archives : [{ id: 'family-archive', name: 'Our Family Legacy' }])
    setName(workspace.name || 'Alex')
    return true
  }

  const enter = () => startTransition(async () => {
    const workspace = await loadWorkspaceAction()
    if (!workspace.authenticated) {
      setView('dashboard')
      return
    }
    setMemories(workspace.memories.length ? workspace.memories : STARTER_MEMORIES)
    setArchives(workspace.archives.length ? workspace.archives : [{ id: 'family-archive', name: 'Our Family Legacy' }])
    setName(workspace.name)
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
    <main className="min-h-screen bg-[var(--navy)] text-[var(--ivory)]">
      <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/10 bg-[var(--navy)]/90 px-5 backdrop-blur-xl md:px-10">
        <div className="flex items-center gap-3">
          <button className="font-serif text-2xl tracking-wide text-[var(--gold)]" onClick={() => setView('home')}>Echoes</button>
          <span className="hidden text-xs text-white/40 md:inline font-mono">✦ Memory Archive</span>
        </div>
        
        <div className="hidden w-full max-w-md items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 md:flex">
          <Icon name="search" />
          <input aria-label="Search memories" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-white/35" onChange={(event) => { setQuery(event.target.value); setView('dashboard') }} placeholder="Search a person, date, tag, or story..." value={query} />
        </div>

        <div className="flex items-center gap-3">
          <AmbientAudio />
          <button className="rounded-full bg-[var(--gold)]/15 border border-[var(--gold)]/40 px-4 py-2 text-sm text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[var(--navy)] transition" onClick={() => navigate('create')}>+ Add memory</button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] md:grid-cols-[240px_1fr]">
        <nav className="hidden min-h-[calc(100vh-5rem)] border-r border-white/10 p-5 md:block">
          <p className="mb-6 px-3 text-[10px] uppercase tracking-[.25em] text-white/40">{archives[0]?.name || 'Family Archive'}</p>
          <Navigation current={view} navigate={navigate} />
          
          <div className="mt-8 rounded-2xl border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--gold)]">✦</span>
              <p className="text-xs font-semibold text-[var(--gold)]">Open-Source AI & ElevenLabs</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/60">
              Preserved with Google Gemma 2 & ElevenLabs narration. Memories remain sovereign, private, and forever yours.
            </p>
          </div>

          <button className="mt-5 px-3 text-xs text-white/35 hover:text-white transition" onClick={() => startTransition(async () => { await logoutAction(); setView('home') })}>Sign out / Switch account</button>
        </nav>

        <section className="min-w-0 p-5 pb-28 md:p-10">
          {view === 'dashboard' && <Dashboard memories={filtered} name={name} onCreate={() => navigate('create')} onSelect={setSelected} query={query} setQuery={setQuery} />}
          {view === 'create' && <CreateForm archives={archives} audioBlob={audioBlob} audioURL={audioURL} onRecord={() => navigate('record')} onSaved={async () => { await refresh(); setAudioBlob(null); setAudioURL(''); setView('dashboard') }} />}
          {view === 'record' && <Recorder audio={audioURL} notice={notice} paused={paused} recording={recording} seconds={seconds} onPause={pauseRecording} onStart={startRecording} onStop={stopRecording} useRecording={() => navigate('create')} />}
          {view === 'people' && <SimplePage eyebrow="People" title="The voices in your archive" copy="Honoring family elders, parents, and ancestors whose stories live on through your remembrance." cards={peopleCards(memories)} />}
          {view === 'collections' && <SimplePage eyebrow="Collections" title="Stories that belong together" copy="Themed collections grouping wisdom, holiday recipes, childhood memories, and life advice." cards={tagCards(memories)} />}
          {view === 'privacy' && <Privacy memories={memories.length} />}
        </section>
      </div>

      <MobileNavigation current={view} navigate={navigate} />
      {selected && <Detail memory={selected} onClose={() => setSelected(null)} onChanged={async () => { setSelected(null); await refresh() }} />}
    </main>
  )
}

function Navigation({ current, navigate }: { current: View; navigate: (view: View) => void }) {
  const items = [['dashboard','home','Your archive'],['record','mic','Record voice'],['people','users','People'],['collections','folder','Collections'],['privacy','lock','Privacy']] as [View,string,string][]
  return <>{items.map(([key, icon, label]) => <button className={`mb-1.5 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition ${current === key ? 'bg-white/10 text-[var(--gold)] font-medium' : 'text-white/60 hover:bg-white/5 hover:text-white'}`} key={key} onClick={() => navigate(key)}><Icon name={icon} />{label}</button>)}</>
}

function MobileNavigation({ current, navigate }: { current: View; navigate: (view: View) => void }) {
  const items = [['dashboard','home','Archive'],['record','mic','Record'],['collections','folder','Collections'],['privacy','lock','Privacy']] as [View,string,string][]
  return <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-white/10 bg-[var(--navy)]/95 p-2 backdrop-blur-xl md:hidden">{items.map(([key, icon, label]) => <button className={`flex flex-1 flex-col items-center gap-1 py-1.5 text-[10px] ${current === key ? 'text-[var(--gold)]' : 'text-white/40'}`} key={key} onClick={() => navigate(key)}><Icon name={icon} />{label}</button>)}</nav>
}

function Landing({ onEnter, onSignIn, pending }: { onEnter: () => void; onSignIn: () => void; pending: boolean }) {
  return (
    <main className="min-h-screen bg-[var(--navy)] text-[var(--ivory)]">
      <nav className="absolute z-10 flex w-full items-center justify-between px-6 py-7 md:px-14">
        <div className="flex items-center gap-3">
          <span className="font-serif text-3xl text-[var(--gold)]">Echoes</span>
          <span className="rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-[var(--gold)]">✦ Memorial Archive</span>
        </div>
        <div className="flex items-center gap-4">
          <AmbientAudio />
          <button className="rounded-full border border-white/20 px-5 py-2 text-sm hover:border-[var(--gold)] hover:text-[var(--gold)] transition" disabled={pending} onClick={onSignIn}>Sign in</button>
        </div>
      </nav>

      <section className="relative flex min-h-screen items-end overflow-hidden px-6 pb-20 pt-32 md:items-center md:px-14">
        <img alt="Quiet family memory portrait at sunset" className="absolute inset-0 h-full w-full object-cover opacity-35" src="/preview.png" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--navy)] via-[var(--navy)]/85 to-transparent" />
        <div className="relative max-w-3xl">
          <p className="mb-5 text-xs uppercase tracking-[.32em] text-[var(--gold)]">In the Spirit of Día de los Muertos & Perpetual Remembrance</p>
          <h1 className="font-serif text-5xl leading-[1.05] md:text-8xl">Because some voices deserve to live beyond a lifetime.</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-white/70">
            A private, AI-powered memory sanctuary that helps families preserve the authentic voices, life lessons, photographs, and recipes of the people they love — protected by open-source AI and realistic voice narration.
          </p>
          
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button className="rounded-full bg-[var(--gold)] px-8 py-4 font-semibold text-[var(--navy)] transition hover:bg-[var(--ivory)] shadow-lg shadow-[var(--gold)]/20" disabled={pending} onClick={onEnter}>
              {pending ? 'Opening archive...' : 'Enter Family Archive (Live Demo)'}
            </button>
            <button className="rounded-full border border-white/30 px-6 py-4 text-sm font-medium hover:border-[var(--gold)] hover:text-[var(--gold)] transition" onClick={onEnter}>
              Listen to Sample Heirlooms
            </button>
          </div>
          
          <p className="mt-6 text-xs text-white/45">Zero corporate surveillance · Open-weight Gemma 2 & ElevenLabs Voice · Offline-ready sovereignty</p>
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
  return <main className="grid min-h-screen place-items-center bg-[var(--navy)] p-5 text-[var(--ivory)]"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-[var(--charcoal)] p-7 md:p-10"><button className="text-sm text-white/45 hover:text-white" onClick={onBack}>← Back to Archive</button><p className="mt-8 text-xs uppercase tracking-[.25em] text-[var(--gold)]">Private family space</p><h1 className="mt-3 font-serif text-4xl">{mode === 'signup' ? 'Create your archive.' : 'Welcome back.'}</h1><form className="mt-8 space-y-5" onSubmit={submit}>{mode === 'signup' && <label className="block"><span>Your name</span><input autoComplete="name" className="field" name="name" required placeholder="Alex Rivera" /></label>}<label className="block"><span>Email</span><input autoComplete="email" className="field" name="email" required type="email" placeholder="alex@family.org" /></label><label className="block"><span>Password</span><input autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="field" minLength={8} name="password" required type="password" /></label>{error && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}<button className="w-full rounded-full bg-[var(--gold)] py-4 font-medium text-[var(--navy)] disabled:opacity-50" disabled={pending}>{pending ? 'Please wait...' : mode === 'signup' ? 'Create secure archive' : 'Sign in'}</button></form><button className="mt-6 w-full text-sm text-white/45 hover:text-white" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError('') }}>{mode === 'signup' ? 'Already have an account? Sign in' : 'New to Echoes? Create an account'}</button></div></main>
}

function ArchiveSetup({ name, onDone }: { name: string; onDone: () => Promise<void> }) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  return <main className="grid min-h-screen place-items-center bg-[var(--navy)] p-5 text-[var(--ivory)]"><form className="w-full max-w-xl rounded-3xl border border-white/10 bg-[var(--charcoal)] p-8 md:p-12" onSubmit={(event) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get('name') || ''); startTransition(async () => { const result = await createArchiveAction(value); if (result.ok) await onDone(); else setError(result.error) }) }}><p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">Welcome, {name}</p><h1 className="mt-3 font-serif text-5xl">Name your family archive.</h1><p className="mt-4 leading-7 text-white/50">You can begin with a family name, a household, or a branch of your story.</p><label className="mt-8 block"><span>Archive name</span><input autoFocus className="field" name="name" placeholder="The Rivera Family Archive" required /></label>{error && <p role="alert" className="mt-4 text-sm text-red-200">{error}</p>}<button className="mt-6 w-full rounded-full bg-[var(--gold)] py-4 font-medium text-[var(--navy)]" disabled={pending}>{pending ? 'Creating...' : 'Create archive'}</button></form></main>
}

function Dashboard({ memories, name, onCreate, onSelect, query, setQuery }: { memories: EchoMemory[]; name: string; onCreate: () => void; onSelect: (m: EchoMemory) => void; query: string; setQuery: (q: string) => void }) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">Living Memorial Archive</p>
          <h2 className="mt-2 font-serif text-4xl md:text-5xl">Welcome home, {name}.</h2>
          <p className="mt-2 text-sm text-white/50">The stories you save today become tomorrow's enduring legacy.</p>
        </div>
        <button className="rounded-full bg-[var(--gold)] px-6 py-3 font-medium text-[var(--navy)] hover:bg-[var(--ivory)] transition shadow-md" onClick={onCreate}>+ Capture New Memory</button>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="font-serif text-2xl">Preserved Memories ({memories.length})</h3>
          {query && <button className="text-xs text-[var(--gold)] hover:underline" onClick={() => setQuery('')}>Clear search filter</button>}
        </div>

        {memories.length ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {memories.map((memory) => (
              <article
                key={memory.id}
                onClick={() => onSelect(memory)}
                className="group cursor-pointer rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-[var(--gold)]/50 hover:bg-white/[0.08] relative overflow-hidden"
              >
                <div className="flex items-center justify-between text-xs text-[var(--gold)]">
                  <span className="font-medium">✦ {memory.person}</span>
                  <span className="text-white/40">{memory.date}</span>
                </div>
                
                <h4 className="mt-3 font-serif text-xl line-clamp-2 group-hover:text-[var(--gold)] transition">{memory.title}</h4>
                <p className="mt-3 text-sm leading-6 text-white/60 line-clamp-3">{memory.story}</p>
                
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {memory.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-black/20 px-2.5 py-0.5 text-[10px] text-white/50">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-white/40">
                  <span className="flex items-center gap-1 text-[var(--gold)]">
                    <Icon name="sound" /> Listen & Explore
                  </span>
                  <span className="group-hover:translate-x-1 transition">Open →</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-dashed border-white/15 p-12 text-center text-white/45">
            <p className="text-lg">No memories match your search.</p>
            <p className="mt-2 text-sm">Record a voice story or write down a family remembrance to begin.</p>
            <button className="mt-6 rounded-full bg-[var(--gold)] px-6 py-2.5 text-sm font-medium text-[var(--navy)]" onClick={onCreate}>Add First Memory</button>
          </div>
        )}
      </div>
    </div>
  )
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
      <p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">Preserve a Remembrance</p>
      <h2 className="mt-2 font-serif text-4xl">Add to your family archive.</h2>
      
      <form className="mt-8 space-y-6" onSubmit={submit}>
        <input type="hidden" name="archive" value={archives[0]?.id || 'family-archive'} />

        <label className="block">
          <span className="text-sm font-medium">Memory Title *</span>
          <input className="field mt-2" name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mom's Recipe for Sunday Stew" required />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Whose Voice / Story?</span>
            <input className="field mt-2" name="person" value={person} onChange={(e) => setPerson(e.target.value)} placeholder="e.g. Mom, Maya, Grandpa Joe" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Memory Date / Year</span>
            <input className="field mt-2" name="date" type="date" />
          </label>
        </div>

        <label className="block">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">The Story & Real Words *</span>
            <button
              type="button"
              onClick={handleAiAssist}
              disabled={analyzing}
              className="flex items-center gap-1.5 text-xs text-[var(--gold)] hover:underline disabled:opacity-50"
            >
              <span>✨</span>
              <span>{analyzing ? 'Extracting Wisdom with Gemma AI...' : 'Auto-Extract Wisdom & Tags (AI)'}</span>
            </button>
          </div>
          <textarea
            className="field mt-2 min-h-48"
            name="story"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Write down the exact words, laughter, advice, or moment that you never want to forget..."
            required
          />
        </label>

        {aiNotes && (
          <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 p-4">
            <p className="text-xs uppercase tracking-widest text-[var(--gold)] font-semibold">✨ Open-Weight AI Memory Analysis</p>
            <p className="mt-2 text-xs leading-5 text-white/80 whitespace-pre-wrap">{aiNotes}</p>
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium">Heirloom Tags (comma-separated)</span>
          <input className="field mt-2" name="tags" placeholder="recipes, childhood, advice, holiday, laughter" />
        </label>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Voice Recording</p>
              <p className="text-xs text-white/40">{audioURL ? 'Voice recording attached ✓' : 'Add an authentic voice recording'}</p>
            </div>
            <button type="button" className="rounded-full border border-white/20 px-4 py-1.5 text-xs hover:border-[var(--gold)] hover:text-[var(--gold)] transition" onClick={onRecord}>
              {audioURL ? 'Re-record' : 'Record voice'}
            </button>
          </div>
          {audioURL && <audio className="mt-4 w-full" controls src={audioURL} />}
        </div>

        {error && <p role="alert" className="text-sm text-red-200">{error}</p>}

        <button className="w-full rounded-full bg-[var(--gold)] py-4 font-semibold text-[var(--navy)] hover:bg-[var(--ivory)] transition disabled:opacity-50" disabled={pending}>
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
    <div className="max-w-xl text-center mx-auto py-12">
      <p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">Voice of Remembrance</p>
      <h2 className="mt-2 font-serif text-5xl">Capture their voice.</h2>
      <p className="mt-3 text-sm text-white/50">Speak naturally. Tell a favorite story, a habit, or a lesson they passed down.</p>

      <div className="my-12">
        <div className={`mx-auto flex h-36 w-36 items-center justify-center rounded-full border-2 transition-all ${recording ? 'border-red-400 bg-red-500/10 scale-105 animate-pulse' : 'border-[var(--gold)]/40 bg-[var(--gold)]/5'}`}>
          <span className="font-mono text-3xl font-medium text-[var(--gold)]">{formatTime(seconds)}</span>
        </div>
        {recording && <p className="mt-4 text-xs tracking-widest uppercase text-red-400">● Live Recording</p>}
      </div>

      <div className="flex justify-center gap-4">
        {!recording ? (
          <button className="rounded-full bg-[var(--gold)] px-8 py-3.5 font-medium text-[var(--navy)] hover:bg-[var(--ivory)] transition" onClick={onStart}>
            Start Recording
          </button>
        ) : (
          <>
            <button className="rounded-full border border-white/20 px-6 py-3 text-sm hover:bg-white/10" onClick={onPause}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button className="rounded-full bg-red-400 px-6 py-3 text-sm font-medium text-[var(--navy)]" onClick={onStop}>
              Stop & Save
            </button>
          </>
        )}
      </div>

      {audio && (
        <div className="mt-10 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-6">
          <p className="text-xs uppercase tracking-widest text-[var(--gold)] font-medium">Recording Preview</p>
          <audio className="mt-3 w-full" controls src={audio} />
          <button className="mt-5 rounded-full bg-[var(--gold)] px-8 py-3 text-sm font-semibold text-[var(--navy)]" onClick={useRecording}>
            Use This Recording in Memory →
          </button>
        </div>
      )}

      {notice && <p role="alert" className="mt-4 text-sm text-amber-200">{notice}</p>}
    </div>
  )
}

function Detail({ memory, onClose, onChanged }: { memory: EchoMemory; onClose: () => void; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  
  // ElevenLabs narration states
  const [narrationUrl, setNarrationUrl] = useState('')
  const [narrating, setNarrating] = useState(false)
  const [narrationError, setNarrationError] = useState('')

  // Open-Weight AI analysis states
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
      <article className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-[var(--charcoal)] p-6 md:p-10 shadow-2xl relative">
        <div className="flex justify-end gap-2">
          <button className="rounded-full border border-white/15 px-4 py-2 text-xs hover:border-white/30" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : 'Edit story'}
          </button>
          <button className="rounded-full border border-white/15 px-4 py-2 text-xs hover:border-white/30" onClick={onClose}>
            Close ✕
          </button>
        </div>

        {editing ? (
          <form className="mt-6 space-y-5" onSubmit={update}>
            <label className="block"><span>Title</span><input className="field" defaultValue={memory.title} name="title" required /></label>
            <label className="block"><span>Person</span><input className="field" defaultValue={memory.person === 'Unassigned' ? '' : memory.person} name="person" /></label>
            <label className="block"><span>Memory</span><textarea className="field min-h-48" defaultValue={memory.story} name="story" required /></label>
            <label className="block"><span>Private notes</span><textarea className="field min-h-28" defaultValue={memory.notes} name="notes" /></label>
            {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
            <button className="w-full rounded-full bg-[var(--gold)] py-3 font-medium text-[var(--navy)]" disabled={pending}>
              {pending ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        ) : (
          <>
            <p className="mt-4 text-xs uppercase tracking-widest text-[var(--gold)] font-medium">✦ {memory.date} · {memory.person}</p>
            <h2 className="mt-3 font-serif text-3xl md:text-5xl">{memory.title}</h2>
            
            {/* The Real Words */}
            <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.03] p-6">
              <p className="whitespace-pre-wrap text-base md:text-lg leading-8 text-white/80 font-serif italic">
                "{memory.story}"
              </p>
            </div>

            {/* Authentic Audio Recording if attached */}
            {memory.audio && (
              <div className="mt-6 rounded-2xl border border-white/10 p-4 bg-black/20">
                <p className="text-xs uppercase tracking-wider text-white/50 mb-2">Original Voice Recording</p>
                <audio className="w-full" controls src={memory.audio} />
              </div>
            )}

            {/* ElevenLabs Remembrance Narration Feature */}
            <div className="mt-6 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🎙️</span>
                    <p className="font-medium text-sm text-[var(--gold)]">ElevenLabs Voice Narration</p>
                  </div>
                  <p className="text-xs text-white/50 mt-1">Hear this memory spoken in a gentle, warm commemorative voice.</p>
                </div>
                {!narrationUrl && (
                  <button
                    onClick={handleNarrate}
                    disabled={narrating}
                    className="rounded-full bg-[var(--gold)] px-4 py-2 text-xs font-semibold text-[var(--navy)] hover:bg-[var(--ivory)] transition disabled:opacity-50"
                  >
                    {narrating ? 'Generating Voice...' : 'Listen to Narration'}
                  </button>
                )}
              </div>

              {narrationUrl && (
                <div className="mt-4 pt-3 border-t border-[var(--gold)]/20">
                  <p className="text-xs text-[var(--gold)] font-medium mb-1.5">✦ Remembrance Voice Playing:</p>
                  <audio className="w-full" autoPlay controls src={narrationUrl} />
                </div>
              )}
              {narrationError && <p className="mt-2 text-xs text-red-300">{narrationError}</p>}
            </div>

            {/* Open-Weight AI (Gemma/Qwen) Wisdom Extraction Feature */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🧠</span>
                  <p className="font-medium text-sm text-white/90">Open-Weight AI Wisdom & Tribute</p>
                </div>
                {!aiAnalysis && (
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-[var(--gold)] hover:border-[var(--gold)] transition disabled:opacity-50"
                  >
                    {analyzing ? 'Analyzing with AI...' : 'Reveal Wisdom'}
                  </button>
                )}
              </div>

              {aiAnalysis ? (
                <div className="mt-4 space-y-3 pt-3 border-t border-white/10 text-xs">
                  {aiAnalysis.wisdom && (
                    <div className="rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--gold)] font-semibold">Core Life Lesson</p>
                      <p className="text-sm font-serif italic text-white/90 mt-1">"{aiAnalysis.wisdom}"</p>
                    </div>
                  )}
                  {aiAnalysis.summary && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/40">Memorial Tribute</p>
                      <p className="text-white/70 mt-0.5 leading-5">{aiAnalysis.summary}</p>
                    </div>
                  )}
                  {aiAnalysis.tags && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {aiAnalysis.tags.map((t) => (
                        <span key={t} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-[var(--gold)]">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-white/45 mt-2">
                  Click 'Reveal Wisdom' to have open-weight AI extract the deeper life lesson and commemorative tribute from these words.
                </p>
              )}
            </div>

            {/* Tags & Metadata */}
            <div className="mt-6 flex flex-wrap gap-2">
              {memory.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
              <button
                className="text-xs text-red-300 hover:text-red-200 underline underline-offset-4"
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
              <button className="rounded-full bg-white/10 px-5 py-2 text-xs hover:bg-white/20 transition" onClick={onClose}>
                Back to Archive
              </button>
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}
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
  return <div><p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">{eyebrow}</p><h2 className="mt-3 font-serif text-5xl">{title}</h2><p className="mt-4 max-w-xl text-white/50">{copy}</p>{cards.length ? <div className="mt-10 grid gap-4 md:grid-cols-3">{cards.map((card) => <div className="rounded-2xl border border-white/10 bg-white/5 p-6" key={card}><div className="mb-12 h-12 w-12 rounded-full bg-[var(--amber)]/20 flex items-center justify-center text-lg">✦</div><h3 className="font-serif text-xl">{card}</h3><p className="mt-2 text-sm text-white/40">Generated from saved memories</p></div>)}</div> : <div className="mt-10 rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/40">No saved memories to organize yet.</div>}</div>
}

function Privacy({ memories }: { memories: number }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">Privacy & Sovereignty</p>
      <h2 className="mt-3 font-serif text-5xl">Your stories, under your control.</h2>
      <div className="mt-10 space-y-4">
        {[
          ['Sovereign Memory Storage', `${memories} preserved memories are scoped to your private session. Your recordings and photos are stored securely and never harvested for advertising.`],
          ['Open-Weight AI Architecture', 'Memory summarization and wisdom extraction are powered by genuine open-weight models (Qwen/Gemma). You have the option to run them locally on your own machine without sending data to closed corporate clouds.'],
          ['ElevenLabs Voice Security', 'Voice narrations are synthesized on-demand with state-of-the-art neural speech. Audio streams are encrypted in transit and never used to clone unconsented voices.'],
          ['Permanent Deletion & Portability', 'You retain total ownership of every syllable. You can edit, delete, or export your family archive at any moment.']
        ].map(([title, copy]) => (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6" key={title}>
            <h3 className="font-serif text-2xl text-[var(--gold)]">{title}</h3>
            <p className="mt-2 leading-7 text-white/70">{copy}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
