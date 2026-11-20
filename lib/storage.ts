export const STORAGE_LIMIT_MB = parseInt(process.env.STORAGE_LIMIT_MB || '512', 10) || 512
export const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_MB * 1024 * 1024
export const PHOTO_BACKUP_TTL_HOURS =
  parseInt(process.env.PHOTO_BACKUP_TTL_HOURS || '24', 10) || 24
export const PHOTO_BACKUP_TTL_MS = PHOTO_BACKUP_TTL_HOURS * 60 * 60 * 1000
export const MAX_EXPORT_RECORDS = 50
export const MAX_PURGE_RECORDS = 25
export const ORPHAN_MIN_AGE_MS = 60 * 60 * 1000
