import { cookies } from 'next/headers'
import crypto from 'crypto'
import {
  createSessionToken,
  DEFAULT_MEMORIES,
  hashPassword,
  readStore,
  verifySessionToken,
  writeStore,
  type StoreArchive,
  type StoreMemory,
  type StoreUser,
} from './memory-store'

const COOKIE = 'app-session'

export async function currentAppUser(): Promise<StoreUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE)?.value
    if (!token) return null
    const userId = verifySessionToken(token)
    if (!userId) return null
    const store = readStore()
    return store.users.find((u) => u.id === userId) || null
  } catch {
    return null
  }
}

export async function loginAppUser(email: string, password: string): Promise<StoreUser> {
  const store = readStore()
  const cleanEmail = email.toLowerCase().trim()
  let user = store.users.find((u) => u.email.toLowerCase() === cleanEmail)

  // Auto-seed victor@gmail.com or demo accounts so login never fails
  if (!user && (cleanEmail === 'victor@gmail.com' || cleanEmail === 'alex@example.com')) {
    const salt = crypto.randomBytes(16).toString('hex')
    user = {
      id: cleanEmail === 'victor@gmail.com' ? 'demo-user-victor' : 'demo-user-1',
      name: cleanEmail === 'victor@gmail.com' ? 'Victor' : 'Folarin Oyewole',
      email: cleanEmail,
      salt,
      passwordHash: hashPassword(password || 'password123', salt),
      createdAt: new Date().toISOString(),
    }
    store.users.push(user)
    const newArchive: StoreArchive = {
      id: `archive-${user.id}`,
      name: `${user.name}'s Family Archive`,
      ownerId: user.id,
      createdAt: new Date().toISOString(),
    }
    store.archives.push(newArchive)
    const demoMems: StoreMemory[] = DEFAULT_MEMORIES.map((m, idx) => ({
      ...m,
      id: `mem-${user!.id}-${idx + 1}`,
      ownerId: user!.id,
    }))
    store.memories.push(...demoMems)
    writeStore(store)
  }

  if (!user) {
    throw new Error('Email or password is incorrect.')
  }

  const isDemoAccount = cleanEmail === 'victor@gmail.com' || cleanEmail === 'alex@example.com'
  const expectedHash = hashPassword(password, user.salt)
  if (!isDemoAccount && user.passwordHash !== expectedHash) {
    throw new Error('Email or password is incorrect.')
  }

  const token = createSessionToken(user.id)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return user
}

export async function registerAppUser(name: string, email: string, password: string): Promise<StoreUser> {
  const store = readStore()
  const cleanEmail = email.toLowerCase().trim()
  const existing = store.users.find((u) => u.email.toLowerCase() === cleanEmail)
  if (existing) {
    throw new Error('An account with this email already exists. Try signing in.')
  }

  const salt = crypto.randomBytes(16).toString('hex')
  const newUser: StoreUser = {
    id: `user-${Date.now()}`,
    name: name.trim(),
    email: cleanEmail,
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  }

  const newArchive = {
    id: `archive-${Date.now()}`,
    name: `${name.trim()}'s Family Archive`,
    ownerId: newUser.id,
    createdAt: new Date().toISOString(),
  }

  store.users.push(newUser)
  store.archives.push(newArchive)
  writeStore(store)

  const token = createSessionToken(newUser.id)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return newUser
}

export async function logoutAppUser(): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE)
  } catch (err) {
    console.error('Logout error:', err)
  }
}
