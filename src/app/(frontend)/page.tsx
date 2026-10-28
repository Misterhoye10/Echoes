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

type View = 'home' | 'auth' | 'archive' | 'dashboard' | 'create' | 'record' | 'people' | 'collections' | 'privacy'
type Archive = { id: string; name: string }

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    plus: 'M12 5v14M5 12h14', mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3',
    search: 'm21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', folder: 'M3 6h7l2 2h9v11H3z', play: 'm9 7 8 5-8 5z',
    pause: 'M9 7v10M15 7v10', stop: 'M8 8h8v8H8z',
  }
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24"><path d={paths[name]} /></svg>
}

export default function Echoes() {
  const [view, setView] = useState<View>('home')
  const [memories, setMemories] = useState<EchoMemory[]>([])
  const [archives, setArchives] = useState<Archive[]>([])
  const [name, setName] = useState('')
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
      setMemories([]); setArchives([]); setName('')
      return false
    }
    setMemories(workspace.memories)
    setArchives(workspace.archives)
    setName(workspace.name)
    return true
  }

  const enter = () => startTransition(async () => {
    const workspace = await loadWorkspaceAction()
    if (!workspace.authenticated) {
      setView('auth')
      return
    }
    setMemories(workspace.memories); setArchives(workspace.archives); setName(workspace.name)
    setView(workspace.archives.length ? 'dashboard' : 'archive')
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

  if (view === 'home') return <Landing pending={pending} onEnter={enter} />
  if (view === 'auth') return <Auth onBack={() => setView('home')} onSuccess={async () => {
    const workspace = await loadWorkspaceAction()
    if (workspace.authenticated) {
      setName(workspace.name); setArchives(workspace.archives); setMemories(workspace.memories)
      setView(workspace.archives.length ? 'dashboard' : 'archive')
    }
  }} />
  if (view === 'archive') return <ArchiveSetup name={name} onDone={async () => { await refresh(); setView('dashboard') }} />

  const navigate = (next: View) => {
    setNotice('')
    if (next === 'create' && archives.length === 0) setView('archive')
    else setView(next)
  }

  return (
    <main className="min-h-screen bg-[var(--navy)] text-[var(--ivory)]">
      <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/10 bg-[var(--navy)]/90 px-5 backdrop-blur-xl md:px-10">
        <button className="font-serif text-2xl tracking-wide text-[var(--gold)]" onClick={() => setView('home')}>Echoes</button>
        <div className="hidden w-full max-w-md items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 md:flex">
          <Icon name="search" />
          <input aria-label="Search memories" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-white/35" onChange={(event) => { setQuery(event.target.value); setView('dashboard') }} placeholder="Search a person, date, tag, or story..." value={query} />
        </div>
        <button className="rounded-full border border-[var(--gold)]/40 px-4 py-2 text-sm text-[var(--gold)]" onClick={() => navigate('create')}>Add memory</button>
      </header>
      <div className="mx-auto grid max-w-[1500px] md:grid-cols-[240px_1fr]">
        <nav className="hidden min-h-[calc(100vh-5rem)] border-r border-white/10 p-5 md:block">
          <p className="mb-6 px-3 text-[10px] uppercase tracking-[.25em] text-white/40">{archives[0]?.name}</p>
          <Navigation current={view} navigate={navigate} />
          <div className="mt-10 rounded-2xl border border-[var(--gold)]/15 bg-[var(--gold)]/5 p-4">
            <p className="text-xs font-medium text-[var(--gold)]">Private by default</p>
            <p className="mt-2 text-xs leading-5 text-white/45">Signed-in records and files are owner-scoped in Payload. AI processing is off, so nothing is sent to an AI provider.</p>
          </div>
          <button className="mt-5 px-3 text-xs text-white/35 hover:text-white" onClick={() => startTransition(async () => { await logoutAction(); setView('home'); setMemories([]); setArchives([]) })}>Sign out</button>
        </nav>
        <section className="min-w-0 p-5 pb-28 md:p-10">
          {view === 'dashboard' && <Dashboard memories={filtered} name={name} onCreate={() => navigate('create')} onSelect={setSelected} query={query} setQuery={setQuery} />}
          {view === 'create' && <CreateForm archives={archives} audioBlob={audioBlob} audioURL={audioURL} onRecord={() => navigate('record')} onSaved={async () => { await refresh(); setAudioBlob(null); setAudioURL(''); setView('dashboard') }} />}
          {view === 'record' && <Recorder audio={audioURL} notice={notice} paused={paused} recording={recording} seconds={seconds} onPause={pauseRecording} onStart={startRecording} onStop={stopRecording} useRecording={() => navigate('create')} />}
          {view === 'people' && <SimplePage eyebrow="People" title="The voices in your archive" copy="People profiles are a planned organizer. Names entered on working memories are searchable now." cards={peopleCards(memories)} />}
          {view === 'collections' && <SimplePage eyebrow="Collections" title="Stories that belong together" copy="Collection management is not yet connected. Tags are working and searchable on every saved memory." cards={tagCards(memories)} />}
          {view === 'privacy' && <Privacy memories={memories.length} />}
        </section>
      </div>
      <MobileNavigation current={view} navigate={navigate} />
      {selected && <Detail memory={selected} onClose={() => setSelected(null)} onChanged={async () => { setSelected(null); await refresh() }} />}
    </main>
  )
}

function Navigation({ current, navigate }: { current: View; navigate: (view: View) => void }) {
  const items = [['dashboard','home','Your archive'],['record','mic','Record'],['people','users','People'],['collections','folder','Collections'],['privacy','lock','Privacy']] as [View,string,string][]
  return <>{items.map(([view, icon, label]) => <button className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${current === view ? 'bg-[var(--amber)]/15 text-[var(--gold)]' : 'text-white/55 hover:bg-white/5 hover:text-white'}`} key={view} onClick={() => navigate(view)}><Icon name={icon} />{label}</button>)}</>
}

function MobileNavigation({ current, navigate }: { current: View; navigate: (view: View) => void }) {
  return <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-white/10 bg-[var(--navy)]/95 px-2 py-2 backdrop-blur-xl md:hidden">{([['dashboard','home','Archive'],['record','mic','Record'],['people','users','People'],['privacy','lock','Privacy']] as [View,string,string][]).map(([view, icon, label]) => <button className={`flex min-w-16 flex-col items-center gap-1 py-1 text-[10px] ${current === view ? 'text-[var(--gold)]' : 'text-white/45'}`} key={view} onClick={() => navigate(view)}><Icon name={icon} />{label}</button>)}</nav>
}

function Landing({ onEnter, pending }: { onEnter: () => void; pending: boolean }) {
  return <main className="min-h-screen bg-[var(--navy)] text-[var(--ivory)]"><nav className="absolute z-10 flex w-full items-center justify-between px-6 py-7 md:px-14"><span className="font-serif text-2xl text-[var(--gold)]">Echoes</span><button className="rounded-full border border-white/20 px-5 py-2.5 text-sm" disabled={pending} onClick={onEnter}>{pending ? 'Opening…' : 'Open archive'}</button></nav><section className="relative flex min-h-screen items-end overflow-hidden px-6 pb-20 pt-32 md:items-center md:px-14"><img alt="A quiet wall of family photographs" className="absolute inset-0 h-full w-full object-cover opacity-45" src="https://images.unsplash.com/photo-1621132352783-b948f9233ff5?auto=format&fit=crop&w=1800&q=85" /><div className="absolute inset-0 bg-gradient-to-r from-[var(--navy)] via-[var(--navy)]/80 to-transparent" /><div className="relative max-w-3xl"><p className="mb-5 text-xs uppercase tracking-[.32em] text-[var(--gold)]">A private family memory archive</p><h1 className="font-serif text-5xl leading-[1.03] md:text-8xl">Some voices should never fade.</h1><p className="mt-7 max-w-xl text-lg leading-8 text-white/65">Record the stories, laughter, and ordinary moments that made your family yours. Preserved in their real words, with care.</p><button className="mt-10 rounded-full bg-[var(--gold)] px-7 py-4 font-medium text-[var(--navy)] transition hover:bg-[var(--ivory)]" disabled={pending} onClick={onEnter}>{pending ? 'Opening securely…' : 'Begin your family archive'}</button><p className="mt-5 text-xs text-white/40">Because some voices deserve to live beyond a lifetime.</p></div></section></main>
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
  return <main className="grid min-h-screen place-items-center bg-[var(--navy)] p-5 text-[var(--ivory)]"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-[var(--charcoal)] p-7 md:p-10"><button className="text-sm text-white/45" onClick={onBack}>← Back</button><p className="mt-8 text-xs uppercase tracking-[.25em] text-[var(--gold)]">Private family space</p><h1 className="mt-3 font-serif text-4xl">{mode === 'signup' ? 'Create your account.' : 'Welcome back.'}</h1><form className="mt-8 space-y-5" onSubmit={submit}>{mode === 'signup' && <label className="block"><span>Your name</span><input autoComplete="name" className="field" name="name" required /></label>}<label className="block"><span>Email</span><input autoComplete="email" className="field" name="email" required type="email" /></label><label className="block"><span>Password</span><input autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="field" minLength={8} name="password" required type="password" /></label>{error && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}<button className="w-full rounded-full bg-[var(--gold)] py-4 font-medium text-[var(--navy)] disabled:opacity-50" disabled={pending}>{pending ? 'Please wait…' : mode === 'signup' ? 'Create secure account' : 'Sign in'}</button></form><button className="mt-6 w-full text-sm text-white/45 hover:text-white" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError('') }}>{mode === 'signup' ? 'Already have an account? Sign in' : 'New to Echoes? Create an account'}</button></div></main>
}

function ArchiveSetup({ name, onDone }: { name: string; onDone: () => Promise<void> }) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  return <main className="grid min-h-screen place-items-center bg-[var(--navy)] p-5 text-[var(--ivory)]"><form className="w-full max-w-xl rounded-3xl border border-white/10 bg-[var(--charcoal)] p-8 md:p-12" onSubmit={(event) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get('name') || ''); startTransition(async () => { const result = await createArchiveAction(value); if (result.ok) await onDone(); else setError(result.error) }) }}><p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">Welcome, {name}</p><h1 className="mt-3 font-serif text-5xl">Name your family archive.</h1><p className="mt-4 leading-7 text-white/50">You can begin with a family name, a household, or a branch of your story.</p><label className="mt-8 block"><span>Archive name</span><input autoFocus className="field" name="name" placeholder="The Hartwell Archive" required /></label>{error && <p role="alert" className="mt-4 text-sm text-red-200">{error}</p>}<button className="mt-6 w-full rounded-full bg-[var(--gold)] py-4 font-medium text-[var(--navy)]" disabled={pending}>{pending ? 'Creating…' : 'Create archive'}</button></form></main>
}

function Dashboard({ memories, name, onCreate, onSelect, query, setQuery }: { memories: EchoMemory[]; name: string; onCreate: () => void; onSelect: (memory: EchoMemory) => void; query: string; setQuery: (value: string) => void }) {
  return <><p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">Welcome, {name}</p><div className="mt-3 flex items-end justify-between"><div><h2 className="font-serif text-4xl md:text-6xl">Your family, remembered.</h2><p className="mt-3 text-white/45">{memories.length} {memories.length === 1 ? 'memory' : 'memories'} · a story still growing</p></div><button aria-label="Create memory" className="hidden h-12 w-12 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--navy)] md:flex" onClick={onCreate}><Icon name="plus" /></button></div><div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 md:hidden"><Icon name="search" /><input aria-label="Search archive" className="w-full bg-transparent py-3 outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Search your archive" value={query} /></div>{memories.length === 0 ? <div className="mt-10 rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center"><h3 className="font-serif text-3xl">{query ? 'No memories match your search.' : 'Your archive is ready.'}</h3><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/45">{query ? 'Try a different person, date, tag, or phrase.' : 'Add the first story in writing or begin with a voice recording.'}</p>{!query && <button className="mt-7 rounded-full bg-[var(--gold)] px-6 py-3 font-medium text-[var(--navy)]" onClick={onCreate}>Add your first memory</button>}</div> : <div className="mt-10 grid gap-4 lg:grid-cols-2">{memories.map((memory) => <button className="group overflow-hidden rounded-2xl border border-white/10 bg-[var(--charcoal)] text-left transition hover:-translate-y-1 hover:border-[var(--gold)]/35" key={memory.id} onClick={() => onSelect(memory)}><div className="flex min-h-64 flex-col justify-end bg-gradient-to-br from-[#29313c] to-[#111821] p-6"><div className="mb-auto flex justify-between"><span className="rounded-full bg-black/30 px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--gold)]">{memory.audio ? 'Audio memory' : 'Written memory'}</span><span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20"><Icon name={memory.audio ? 'play' : 'folder'} /></span></div><p className="text-sm text-white/45">{memory.date} · {memory.person}</p><h3 className="mt-2 font-serif text-3xl">{memory.title}</h3><p className="mt-3 line-clamp-2 text-sm leading-6 text-white/55">{memory.story}</p><div className="mt-5 flex flex-wrap gap-2">{memory.tags.map((tag) => <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/45" key={tag}>{tag}</span>)}</div></div></button>)}</div>}</>
}

function CreateForm({ archives, audioBlob, audioURL, onRecord, onSaved }: { archives: Archive[]; audioBlob: Blob | null; audioURL: string; onRecord: () => void; onSaved: () => Promise<void> }) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    const data = new FormData(event.currentTarget)
    if (audioBlob) data.set('audio', new File([audioBlob], 'family-memory.webm', { type: audioBlob.type || 'audio/webm' }))
    startTransition(async () => {
      const result = await saveMemoryAction(data)
      if (!result.ok) setError(result.error)
      else await onSaved()
    })
  }
  return <div className="mx-auto max-w-3xl"><p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">New memory</p><h2 className="mt-3 font-serif text-5xl">Tell it in your words.</h2><p className="mt-4 text-white/50">Small details are often the ones worth keeping.</p><form className="mt-10 space-y-6" onSubmit={submit}><input name="archive" type="hidden" value={archives[0]?.id} /><label className="block"><span>Title</span><input className="field" maxLength={180} name="title" placeholder="The story of..." required /></label><div className="grid gap-6 md:grid-cols-2"><label><span>Date</span><input className="field" name="date" type="date" /></label><label><span>Person</span><input className="field" maxLength={120} name="person" placeholder="Who is this about?" /></label></div><label className="block"><span>Memory</span><textarea className="field min-h-48 resize-y" maxLength={20000} name="story" placeholder="Write the memory as you remember it..." required /></label><label className="block"><span>Tags</span><input className="field" name="tags" placeholder="Tradition, childhood, summer" /></label><div className="grid gap-3 md:grid-cols-2"><button className="rounded-xl border border-white/15 p-4 text-left hover:border-[var(--gold)]/40" onClick={onRecord} type="button"><span className="flex gap-3 text-[var(--gold)]"><Icon name="mic" /> {audioBlob ? 'Recording attached' : 'Record their voice'}</span><small className="mt-2 block text-white/40">{audioBlob ? 'Saved securely with this memory' : 'Microphone permission required'}</small></button><label className="rounded-xl border border-dashed border-white/15 p-4"><span>Photos & attachments</span><input className="mt-2 block max-w-full text-xs text-white/40" multiple name="files" type="file" /></label></div>{audioURL && <audio className="w-full" controls src={audioURL} />}<div className="rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-4 text-sm text-white/55"><strong className="text-[var(--gold)]">AI processing is off</strong><p className="mt-1">No AI service is configured. Nothing is sent for transcription, summary, or tagging, and your original words are stored unchanged.</p></div>{error && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}<button className="w-full rounded-full bg-[var(--gold)] py-4 font-medium text-[var(--navy)] disabled:opacity-50" disabled={pending} type="submit">{pending ? 'Saving securely…' : 'Save memory'}</button></form></div>
}

function Recorder({ recording, paused, seconds, onStart, onPause, onStop, audio, useRecording, notice }: { recording: boolean; paused: boolean; seconds: number; onStart: () => void; onPause: () => void; onStop: () => void; audio: string; useRecording: () => void; notice: string }) {
  return <div className="mx-auto flex max-w-2xl flex-col items-center py-10 text-center"><p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">Voice recording</p><h2 className="mt-3 font-serif text-5xl">Let the story unfold.</h2><div aria-hidden="true" className="my-14 flex h-28 items-center gap-1">{Array.from({length: 40}).map((_, index) => <i className={`wave-bar w-1 rounded-full bg-[var(--gold)] transition-all ${recording && !paused ? 'animate-pulse' : 'opacity-40'}`} key={index} />)}</div><p aria-live="polite" className="font-mono text-3xl">{String(Math.floor(seconds / 60)).padStart(2,'0')}:{String(seconds % 60).padStart(2,'0')}</p><div className="mt-8 flex items-center gap-4">{!recording ? <button aria-label="Start recording" className="flex h-20 w-20 items-center justify-center rounded-full border-8 border-white/10 bg-[var(--gold)] text-[var(--navy)]" onClick={onStart}><Icon name="mic" /></button> : <><button aria-label={paused ? 'Resume recording' : 'Pause recording'} className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/5" onClick={onPause}><Icon name={paused ? 'play' : 'pause'} /></button><button aria-label="Stop and save recording" className="flex h-20 w-20 items-center justify-center rounded-full border-8 border-white/10 bg-red-400 text-[var(--navy)]" onClick={onStop}><Icon name="stop" /></button></>}</div>{paused && <p className="mt-4 text-sm text-[var(--gold)]">Recording paused</p>}{notice && <p role="alert" className="mt-6 rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{notice}</p>}{audio && !recording && <div className="mt-10 w-full rounded-2xl border border-white/10 bg-white/5 p-5"><audio className="w-full" controls src={audio} /><button className="mt-4 rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-medium text-[var(--navy)]" onClick={useRecording}>Use this recording</button></div>}<p className="mt-7 max-w-md text-sm leading-6 text-white/40">The recording stays in this browser until you choose “Save memory.” It is then uploaded to your owner-scoped cloud archive.</p></div>
}

function Detail({ memory, onClose, onChanged }: { memory: EchoMemory; onClose: () => void; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const update = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    startTransition(async () => { const result = await updateMemoryAction(memory.id, data); if (result.ok) await onChanged(); else setError(result.error) })
  }
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-md md:p-10"><article className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[var(--charcoal)] p-6 md:p-10"><div className="flex justify-end gap-2"><button className="rounded-full border border-white/15 px-4 py-2 text-sm" onClick={() => setEditing(!editing)}>{editing ? 'Cancel edit' : 'Edit'}</button><button className="rounded-full border border-white/15 px-4 py-2 text-sm" onClick={onClose}>Close</button></div>{editing ? <form className="mt-6 space-y-5" onSubmit={update}><label className="block"><span>Title</span><input className="field" defaultValue={memory.title} name="title" required /></label><label className="block"><span>Person</span><input className="field" defaultValue={memory.person === 'Unassigned' ? '' : memory.person} name="person" /></label><label className="block"><span>Memory</span><textarea className="field min-h-48" defaultValue={memory.story} name="story" required /></label><label className="block"><span>Private notes</span><textarea className="field min-h-28" defaultValue={memory.notes} name="notes" /></label>{error && <p role="alert" className="text-sm text-red-200">{error}</p>}<button className="w-full rounded-full bg-[var(--gold)] py-3 font-medium text-[var(--navy)]" disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</button></form> : <><p className="mt-6 text-xs uppercase tracking-widest text-[var(--gold)]">{memory.date} · {memory.person}</p><h2 className="mt-4 font-serif text-4xl md:text-6xl">{memory.title}</h2><p className="mt-8 whitespace-pre-wrap text-lg leading-9 text-white/70">{memory.story}</p>{memory.audio && <audio className="mt-8 w-full" controls src={memory.audio} />}{memory.notes && <div className="mt-8 rounded-2xl border border-white/10 p-5"><p className="text-xs uppercase tracking-widest text-white/35">Private notes</p><p className="mt-2 whitespace-pre-wrap text-white/60">{memory.notes}</p></div>}<div className="mt-10 rounded-2xl border border-[var(--gold)]/15 bg-[var(--gold)]/5 p-5"><p className="font-medium text-[var(--gold)]">AI processing unavailable</p><p className="mt-2 text-sm leading-6 text-white/50">No content has been sent to an AI provider. A transcript or summary will only appear after a real provider is configured and succeeds.</p></div><button className="mt-10 text-sm text-red-200 underline underline-offset-4" disabled={pending} onClick={() => { if (window.confirm('Permanently delete this memory? This cannot be undone.')) startTransition(async () => { const result = await deleteMemoryAction(memory.id); if (result.ok) await onChanged(); else setError(result.error) }) }}>Permanently delete memory</button>{error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}</>}</article></div>
}

function peopleCards(memories: EchoMemory[]) {
  const counts = new Map<string, number>()
  memories.forEach((memory) => { if (memory.person !== 'Unassigned') counts.set(memory.person, (counts.get(memory.person) || 0) + 1) })
  return [...counts].map(([person, count]) => `${person} · ${count} ${count === 1 ? 'memory' : 'memories'}`)
}
function tagCards(memories: EchoMemory[]) {
  const counts = new Map<string, number>()
  memories.flatMap((memory) => memory.tags).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1))
  return [...counts].map(([tag, count]) => `${tag} · ${count} ${count === 1 ? 'story' : 'stories'}`)
}
function SimplePage({ eyebrow, title, copy, cards }: { eyebrow: string; title: string; copy: string; cards: string[] }) {
  return <div><p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">{eyebrow}</p><h2 className="mt-3 font-serif text-5xl">{title}</h2><p className="mt-4 max-w-xl text-white/50">{copy}</p>{cards.length ? <div className="mt-10 grid gap-4 md:grid-cols-3">{cards.map((card) => <div className="rounded-2xl border border-white/10 bg-white/5 p-6" key={card}><div className="mb-12 h-12 w-12 rounded-full bg-[var(--amber)]/20" /><h3 className="font-serif text-xl">{card}</h3><p className="mt-2 text-sm text-white/40">Generated from saved memories</p></div>)}</div> : <div className="mt-10 rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/40">No saved memories to organize yet.</div>}</div>
}
function Privacy({ memories }: { memories: number }) {
  return <div className="max-w-3xl"><p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">Privacy</p><h2 className="mt-3 font-serif text-5xl">Your stories, under your control.</h2><div className="mt-10 space-y-4">{[['Storage',`${memories} saved ${memories === 1 ? 'memory is' : 'memories are'} stored in the connected Payload cloud database. Collection access requires your isolated app-user session; files use a separate owner-scoped upload collection.`],['AI processing','No AI provider is configured. Audio and text are not sent for transcription, summarization, or tagging, and no processing result is simulated.'],['Working controls','Editing and permanent memory deletion are active. Full-archive export is not implemented yet and is clearly unavailable rather than simulated.']].map(([title, copy]) => <div className="rounded-2xl border border-white/10 bg-white/5 p-6" key={title}><h3 className="font-serif text-2xl">{title}</h3><p className="mt-2 leading-7 text-white/50">{copy}</p></div>)}</div></div>
}
