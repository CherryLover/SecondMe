import { useState } from 'react'
import type { Flowmo } from '@/types'
import { Sparkles, Trash2, MessageCircle } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'

interface FlowmoListProps {
  flowmos: Flowmo[]
  onDelete: (id: string) => void
}

export function FlowmoList({ flowmos, onDelete }: FlowmoListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { t, language } = useI18n()

  const handleDelete = async (id: string) => {
    if (!confirm(t('flowmo.confirmations.deleteOne'))) return
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('common.time.justNow')
    if (diffMins < 60) return t('common.time.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('common.time.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('common.time.daysAgo', { count: diffDays })

    return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (flowmos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-accent/10 dark:bg-darkAccent/10 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-accent dark:text-darkAccent" />
        </div>
        <h3 className="text-lg font-serif text-ink dark:text-darkInk mb-2">
          {t('flowmo.list.emptyTitle')}
        </h3>
        <p className="text-subInk dark:text-darkSubInk text-sm max-w-xs">
          {t('flowmo.list.emptyDesc')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {flowmos.map((flowmo) => (
        <div
          key={flowmo.id}
          className="group bg-white dark:bg-white/5 rounded-lg p-4 border border-muted/10 dark:border-white/5 hover:border-accent/20 dark:hover:border-darkAccent/20 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 dark:bg-darkAccent/10 flex items-center justify-center shrink-0">
              {flowmo.source === 'chat' ? (
                <MessageCircle className="w-4 h-4 text-accent dark:text-darkAccent" />
              ) : (
                <Sparkles className="w-4 h-4 text-accent dark:text-darkAccent" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-ink dark:text-darkInk text-sm leading-relaxed whitespace-pre-wrap">
                {flowmo.content}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted dark:text-muted/60">
                  {formatDate(flowmo.created_at)}
                </span>
                {flowmo.source === 'chat' && (
                  <span className="text-xs text-accent dark:text-darkAccent">
                    {t('flowmo.list.fromChat')}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleDelete(flowmo.id)}
              disabled={deletingId === flowmo.id}
              className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 disabled:opacity-50 transition-opacity"
              title={t('flowmo.list.delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
