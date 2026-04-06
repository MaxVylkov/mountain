'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MARKETPLACE_CATEGORIES, MARKETPLACE_CONDITIONS } from '@/lib/marketplace-data'
import { Upload, X } from 'lucide-react'

interface ListingFormProps {
  prefill?: {
    gearId: string
    title: string
    category: string
    condition: string
  } | null
  defaultCity: string
  editId?: string
  initialValues?: {
    type: 'sell' | 'swap' | 'free'
    title: string
    category: string
    condition: string
    price: string
    city: string
    description: string
    telegram: string
    phone: string
    showContact: boolean
  }
}

export function ListingForm({ prefill, defaultCity, editId, initialValues }: ListingFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [type, setType] = useState<'sell' | 'swap' | 'free'>(initialValues?.type ?? 'sell')
  const [title, setTitle] = useState(initialValues?.title ?? prefill?.title ?? '')
  const [category, setCategory] = useState(initialValues?.category ?? prefill?.category ?? '')
  const [condition, setCondition] = useState(initialValues?.condition ?? prefill?.condition ?? MARKETPLACE_CONDITIONS[1])
  const [price, setPrice] = useState(initialValues?.price ?? '')
  const [city, setCity] = useState(initialValues?.city ?? defaultCity)
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [telegram, setTelegram] = useState(initialValues?.telegram ?? '')
  const [phone, setPhone] = useState(initialValues?.phone ?? '')
  const [showContact, setShowContact] = useState(initialValues?.showContact ?? false)
  const [images, setImages] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Необходима авторизация')

      // Edit mode — update existing listing (no photo changes in v1)
      if (editId) {
        const { error: updateError } = await supabase
          .from('marketplace_listings')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            category,
            condition,
            transaction_type: type,
            price: type === 'sell' ? (parseInt(price) || 0) : null,
            city: city.trim(),
            contact_telegram: telegram.trim() || null,
            contact_phone: phone.trim() || null,
            show_contact: showContact,
          })
          .eq('id', editId)
        if (updateError) throw updateError
        router.push(`/marketplace/${editId}`)
        return
      }

      // Create mode — upload photos first (listing ID not yet known)
      // Path: {user_id}/{timestamp}-{random}.{ext}
      // Orphaned uploads if insert fails are acceptable for v1.
      const imagePaths: string[] = []
      for (const file of images) {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('marketplace')
          .upload(path, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('marketplace').getPublicUrl(path)
        imagePaths.push(publicUrl)
      }

      const { data: listing, error: insertError } = await supabase
        .from('marketplace_listings')
        .insert({
          user_id: user.id,
          gear_id: prefill?.gearId ?? null,
          title: title.trim(),
          description: description.trim() || null,
          category,
          condition,
          transaction_type: type,
          price: type === 'sell' ? (parseInt(price) || 0) : null,
          city: city.trim(),
          contact_telegram: telegram.trim() || null,
          contact_phone: phone.trim() || null,
          show_contact: showContact,
          images: imagePaths,
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      router.push(`/marketplace/${listing.id}`)
    } catch (err: any) {
      setError(err.message ?? 'Ошибка при сохранении')
    } finally {
      setUploading(false)
    }
  }

  const inputClass = 'w-full bg-mountain-surface border border-mountain-border rounded-lg px-3 py-2.5 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary/50'
  const labelClass = 'block text-xs font-semibold text-mountain-muted mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Transaction type */}
      <div>
        <label className={labelClass}>Тип объявления</label>
        <div className="flex gap-2">
          {(['sell', 'swap', 'free'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                type === t
                  ? t === 'sell' ? 'bg-green-500/15 border-green-500/40 text-green-400'
                    : t === 'swap' ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400'
                  : 'border-mountain-border text-mountain-muted'
              }`}
            >
              {t === 'sell' ? 'Продам' : t === 'swap' ? 'Обмен' : 'Отдам'}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className={labelClass}>Название</label>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Petzl Corax 35, размер M" />
      </div>

      {/* Category */}
      <div>
        <label className={labelClass}>Категория</label>
        <select required value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          <option value="">Выбрать категорию</option>
          {MARKETPLACE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Condition */}
      <div>
        <label className={labelClass}>Состояние</label>
        <select required value={condition} onChange={(e) => setCondition(e.target.value)} className={inputClass}>
          {MARKETPLACE_CONDITIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Price — only for sell */}
      {type === 'sell' && (
        <div>
          <label className={labelClass}>Цена (₽)</label>
          <input
            type="number"
            min="0"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
            placeholder="3500"
          />
        </div>
      )}

      {/* City */}
      <div>
        <label className={labelClass}>Город</label>
        <input required value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} placeholder="Москва" />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Описание</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputClass + ' resize-none'}
          placeholder="Состояние, причина продажи, особенности..."
        />
      </div>

      {/* Photos — only shown in create mode (not edit) */}
      {!editId && (
        <div>
          <label className={labelClass}>Фото (до 5)</label>
          <label className="flex items-center justify-center gap-2 border border-dashed border-mountain-border rounded-lg py-4 text-xs text-mountain-muted cursor-pointer hover:border-mountain-primary/40 transition-colors">
            <Upload size={14} />
            Добавить фото
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []).slice(0, 5)
                setImages(files)
              }}
            />
          </label>
          {images.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {images.map((f, i) => (
                <div key={i} className="relative">
                  <img src={URL.createObjectURL(f)} className="w-16 h-16 object-cover rounded-lg" alt="" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <X size={8} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contact */}
      <div className="space-y-3">
        <label className={labelClass}>Контакт (необязательно)</label>
        <input value={telegram} onChange={(e) => setTelegram(e.target.value)} className={inputClass} placeholder="@username в Telegram" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+7 900 000-00-00" />
        <label className="flex items-center gap-2 text-xs text-mountain-muted cursor-pointer">
          <input
            type="checkbox"
            checked={showContact}
            onChange={(e) => setShowContact(e.target.checked)}
            className="rounded"
          />
          Показывать контакт посетителям
        </label>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={uploading}
        className="w-full py-3 rounded-lg bg-mountain-primary text-white text-sm font-semibold hover:bg-mountain-primary/90 transition-colors disabled:opacity-50"
      >
        {uploading ? (editId ? 'Сохраняю...' : 'Публикую...') : (editId ? 'Сохранить' : 'Опубликовать')}
      </button>
    </form>
  )
}
