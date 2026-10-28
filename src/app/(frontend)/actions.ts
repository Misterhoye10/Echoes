'use server'

import fs from 'fs'
import path from 'path'
import { currentAppUser, loginAppUser, logoutAppUser, registerAppUser } from '@/lib/app-auth'
import {
  readStore,
  writeStore,
  type StoreMemory,
} from '@/lib/memory-store'

export type EchoMemory = {
  id: string
  title: string
  date: string
  person: string
  tags: string[]
  story: string
  notes: string
  audio?: string
  image?: string
  duration?: string
}

function text(value: FormDataEntryValue | null, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

async function saveUpload(file: globalThis.File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer())
  const originalName = file.name || 'file'
  const ext = path.extname(originalName) || (file.type.includes('audio') ? '.webm' : '.bin')
  const filename = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
  const uploadDir = path.resolve(process.cwd(), 'public', 'uploads')
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }
  const filepath = path.join(uploadDir, filename)
  fs.writeFileSync(filepath, bytes)
  return `/uploads/${filename}`
}

export async function authenticateAction(formData: FormData) {
  const email = text(formData.get('email'), 180).toLowerCase()
  const password = text(formData.get('password'), 128)
  const name = text(formData.get('name'), 120)
  const mode = text(formData.get('mode'), 10)

  if (!email || password.length < 6) {
    return { ok: false, error: 'Please enter a valid email and at least 6 characters for password.' }
  }

  try {
    if (mode === 'signup') {
      if (!name) {
        return { ok: false, error: 'Please enter your name.' }
      }
      await registerAppUser(name, email, password)
    } else {
      await loginAppUser(email, password)
    }
    return { ok: true, error: '' }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}

export async function logoutAction() {
  await logoutAppUser()
  return { ok: true }
}

export async function loadWorkspaceAction() {
  const user = await currentAppUser()
  if (!user) {
    return { authenticated: false as const, archives: [], memories: [], name: '' }
  }

  const store = readStore()
  let userArchives = store.archives.filter((a) => a.ownerId === user.id)
  if (userArchives.length === 0) {
    const defaultArchive = {
      id: `archive-${Date.now()}`,
      name: `${user.name}'s Family Archive`,
      ownerId: user.id,
      createdAt: new Date().toISOString(),
    }
    store.archives.push(defaultArchive)
    writeStore(store)
    userArchives = [defaultArchive]
  }

  // Get user memories or seed with heirloom starters if empty
  let userMemories = store.memories.filter((m) => m.ownerId === user.id)
  if (userMemories.length === 0) {
    // Also include demo memories if user is demo or newly registered
    const demoMemories = store.memories.filter((m) => m.ownerId === 'demo-user-1')
    userMemories = demoMemories.length > 0 ? demoMemories : []
  }

  return {
    authenticated: true as const,
    name: user.name,
    archives: userArchives.map((archive) => ({ id: archive.id, name: archive.name })),
    memories: userMemories.map((memory) => ({
      id: memory.id,
      title: memory.title,
      date: memory.memoryDate
        ? new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(memory.memoryDate))
        : 'Date not set',
      person: memory.personName || 'Unassigned',
      tags: memory.tags || [],
      story: memory.story,
      notes: memory.notes || '',
      audio: memory.audio,
      image: memory.image,
      duration: memory.duration || (memory.audio ? 'Audio · Voice' : 'Story'),
    })) satisfies EchoMemory[],
  }
}

export async function createArchiveAction(name: string) {
  const user = await currentAppUser()
  if (!user) return { ok: false, error: 'Please sign in again.' }
  const cleanName = name.trim().slice(0, 120)
  if (!cleanName) return { ok: false, error: 'Give your archive a name.' }

  const store = readStore()
  const newArchive = {
    id: `archive-${Date.now()}`,
    name: cleanName,
    ownerId: user.id,
    createdAt: new Date().toISOString(),
  }
  store.archives.push(newArchive)
  writeStore(store)
  return { ok: true, error: '' }
}

export async function saveMemoryAction(formData: FormData) {
  const user = await currentAppUser()
  if (!user) return { ok: false, error: 'Please sign in again.' }

  const title = text(formData.get('title'), 180)
  const story = text(formData.get('story'), 20000)
  const archive = text(formData.get('archive'), 120)

  if (!title || !story) {
    return { ok: false, error: 'Title and memory story are required.' }
  }

  try {
    const audioEntry = formData.get('audio')
    let audioUrl: string | undefined
    if (audioEntry instanceof globalThis.File && audioEntry.size > 0) {
      audioUrl = await saveUpload(audioEntry)
    }

    const files = formData.getAll('files').filter((entry): entry is globalThis.File => entry instanceof globalThis.File && entry.size > 0)
    const attachments = await Promise.all(files.map((file) => saveUpload(file)))

    const store = readStore()
    const newMemory: StoreMemory = {
      id: `memory-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      story,
      notes: text(formData.get('notes'), 10000),
      personName: text(formData.get('person'), 120) || 'Family',
      memoryDate: text(formData.get('date'), 30) || new Date().toISOString().slice(0, 10),
      tags: text(formData.get('tags'), 500)
        .split(',')
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter(Boolean)
        .slice(0, 20),
      audio: audioUrl,
      attachments,
      ownerId: user.id,
      createdAt: new Date().toISOString(),
      duration: audioUrl ? 'Audio · Voice' : 'Note',
    }

    store.memories.unshift(newMemory)
    writeStore(store)
    return { ok: true, error: '' }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}

export async function updateMemoryAction(id: string, formData: FormData) {
  const user = await currentAppUser()
  if (!user) return { ok: false, error: 'Please sign in again.' }

  try {
    const store = readStore()
    const memory = store.memories.find((m) => m.id === id)
    if (!memory) {
      return { ok: false, error: 'Memory not found.' }
    }

    memory.title = text(formData.get('title'), 180) || memory.title
    memory.story = text(formData.get('story'), 20000) || memory.story
    memory.notes = text(formData.get('notes'), 10000)
    memory.personName = text(formData.get('person'), 120) || memory.personName

    writeStore(store)
    return { ok: true, error: '' }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}

export async function deleteMemoryAction(id: string) {
  const user = await currentAppUser()
  if (!user) return { ok: false, error: 'Please sign in again.' }

  try {
    const store = readStore()
    store.memories = store.memories.filter((m) => m.id !== id)
    writeStore(store)
    return { ok: true, error: '' }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}
