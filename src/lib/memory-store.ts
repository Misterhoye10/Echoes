import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export type StoreUser = {
  id: string
  name: string
  email: string
  passwordHash: string
  salt: string
  createdAt: string
}

export type StoreArchive = {
  id: string
  name: string
  ownerId: string
  createdAt: string
}

export type StoreMemory = {
  id: string
  title: string
  story: string
  notes?: string
  personName?: string
  memoryDate?: string
  tags: string[]
  audio?: string
  attachments?: string[]
  ownerId: string
  createdAt: string
  image?: string
  duration?: string
}

export type DataStore = {
  users: StoreUser[]
  archives: StoreArchive[]
  memories: StoreMemory[]
}

const DATA_DIR = path.resolve(process.cwd(), '.data')
const STORE_FILE = path.join(DATA_DIR, 'archive-store.json')
const SECRET_KEY = process.env.APP_SECRET || 'echoes-memorial-sovereign-secret-key-2026'

// Hash password with salt using standard Node.js crypto
export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex')
}

// Generate session token (HMAC signed)
export function createSessionToken(userId: string): string {
  const timestamp = Date.now().toString()
  const payload = Buffer.from(JSON.stringify({ userId, timestamp })).toString('base64url')
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

// Verify session token
export function verifySessionToken(token: string): string | null {
  try {
    const [payload, signature] = token.split('.')
    if (!payload || !signature) return null
    const expected = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('base64url')
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
      return decoded.userId
    }
  } catch {
    return null
  }
  return null
}

const DEFAULT_MEMORIES: Omit<StoreMemory, 'ownerId'>[] = [
  {
    id: 'demo-1',
    title: "Mom's childhood stories",
    memoryDate: '2023-03-12',
    personName: 'Mom',
    tags: ['family', 'childhood', 'stories'],
    duration: 'Audio · 12 min',
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
    story: "Every Sunday morning, Mom would gather us on the porch and tell stories about growing up in the old house by the river. 'We didn't have much,' she would say, 'but we had laughter, fresh bread, and each other.' She taught us that gratitude turns what we have into enough.",
    notes: 'Recorded on the back porch with the spring rain falling.',
    createdAt: new Date('2023-03-12').toISOString(),
  },
  {
    id: 'demo-2',
    title: "Grandma's lasagna recipe",
    memoryDate: '2023-02-28',
    personName: 'Grandma Maria',
    tags: ['food', 'recipe', 'traditions'],
    duration: 'Note · 5 min',
    image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=600&q=80',
    story: "The secret is three layers of slow-simmered San Marzano tomatoes, fresh basil bruised by hand (never cut with metal), and ricotta folded with nutmeg. She told us: 'You don't rush the sauce. You let it talk to the garlic until they become friends.'",
    notes: 'Preserved handwritten recipe card from 1968.',
    createdAt: new Date('2023-02-28').toISOString(),
  },
  {
    id: 'demo-3',
    title: "Dad's life advice on courage",
    memoryDate: '2023-01-15',
    personName: 'Dad',
    tags: ['wisdom', 'life', 'advice'],
    duration: 'Audio · 8 min',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80',
    story: "Dad sat down at the workbench, wiping grease off his hands with a rag. 'Son, courage isn't the absence of fear. Courage is walking straight through the trembling because what's waiting on the other side is worth it.' I still carry those words in my pocket every day.",
    notes: 'Recorded in the garage during winter break.',
    createdAt: new Date('2023-01-15').toISOString(),
  },
  {
    id: 'demo-4',
    title: "Our family trip to the mountains",
    memoryDate: '2022-08-06',
    personName: 'The Family',
    tags: ['travel', 'family', 'adventure'],
    duration: 'Photo · 24 photos',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    story: "We reached the peak just as the fog broke over the valley. Everyone was exhausted, but as the golden sunlight hit our faces, we all went completely silent. Maya reached out and held Mom's hand. That was the moment time stood still.",
    notes: 'Heirloom family photo album from the Rockies trip.',
    createdAt: new Date('2022-08-06').toISOString(),
  },
]

function getInitialStore(): DataStore {
  const defaultSalt = crypto.randomBytes(16).toString('hex')
  const defaultUser: StoreUser = {
    id: 'demo-user-1',
    name: 'Folarin Oyewole',
    email: 'alex@example.com',
    salt: defaultSalt,
    passwordHash: hashPassword('archive123', defaultSalt),
    createdAt: new Date().toISOString(),
  }

  const defaultArchive: StoreArchive = {
    id: 'family-archive',
    name: 'Family Memory Archive',
    ownerId: defaultUser.id,
    createdAt: new Date().toISOString(),
  }

  const defaultMemories: StoreMemory[] = DEFAULT_MEMORIES.map((m) => ({
    ...m,
    ownerId: defaultUser.id,
  }))

  return {
    users: [defaultUser],
    archives: [defaultArchive],
    memories: defaultMemories,
  }
}

export function readStore(): DataStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(STORE_FILE)) {
      const initial = getInitialStore()
      fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), 'utf-8')
      return initial
    }
    const raw = fs.readFileSync(STORE_FILE, 'utf-8')
    return JSON.parse(raw) as DataStore
  } catch (err) {
    console.error('Failed to read memory store, using fallback:', err)
    return getInitialStore()
  }
}

export function writeStore(store: DataStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write memory store:', err)
  }
}
