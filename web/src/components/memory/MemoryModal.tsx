import { useState, useEffect } from 'react'
import type { Memory } from '@/types'
import { X, Clock, Hash, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MemoryModalProps {
  memory: Memory | null
  mode: 'view' | 'edit' | 'add'
  onClose: () => void
  onSave: (content: string) => Promise<void>
}

const memoryTypeLabels: Record<string, string> = {
  personal: '个人信息',
  preference: '偏好',
  fact: '事实',
  plan: '计划',
  manual: '手动添加',
  chat: '对话提取',
}

export function MemoryModal({ memory, mode, onClose, onSave }: MemoryModalProps) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

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
      console.error('保存失败:', error)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const title = mode === 'add' ? '添加记忆' : mode === 'edit' ? '编辑记忆' : '记忆详情'

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
              {/* 类型 */}
              <div>
                <label className="text-xs text-muted dark:text-muted/60 uppercase tracking-wider">
                  类型
                </label>
                <p className="text-ink dark:text-darkInk mt-1">
                  {memoryTypeLabels[memory.memory_type] || memory.memory_type}
                </p>
              </div>

              {/* 内容 */}
              <div>
                <label className="text-xs text-muted dark:text-muted/60 uppercase tracking-wider">
                  内容
                </label>
                <p className="text-ink dark:text-darkInk mt-1 whitespace-pre-wrap leading-relaxed">
                  {memory.content}
                </p>
              </div>

              {/* 元信息 */}
              <div className="flex gap-6 pt-4 border-t border-muted/10 dark:border-white/5">
                <div>
                  <label className="text-xs text-muted dark:text-muted/60 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 创建时间
                  </label>
                  <p className="text-sm text-ink dark:text-darkInk mt-1">
                    {formatDate(memory.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted dark:text-muted/60 uppercase tracking-wider flex items-center gap-1">
                    <Hash className="w-3 h-3" /> 使用次数
                  </label>
                  <p className="text-sm text-ink dark:text-darkInk mt-1">
                    {memory.use_count} 次
                  </p>
                </div>
              </div>

              {/* 使用记录 */}
              {memory.usage_records && memory.usage_records.length > 0 && (
                <div className="pt-4 border-t border-muted/10 dark:border-white/5">
                  <label className="text-xs text-muted dark:text-muted/60 uppercase tracking-wider">
                    最近使用
                  </label>
                  <div className="mt-2 space-y-2">
                    {memory.usage_records.slice(0, 5).map((record, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-ink dark:text-darkInk truncate">
                          {record.topic_title || '未命名对话'}
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
                记忆内容
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="输入你想记住的信息..."
                rows={5}
                className="w-full bg-white dark:bg-white/5 rounded-lg px-4 py-3 text-ink dark:text-darkInk placeholder:text-muted dark:placeholder:text-muted/60 border border-muted/10 dark:border-white/10 focus:border-accent dark:focus:border-darkAccent outline-none resize-none"
                autoFocus
              />
              <p className="text-xs text-muted dark:text-muted/60 mt-2">
                这些信息会在对话中被自动检索使用
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-muted/10 dark:border-white/5">
          <Button variant="ghost" onClick={onClose}>
            {mode === 'view' ? '关闭' : '取消'}
          </Button>
          {mode !== 'view' && (
            <Button
              onClick={handleSave}
              disabled={!content.trim() || saving}
            >
              {saving ? '保存中...' : '保存'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
