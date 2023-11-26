import type { Category, Tag } from '../../models'

export const petStatus = {
  available: 'available',
  pending: 'pending',
  sold: 'sold',
} as const
export type PetStatus = (typeof petStatus)[keyof typeof petStatus]
export type Pet = {
  /**
   * @type integer | undefined int64
   * @example 10
   */
  id?: number
  /**
   * @type string
   * @example doggie
   */
  name: string
  category?: Category
  /**
   * @type array
   */
  photoUrls: string[]
  /**
   * @type array | undefined
   */
  tags?: Tag[]
  /**
   * @description pet status in the store
   * @type string | undefined
   */
  status?: PetStatus
}
