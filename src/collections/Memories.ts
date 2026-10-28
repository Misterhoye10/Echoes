import type { Access, CollectionConfig } from 'payload'

const owned: Access = ({ req }) =>
  req.user?.collection === 'users' ? { owner: { equals: req.user.id } } : false

export const Memories: CollectionConfig = {
  slug: 'memories',
  admin: { useAsTitle: 'title', group: 'Echoes' },
  access: { create: ({ req }) => req.user?.collection === 'users', read: owned, update: owned, delete: owned },
  hooks: {
    beforeValidate: [
      async ({ req, data, originalDoc }) => {
        if (req.user?.collection !== 'users') return data
        const archive = data?.archive || originalDoc?.archive
        if (!archive) throw new Error('An archive is required.')
        await req.payload.findByID({
          collection: 'archives',
          id: typeof archive === 'object' ? archive.id : archive,
          user: req.user,
          overrideAccess: false,
        })
        return data
      },
    ],
    beforeChange: [({ req, data, operation }) => operation === 'create' && req.user?.collection === 'users' ? { ...data, owner: req.user.id, aiStatus: 'not-configured' } : data],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'story', type: 'textarea', required: true },
    { name: 'memoryDate', type: 'date' },
    { name: 'personName', type: 'text' },
    { name: 'archive', type: 'relationship', relationTo: 'archives', required: true },
    { name: 'people', type: 'relationship', relationTo: 'people', hasMany: true },
    { name: 'collections', type: 'relationship', relationTo: 'memory-collections', hasMany: true },
    { name: 'tags', type: 'text', hasMany: true },
    { name: 'photos', type: 'upload', relationTo: 'memory-files', hasMany: true },
    { name: 'attachments', type: 'upload', relationTo: 'memory-files', hasMany: true },
    { name: 'audio', type: 'upload', relationTo: 'memory-files' },
    { name: 'transcript', type: 'textarea' },
    { name: 'summary', type: 'textarea' },
    { name: 'notes', type: 'textarea' },
    { name: 'aiStatus', type: 'select', defaultValue: 'not-configured', access: { update: () => false }, admin: { readOnly: true }, options: ['not-configured', 'queued', 'processing', 'complete', 'failed'] },
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true, access: { update: () => false }, admin: { readOnly: true } },
  ],
}
