import { useState, useEffect } from 'react'
import type { Provider, ProviderInput } from '@/types'
import { X, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/contexts/I18nContext'

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
  const { t } = useI18n()

  useEffect(() => {
    if (provider) {
      setName(provider.name)
      setBaseUrl(provider.base_url)
      setApiKey('') // Never echo the API key
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
      console.error('Failed to save provider:', error)
      alert(t('provider.modal.alerts.saveFailed'))
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
              {isEdit ? t('provider.modal.editTitle') : t('provider.modal.addTitle')}
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
              {t('provider.modal.fields.name')}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('provider.modal.fields.namePlaceholder')}
            />
          </div>

          <div>
            <label className="text-sm text-ink dark:text-darkInk block mb-1.5">
              {t('provider.modal.fields.baseUrl')}
            </label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={t('provider.modal.fields.baseUrlPlaceholder')}
            />
          </div>

          <div>
            <label className="text-sm text-ink dark:text-darkInk block mb-1.5">
              {t('provider.modal.fields.apiKey')}{' '}
              {isEdit && t('provider.modal.fields.apiKeyHint')}
            </label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('provider.modal.fields.apiKeyPlaceholder')}
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
              {t('provider.modal.fields.enabled')}
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-muted/10 dark:border-white/5">
          <Button variant="ghost" onClick={onClose}>
            {t('provider.modal.buttons.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !baseUrl.trim() || saving}
          >
            {saving ? t('provider.modal.buttons.saving') : t('provider.modal.buttons.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}
