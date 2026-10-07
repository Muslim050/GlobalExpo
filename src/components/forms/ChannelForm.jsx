import { useEffect, useState } from 'react'
import { Radio } from 'lucide-react'
import { useData } from '@/context/DataContext.jsx'
import { useToast } from '@/components/ui/Toast.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { cn } from '@/lib/cn.js'

const TYPES = ['CTV', 'TV', 'Web', 'Mobile', 'Social', 'Audio']
const PALETTE = [
  '#0E7745',
  '#0EA5E9',
  '#D9A21B',
  '#F97316',
  '#E5484D',
  '#8B5CF6',
]

const emptyForm = {
  name: '',
  type: 'CTV',
  format: '',
  reach: '',
  cpm: '',
  fillRate: '90',
  status: 'active',
  color: PALETTE[0],
}

export function ChannelForm({ open, onClose, initial }) {
  const { create, update } = useData()
  const toast = useToast()
  const editing = !!initial
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setForm(
      initial
        ? {
            name: initial.name,
            type: initial.type,
            format: initial.format,
            reach: String(initial.reach),
            cpm: String(initial.cpm),
            fillRate: String(initial.fillRate),
            status: initial.status,
            color: initial.color,
          }
        : emptyForm,
    )
    setErrors({})
  }, [open, initial])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = () => {
    const err = {}
    if (!form.name.trim()) err.name = 'Укажите название'
    if (!form.reach || Number(form.reach) <= 0) err.reach = 'Охват больше нуля'
    setErrors(err)
    if (Object.keys(err).length) return

    const payload = {
      name: form.name.trim(),
      type: form.type,
      format: form.format.trim() || form.type,
      reach: Number(form.reach),
      cpm: Number(form.cpm) || 0,
      fillRate: Math.max(0, Math.min(100, Number(form.fillRate) || 0)),
      status: form.status,
      color: form.color,
    }

    if (editing) {
      update('channels', initial.id, payload)
      toast.success('Площадка обновлена')
    } else {
      create('channels', payload)
      toast.success('Площадка добавлена')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={Radio}
      title={editing ? 'Редактировать площадку' : 'Новая площадка'}
      description="Инвентарь для размещения стендов."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" onClick={submit}>
            {editing ? 'Сохранить' : 'Добавить'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Название" required error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Например, CTV Prime"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Тип">
            <Select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Формат" hint="Pre-roll, Native, In-feed…">
            <Input
              value={form.format}
              onChange={(e) => set('format', e.target.value)}
              placeholder="Pre-roll"
            />
          </Field>
          <Field label="Охват, чел." required error={errors.reach}>
            <Input
              type="number"
              min="0"
              value={form.reach}
              onChange={(e) => set('reach', e.target.value)}
              placeholder="5000000"
            />
          </Field>
          <Field label="CPM">
            <Input
              type="number"
              min="0"
              value={form.cpm}
              onChange={(e) => set('cpm', e.target.value)}
              placeholder="300"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fill rate, %">
            <Input
              type="number"
              min="0"
              max="100"
              value={form.fillRate}
              onChange={(e) => set('fillRate', e.target.value)}
            />
          </Field>
          <Field label="Статус">
            <Select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              <option value="active">Активен</option>
              <option value="inactive">Отключён</option>
            </Select>
          </Field>
        </div>

        <Field label="Цвет">
          <div className="flex flex-wrap gap-2 pt-1">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set('color', c)}
                className={cn(
                  'h-8 w-8 rounded-sm ring-2 ring-offset-2 ring-offset-surface transition-all',
                  form.color === c
                    ? 'ring-ink/40 scale-110'
                    : 'ring-transparent',
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  )
}
