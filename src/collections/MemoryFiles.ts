import type { Access, CollectionConfig } from 'payload'

const owned: Access = ({ req }) =>
  req.user?.collection === 'users' ? { owner: { equals: req.user.id } } : false

export const MemoryFiles: CollectionConfig = {
  slug: 'memory-files',
  admin: { hidden: true },
  access: {
    create: ({ req }) => req.user?.collection === 'users',
    read: owned,
    update: owned,
    delete: owned,
  },
  hooks: {
    beforeChange: [
      ({ req, data, operation }) =>
        operation === 'create' && req.user?.collection === 'users'
          ? { ...data, owner: req.user.id }
          : data,
    ],
  },
  upload: true,
  fields: [
    { name: 'alt', type: 'text', required: true },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      access: { update: () => false },
      admin: { readOnly: true },
    },
  ],
}
