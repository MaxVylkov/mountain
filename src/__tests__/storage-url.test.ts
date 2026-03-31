import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('storageUrl', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('generates correct public URL for a given bucket and path', async () => {
    const { storageUrl } = await import('@/lib/storage-url')
    const url = storageUrl('forum-attachments', 'abc/def/1234_photo.jpg')
    expect(url).toBe('https://test.supabase.co/storage/v1/object/public/forum-attachments/abc/def/1234_photo.jpg')
  })

  it('works with user-documents bucket', async () => {
    const { storageUrl } = await import('@/lib/storage-url')
    const url = storageUrl('user-documents', 'uid-123/1234_file.pdf')
    expect(url).toBe('https://test.supabase.co/storage/v1/object/public/user-documents/uid-123/1234_file.pdf')
  })
})
