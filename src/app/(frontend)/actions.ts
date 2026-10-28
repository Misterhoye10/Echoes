'use server'

import config from '@payload-config'
import { getPayload, type File } from 'payload'
import { currentAppUser, loginAppUser, logoutAppUser } from '@/lib/app-auth'

export type EchoMemory = {
  id: string
  title: string
  date: string
  person: string
  tags: string[]
  story: string
  notes: string
  audio?: string
}

function text(value: FormDataEntryValue | null, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

async function uploadFile(file: globalThis.File, user: NonNullable<Awaited<ReturnType<typeof currentAppUser>>>) {
  const payload = await getPayload({ config })
  const created = await payload.create({
    collection: 'memory-files',
    data: { alt: file.name || 'Memory attachment', owner: user.id },
    file: {
      data: Buffer.from(await file.arrayBuffer()),
      mimetype: file.type || 'application/octet-stream',
      name: file.name || 'memory-file',
      size: file.size,
    } satisfies File,
    overrideAccess: false,
    user,
  })
  return created.id
}

export async function authenticateAction(formData: FormData) {
  const email = text(formData.get('email'), 180).toLowerCase()
  const password = text(formData.get('password'), 128)
  const name = text(formData.get('name'), 120)
  const mode = text(formData.get('mode'), 10)
  if (!email || password.length < 8) return { ok: false, error: 'Use a valid email and at least 8 password characters.' }
  try {
    if (mode === 'signup') {
      if (!name) return { ok: false, error: 'Please add your name.' }
      const payload = await getPayload({ config })
      await payload.create({
        collection: 'users',
        data: { email, password, name },
        overrideAccess: false,
      })
    }
    await loginAppUser(email, password)
    return { ok: true, error: '' }
  } catch (error) {
    return { ok: false, error: mode === 'login' ? 'Email or password is incorrect.' : errorMessage(error) }
  }
}

export async function logoutAction() {
  await logoutAppUser()
  return { ok: true }
}

export async function loadWorkspaceAction() {
  const user = await currentAppUser()
  if (!user) return { authenticated: false as const, archives: [], memories: [], name: '' }
  const payload = await getPayload({ config })
  const [archives, memories] = await Promise.all([
    payload.find({ collection: 'archives', user, overrideAccess: false, limit: 20, sort: '-createdAt' }),
    payload.find({ collection: 'memories', user, overrideAccess: false, limit: 100, sort: '-createdAt', depth: 2 }),
  ])
  return {
    authenticated: true as const,
    name: user.name,
    archives: archives.docs.map((archive) => ({ id: archive.id, name: archive.name })),
    memories: memories.docs.map((memory) => ({
      id: memory.id,
      title: memory.title,
      date: memory.memoryDate
        ? new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(memory.memoryDate))
        : 'Date not set',
      person: memory.personName || 'Unassigned',
      tags: memory.tags || [],
      story: memory.story,
      notes: memory.notes || '',
      audio: typeof memory.audio === 'object' && memory.audio?.url ? memory.audio.url : undefined,
    })) satisfies EchoMemory[],
  }
}

export async function createArchiveAction(name: string) {
  const user = await currentAppUser()
  if (!user) return { ok: false, error: 'Please sign in again.' }
  const cleanName = name.trim().slice(0, 120)
  if (!cleanName) return { ok: false, error: 'Give your archive a name.' }
  const payload = await getPayload({ config })
  await payload.create({
    collection: 'archives',
    data: { name: cleanName, owner: user.id },
    user,
    overrideAccess: false,
  })
  return { ok: true, error: '' }
}

export async function saveMemoryAction(formData: FormData) {
  const user = await currentAppUser()
  if (!user) return { ok: false, error: 'Please sign in again.' }
  const title = text(formData.get('title'), 180)
  const story = text(formData.get('story'), 20000)
  const archive = text(formData.get('archive'), 120)
  if (!title || !story || !archive) return { ok: false, error: 'Title, memory, and archive are required.' }
  try {
    const payload = await getPayload({ config })
    const eligibleArchive = await payload.find({
      collection: 'archives',
      user,
      overrideAccess: false,
      where: { id: { equals: archive } },
      limit: 1,
    })
    if (!eligibleArchive.docs[0]) return { ok: false, error: 'That archive is not available.' }
    const audioEntry = formData.get('audio')
    const files = formData.getAll('files').filter((entry): entry is globalThis.File => entry instanceof globalThis.File && entry.size > 0)
    const audio = audioEntry instanceof globalThis.File && audioEntry.size > 0 ? await uploadFile(audioEntry, user) : undefined
    const attachments = await Promise.all(files.map((file) => uploadFile(file, user)))
    await payload.create({
      collection: 'memories',
      data: {
        title,
        story,
        archive,
        owner: user.id,
        personName: text(formData.get('person'), 120),
        memoryDate: text(formData.get('date'), 30) || undefined,
        tags: text(formData.get('tags'), 500).split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 20),
        audio,
        attachments,
      },
      user,
      overrideAccess: false,
    })
    return { ok: true, error: '' }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}

export async function updateMemoryAction(id: string, formData: FormData) {
  const user = await currentAppUser()
  if (!user) return { ok: false, error: 'Please sign in again.' }
  const payload = await getPayload({ config })
  try {
    await payload.update({
      collection: 'memories',
      id,
      data: {
        title: text(formData.get('title'), 180),
        story: text(formData.get('story'), 20000),
        notes: text(formData.get('notes'), 10000),
        personName: text(formData.get('person'), 120),
      },
      user,
      overrideAccess: false,
    })
    return { ok: true, error: '' }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}

export async function deleteMemoryAction(id: string) {
  const user = await currentAppUser()
  if (!user) return { ok: false, error: 'Please sign in again.' }
  try {
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'memories', id, user, overrideAccess: false })
    return { ok: true, error: '' }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}
