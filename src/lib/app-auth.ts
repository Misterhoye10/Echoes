import config from '@payload-config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'

const COOKIE = 'app-session'

export async function currentAppUser() {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  const payload = await getPayload({ config })
  const { user } = await payload.auth({
    headers: new Headers({ Authorization: `JWT ${token}` }),
  })
  return user?.collection === 'users' ? user : null
}

export async function loginAppUser(email: string, password: string) {
  const payload = await getPayload({ config })
  const result = await payload.login({
    collection: 'users',
    data: { email, password },
    overrideAccess: false,
  })
  if (!result.token || !result.user) throw new Error('Unable to start a secure session.')
  ;(await cookies()).set(COOKIE, result.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return result.user
}

export async function logoutAppUser() {
  ;(await cookies()).delete(COOKIE)
}
