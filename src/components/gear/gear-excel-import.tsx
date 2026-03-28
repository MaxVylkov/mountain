'use client'

import { useState, useRef } from 'react'
import { Upload, Download, X, Check, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import * as XLSX from 'xlsx'

const CATEGORY_MAP: Record<string, string> = {
  'верёвки': 'ropes',
  'веревки': 'ropes',
  'железо': 'hardware',
  'одежда': 'clothing',
  'обувь': 'footwear',
  'бивуак': 'bivouac',
  'электроника': 'electronics',
  'другое': 'other',
  // English mappings
  'ropes': 'ropes',
  'hardware': 'hardware',
  'clothing': 'clothing',
  'footwear': 'footwear',
  'bivouac': 'bivouac',
  'electronics': 'electronics',
  'other': 'other',
}

const CONDITION_MAP: Record<string, string> = {
  'новое': 'new',
  'хорошее': 'good',
  'изношенное': 'worn',
  'нужен ремонт': 'needs_repair',
  'new': 'new',
  'good': 'good',
  'worn': 'worn',
  'needs_repair': 'needs_repair',
}

const CATEGORY_LABELS: Record<string, string> = {
  ropes: 'Верёвки',
  hardware: 'Железо',
  clothing: 'Одежда',
  footwear: 'Обувь',
  bivouac: 'Бивуак',
  electronics: 'Электроника',
  other: 'Другое',
}

interface ParsedRow {
  name: string
  category: string
  weight: number | null
  condition: string
  notes: string
  valid: boolean
  error?: string
}

interface GearExcelImportProps {
  userId: string
  onImportComplete: () => void
}

export function GearExcelImport({ userId, onImportComplete }: GearExcelImportProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Название', 'Категория', 'Вес (г)', 'Состояние', 'Заметки'],
      ['Верёвка динамическая 60м', 'Верёвки', 3200, 'Хорошее', ''],
      ['Карабин HMS', 'Железо', 80, 'Новое', 'Petzl Attache'],
      ['Куртка пуховая', 'Одежда', 450, 'Хорошее', ''],
      ['Ботинки альпинистские', 'Обувь', 1800, 'Изношенное', 'La Sportiva Nepal'],
      ['Палатка 2-местная', 'Бивуак', 2100, 'Хорошее', ''],
      ['Налобный фонарь', 'Электроника', 95, 'Новое', 'Petzl Actik Core'],
    ])

    ws['!cols'] = [
      { wch: 30 }, // Название
      { wch: 15 }, // Категория
      { wch: 10 }, // Вес
      { wch: 15 }, // Состояние
      { wch: 30 }, // Заметки
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Снаряжение')
    XLSX.writeFile(wb, 'шаблон_снаряжения.xlsx')
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = evt.target?.result
      const wb = XLSX.read(data, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws)

      const parsed: ParsedRow[] = rows.map((row) => {
        const name = String(row['Название'] || row['название'] || row['Name'] || row['name'] || '').trim()
        const categoryRaw = String(row['Категория'] || row['категория'] || row['Category'] || row['category'] || '').trim().toLowerCase()
        const weightRaw = row['Вес (г)'] ?? row['вес'] ?? row['Вес'] ?? row['Weight'] ?? row['weight'] ?? null
        const conditionRaw = String(row['Состояние'] || row['состояние'] || row['Condition'] || row['condition'] || 'хорошее').trim().toLowerCase()
        const notes = String(row['Заметки'] || row['заметки'] || row['Notes'] || row['notes'] || '').trim()

        const category = CATEGORY_MAP[categoryRaw]
        const condition = CONDITION_MAP[conditionRaw] || 'good'
        const weight = weightRaw !== null && weightRaw !== '' ? Number(weightRaw) : null

        if (!name) {
          return { name, category: category || 'other', weight, condition, notes, valid: false, error: 'Нет названия' }
        }
        if (!category) {
          return { name, category: 'other', weight, condition, notes, valid: true, error: `Неизвестная категория "${categoryRaw}", установлено "Другое"` }
        }

        return { name, category, weight, condition, notes, valid: true }
      })

      setParsedRows(parsed)
      setResult(null)
    }
    reader.readAsBinaryString(file)

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleImport() {
    const validRows = parsedRows.filter((r) => r.valid)
    if (validRows.length === 0) return

    setImporting(true)
    const supabase = createClient()
    let success = 0
    let errors = 0

    for (const row of validRows) {
      // Create gear item
      const { data: gearItem, error: gearError } = await supabase
        .from('gear')
        .insert({
          name: row.name,
          category: row.category,
          weight: row.weight,
          description: row.notes || null,
        })
        .select('id')
        .single()

      if (gearError || !gearItem) {
        errors++
        continue
      }

      // Link to user
      const { error: linkError } = await supabase
        .from('user_gear')
        .insert({
          user_id: userId,
          gear_id: gearItem.id,
          condition: row.condition,
          notes: row.notes || null,
        })

      if (linkError) {
        errors++
      } else {
        success++
      }
    }

    setResult({ success, errors })
    setImporting(false)

    if (success > 0) {
      setTimeout(() => {
        onImportComplete()
        setIsOpen(false)
        setParsedRows([])
        setResult(null)
      }, 2000)
    }
  }

  if (!isOpen) {
    return (
      <div className="flex gap-2">
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border transition-colors"
        >
          <Download size={14} />
          Шаблон Excel
        </button>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-mountain-primary/10 text-mountain-primary hover:bg-mountain-primary/20 transition-colors"
        >
          <Upload size={14} />
          Импорт из Excel
        </button>
      </div>
    )
  }

  return (
    <div className="bg-mountain-surface border border-mountain-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-mountain-text">Импорт снаряжения из Excel</h3>
        <button onClick={() => { setIsOpen(false); setParsedRows([]); setResult(null) }} className="text-mountain-muted hover:text-mountain-text">
          <X size={18} />
        </button>
      </div>

      {parsedRows.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-mountain-muted">
            Загрузите файл Excel (.xlsx) с колонками: Название, Категория, Вес (г), Состояние, Заметки.
          </p>
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border transition-colors"
            >
              <Download size={14} />
              Скачать шаблон
            </button>
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-mountain-primary text-white hover:bg-mountain-primary/90 cursor-pointer transition-colors">
              <Upload size={14} />
              Выбрать файл
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {parsedRows.length > 0 && !result && (
        <div className="space-y-3">
          <p className="text-sm text-mountain-muted">
            Найдено {parsedRows.length} строк, из них {parsedRows.filter(r => r.valid).length} валидных
          </p>

          {/* Preview table */}
          <div className="overflow-x-auto max-h-64 overflow-y-auto border border-mountain-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-mountain-bg sticky top-0">
                <tr>
                  <th className="text-left p-2 text-mountain-muted font-medium">Название</th>
                  <th className="text-left p-2 text-mountain-muted font-medium">Категория</th>
                  <th className="text-right p-2 text-mountain-muted font-medium">Вес</th>
                  <th className="text-left p-2 text-mountain-muted font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, i) => (
                  <tr key={i} className={`border-t border-mountain-border/50 ${!row.valid ? 'opacity-50' : ''}`}>
                    <td className="p-2 text-mountain-text">{row.name || '—'}</td>
                    <td className="p-2 text-mountain-muted">{CATEGORY_LABELS[row.category] || row.category}</td>
                    <td className="p-2 text-right text-mountain-muted font-mono">{row.weight ? `${row.weight} г` : '—'}</td>
                    <td className="p-2">
                      {row.valid && !row.error && <Check size={14} className="text-mountain-success" />}
                      {row.valid && row.error && (
                        <span className="flex items-center gap-1 text-xs text-mountain-accent">
                          <AlertTriangle size={12} /> {row.error}
                        </span>
                      )}
                      {!row.valid && (
                        <span className="flex items-center gap-1 text-xs text-mountain-danger">
                          <X size={12} /> {row.error}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={importing || parsedRows.filter(r => r.valid).length === 0}
            >
              {importing ? 'Импортирую...' : `Импортировать ${parsedRows.filter(r => r.valid).length} шт.`}
            </Button>
            <Button variant="outline" onClick={() => setParsedRows([])}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          {result.success > 0 && (
            <p className="text-sm text-mountain-success flex items-center gap-1.5">
              <Check size={16} /> Импортировано: {result.success} предметов
            </p>
          )}
          {result.errors > 0 && (
            <p className="text-sm text-mountain-danger flex items-center gap-1.5">
              <AlertTriangle size={16} /> Ошибки: {result.errors}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
