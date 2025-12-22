import { useState } from 'react'
import type { Memory } from '@/types'
import { Brain, Trash2, Edit3, Eye, Clock, Hash } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'

interface MemoryListProps {
  memories: Memory[]
  onView: (memory: Memory) => void
  onEdit: (memory: Memory) => void
  onDelete: (id: string) => void
}

const memoryTypeLabelKeys: Record<string, string> = {
  personal: 'memory.list.types.personal',
  preference: 'memory.list.types.preference',
  fact: 'memory.list.types.fact',
  plan: 'memory.list.types.plan',
  manual: 'memory.list.types.manual',
  chat: 'memory.list.types.chat',
}

const memoryTypeColors: Record<string, string> = {
  personal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  preference: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  fact: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  plan: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  manual: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  chat: 'bg-accent/10 text-accent dark:bg-darkAccent/20 dark:text-darkAccent',
}

export function MemoryList({ memories, onView, onEdit, onDelete }: MemoryListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { t, language } = useI18n()

  const handleDelete = async (id: string) => {
    if (!confirm(t('memory.confirmations.deleteOne'))) return
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-accent/10 dark:bg-darkAccent/10 flex items-center justify-center mb-4">
          <Brain className="w-8 h-8 text-accent dark:text-darkAccent" />
        </div>
        <h3 className="text-lg font-serif text-ink dark:text-darkInk mb-2">
          {t('memory.empty.title')}
        </h3>
        <p className="text-subInk dark:text-darkSubInk text-sm max-w-xs">
          {t('memory.empty.desc')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {memories.map((memory) => (
        <div
          key={memory.id}
          className="group bg-white dark:bg-white/5 rounded-lg p-4 border border-muted/10 dark:border-white/5 hover:border-accent/20 dark:hover:border-darkAccent/20 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {/* Type badges */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${memoryTypeColors[memory.memory_type] || memoryTypeColors.chat}`}>
                  {memoryTypeLabelKeys[memory.memory_type]
                    ? t(memoryTypeLabelKeys[memory.memory_type])
                    : memory.memory_type}
                </span>
                {memory.source === 'manual' && (
                  <span className="text-xs text-muted dark:text-muted/60">{t('common.labels.manual')}</span>
                )}
              </div>

              {/* Content */}
              <p className="text-ink dark:text-darkInk text-sm leading-relaxed line-clamp-3">
                {memory.content}
              </p>

              {/* Metadata */}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted dark:text-muted/60">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(memory.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {t('memory.list.useCount', { count: memory.use_count })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onView(memory)}
                className="p-2 rounded-lg hover:bg-muted/10 dark:hover:bg-white/5 text-subInk dark:text-darkSubInk"
                title={t('memory.list.view')}
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEdit(memory)}
                className="p-2 rounded-lg hover:bg-muted/10 dark:hover:bg-white/5 text-subInk dark:text-darkSubInk"
                title={t('memory.list.edit')}
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(memory.id)}
                disabled={deletingId === memory.id}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 disabled:opacity-50"
                title={t('memory.list.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
