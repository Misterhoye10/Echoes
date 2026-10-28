import type { Access, CollectionConfig } from 'payload'

const self: Access = ({ req }) =>
  req.user?.collection === 'users' ? { id: { equals: req.user.id } } : false

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { hidden: true, useAsTitle: 'name' },
  access: { create: () => true, read: self, update: self, delete: self },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'onboarded', type: 'checkbox', defaultValue: false },
  ],
}
