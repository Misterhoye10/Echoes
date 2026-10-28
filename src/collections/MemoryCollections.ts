import type { Access, CollectionConfig } from 'payload'

const owned: Access = ({ req }) =>
  req.user?.collection === 'users' ? { owner: { equals: req.user.id } } : false

export const MemoryCollections: CollectionConfig = {
  slug: 'memory-collections',
  admin: { useAsTitle: 'name', group: 'Echoes' },
  access: { create: ({ req }) => req.user?.collection === 'users', read: owned, update: owned, delete: owned },
  hooks: { beforeChange: [({ req, data, operation }) => operation === 'create' && req.user?.collection === 'users' ? { ...data, owner: req.user.id } : data] },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true, access: { update: () => false }, admin: { readOnly: true } },
  ],
}
