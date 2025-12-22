import { useState, useEffect } from 'react'
import type { Memory } from '@/types'
import { X, Clock, Hash, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/contexts/I18nContext'

interface MemoryModalProps {
  memory: Memory | null
  mode: 'view' | 'edit' | 'add'
  onClose: () => void
  onSave: (content: string) => Promise<void>
}

const memoryTypeLabelKeys: Record<string, string> = {
  personal: 'memory.list.types.personal',
  preference: 'memory.list.types.preference',
  fact: 'memory.list.types.fact',
  plan: 'memory.list.types.plan',
  manual: 'memory.list.types.manual',
  chat: 'memory.list.types.chat',
}

export function MemoryModal({ memory, mode, onClose, onSave }: MemoryModalProps) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const { t, language } = useI18n()

  useEffect(() => {
    if (memory) {
      setContent(memory.content)
    } else {
      setContent('')
    }
  }, [memory])

  const handleSave = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      await onSave(content.trim())
      onClose()
    } catch (error) {
      console.error('Failed to save memory:', error)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const title =
    mode === 'add'
      ? t('memory.modal.titles.add')
      : mode === 'edit'
        ? t('memory.modal.titles.edit')
        : t('memory.modal.titles.view')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-paper dark:bg-darkPaper rounded-xl shadow-xl border border-muted/10 dark:border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-muted/10 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 dark:bg-darkAccent/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-accent dark:text-darkAccent" />
            </div>
            <h2 className="text-lg font-serif text-ink dark:text-darkInk">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted/10 dark:hover:bg-white/5 text-subInk dark:text-darkSubInk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === 'view' && memory ? (
            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="text-xs text-muted dark:text-muted/60 uppercase tracking-wider">
                  {t('memory.modal.fields.type')}
                </label>
                <p className="text-ink dark:text-darkInk mt-1">
                  {memoryTypeLabelKeys[memory.memory_type]
                    ? t(memoryTypeLabelKeys[memory.memory_type])
                    : memory.memory_type}
                </p>
              </div>

              {/* Content */}
              <div>
                <label className="text-xs text-muted dark:text-muted/60 uppercase tracking-wider">
                  {t('memory.modal.fields.content')}
                </label>
                <p className="text-ink dark:text-darkInk mt-1 whitespace-pre-wrap leading-relaxed">
                  {memory.content}
                </p>
              </div>

              {/* Metadata */}
              <div className="flex gap-6 pt-4 border-t border-muted/10 dark:border-white/5">
                <div>
                  <label className="text-xs text-muted dark:text-muted/60 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {t('memory.modal.fields.createdAt')}
                  </label>
                  <p className="text-sm text-ink dark:text-darkInk mt-1">
                    {formatDate(memory.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted dark:text-muted/60 uppercase tracking-wider flex items-center gap-1">
                    <Hash className="w-3 h-3" /> {t('memory.modal.fields.useCount')}
                  </label>
                  <p className="text-sm text-ink dark:text-darkInk mt-1">
                    {t('memory.list.useCount', { count: memory.use_count })}
                  </p>
                </div>
              </div>

              {/* Usage records */}
              {memory.usage_records && memory.usage_records.length > 0 && (
                <div className="pt-4 border-t border-muted/10 dark:border-white/5">
                  <label className="text-xs text-muted dark:text-muted/60 uppercase tracking-wider">
                    {t('memory.modal.fields.recentUsage')}
                  </label>
                  <div className="mt-2 space-y-2">
                    {memory.usage_records.slice(0, 5).map((record, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-ink dark:text-darkInk truncate">
                          {record.topic_title || t('memory.list.untitled')}
                        </span>
                        <span className="text-muted dark:text-muted/60 text-xs shrink-0">
                          {formatDate(record.used_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs text-muted dark:text-muted/60 uppercase tracking-wider block mb-2">
                {t('memory.modal.fields.content')}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('memory.modal.fields.placeholder')}
                rows={5}
                className="w-full bg-white dark:bg-white/5 rounded-lg px-4 py-3 text-ink dark:text-darkInk placeholder:text-muted dark:placeholder:text-muted/60 border border-muted/10 dark:border-white/10 focus:border-accent dark:focus:border-darkAccent outline-none resize-none"
                autoFocus
              />
              <p className="text-xs text-muted dark:text-muted/60 mt-2">
                {t('memory.modal.fields.helper')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-muted/10 dark:border-white/5">
          <Button variant="ghost" onClick={onClose}>
            {mode === 'view' ? t('memory.modal.buttons.close') : t('memory.modal.buttons.cancel')}
          </Button>
          {mode !== 'view' && (
            <Button
              onClick={handleSave}
              disabled={!content.trim() || saving}
            >
              {saving ? t('memory.modal.buttons.saving') : t('memory.modal.buttons.save')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
