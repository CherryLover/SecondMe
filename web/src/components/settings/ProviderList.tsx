import { useState } from 'react'
import type { Provider } from '@/types'
import { Server, Trash2, Edit3, CheckCircle, XCircle } from 'lucide-react'

interface ProviderListProps {
  providers: Provider[]
  onEdit: (provider: Provider) => void
  onDelete: (id: string) => void
}

export function ProviderList({ providers, onEdit, onDelete }: ProviderListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个服务商吗？')) return
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  if (providers.length === 0) {
    return (
      <div className="text-center py-8 text-subInk dark:text-darkSubInk text-sm">
        暂无服务商配置
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <div
          key={provider.id}
          className="group bg-white dark:bg-white/5 rounded-lg p-4 border border-muted/10 dark:border-white/5 hover:border-accent/20 dark:hover:border-darkAccent/20 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 dark:bg-darkAccent/10 flex items-center justify-center">
                <Server className="w-5 h-5 text-accent dark:text-darkAccent" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink dark:text-darkInk">
                    {provider.name}
                  </span>
                  {provider.enabled ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted" />
                  )}
                </div>
                <p className="text-xs text-muted dark:text-muted/60 truncate max-w-xs">
                  {provider.base_url}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(provider)}
                className="p-2 rounded-lg hover:bg-muted/10 dark:hover:bg-white/5 text-subInk dark:text-darkSubInk"
                title="编辑"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(provider.id)}
                disabled={deletingId === provider.id}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 disabled:opacity-50"
                title="删除"
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
