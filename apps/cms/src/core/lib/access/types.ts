import { User } from '@/payload-types'
import { AccessArgs, FieldAccessArgs, Where } from 'payload'

export type isAccessible<T extends boolean | Where = boolean | Where> = (
  args: AccessArgs<User> | FieldAccessArgs<User> | { req: { user: User; collection?: 'users' } },
) => T
