import { useState, useEffect } from 'react'
import type { Provider, ProviderInput } from '@/types'
import { X, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ProviderModalProps {
  provider: Provider | null
  onClose: () => void
  onSave: (data: ProviderInput) => Promise<void>
}

export function ProviderModal({ provider, onClose, onSave }: ProviderModalProps) {
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (provider) {
      setName(provider.name)
      setBaseUrl(provider.base_url)
      setApiKey('') // API Key 不回显
      setEnabled(provider.enabled)
    } else {
      setName('')
      setBaseUrl('')
      setApiKey('')
      setEnabled(true)
    }
  }, [provider])

  const handleSave = async () => {
    if (!name.trim() || !baseUrl.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        base_url: baseUrl.trim(),
        api_key: apiKey.trim() || undefined,
        enabled,
      })
      onClose()
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const isEdit = !!provider

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-paper dark:bg-darkPaper rounded-xl shadow-xl border border-muted/10 dark:border-white/10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-muted/10 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 dark:bg-darkAccent/10 flex items-center justify-center">
              <Server className="w-4 h-4 text-accent dark:text-darkAccent" />
            </div>
            <h2 className="text-lg font-serif text-ink dark:text-darkInk">
              {isEdit ? '编辑服务商' : '添加服务商'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted/10 dark:hover:bg-white/5 text-subInk dark:text-darkSubInk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm text-ink dark:text-darkInk block mb-1.5">
              名称 *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：OpenAI、DeepSeek"
            />
          </div>

          <div>
            <label className="text-sm text-ink dark:text-darkInk block mb-1.5">
              Base URL *
            </label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="如：https://api.openai.com/v1"
            />
          </div>

          <div>
            <label className="text-sm text-ink dark:text-darkInk block mb-1.5">
              API Key {isEdit && '(留空保持不变)'}
            </label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-muted/30 text-accent focus:ring-accent"
            />
            <label htmlFor="enabled" className="text-sm text-ink dark:text-darkInk">
              启用此服务商
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-muted/10 dark:border-white/5">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !baseUrl.trim() || saving}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  )
}
