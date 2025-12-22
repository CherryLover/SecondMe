import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { api } from '@/services/api'
import type { Provider, ProviderInput, Settings } from '@/types'
import { ProviderList } from '@/components/settings/ProviderList'
import { ProviderModal } from '@/components/settings/ProviderModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Plus,
  Server,
  Brain,
  Moon,
  Sun,
  Key,
} from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()

  const [providers, setProviders] = useState<Provider[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  const [showProviderModal, setShowProviderModal] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Settings update
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      const [providersData, settingsData] = await Promise.all([
        api.getProviders(),
        api.getSettings(),
      ])
      setProviders(providersData.providers)
      setSettings(settingsData)
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProvider = () => {
    setEditingProvider(null)
    setShowProviderModal(true)
  }

  const handleEditProvider = (provider: Provider) => {
    setEditingProvider(provider)
    setShowProviderModal(true)
  }

  const handleSaveProvider = async (data: ProviderInput) => {
    if (editingProvider) {
      const updated = await api.updateProvider(editingProvider.id, data)
      setProviders(providers.map((p) => (p.id === updated.id ? updated : p)))
    } else {
      const newProvider = await api.createProvider(data)
      setProviders([...providers, newProvider])
    }
  }

  const handleDeleteProvider = async (id: string) => {
    try {
      await api.deleteProvider(id)
      setProviders(providers.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Failed to delete provider:', error)
      alert(t('settings.alerts.deleteFailed'))
    }
  }

  const handleUpdateSettings = async (updates: Partial<Settings>) => {
    if (!settings) return
    setSavingSettings(true)
    try {
      const updated = await api.updateSettings(updates)
      setSettings(updated)
    } catch (error) {
      console.error('Failed to update settings:', error)
      alert(t('settings.alerts.saveFailed'))
    } finally {
      setSavingSettings(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      alert(t('settings.password.errors.required'))
      return
    }
    if (newPassword !== confirmPassword) {
      alert(t('settings.password.errors.mismatch'))
      return
    }
    if (newPassword.length < 6) {
      alert(t('settings.password.errors.short'))
      return
    }

    setChangingPassword(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      alert(t('settings.password.success'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Failed to change password:', error)
      alert(error instanceof Error ? error.message : t('settings.alerts.saveFailed'))
    } finally {
      setChangingPassword(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-paper dark:bg-darkPaper flex items-center justify-center">
        <div className="text-subInk dark:text-darkSubInk">{t('common.loading')}</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const isAdmin = user.role === 'admin'

  return (
    <div className="min-h-screen bg-paper dark:bg-darkPaper">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-paper/80 dark:bg-darkPaper/80 backdrop-blur-sm border-b border-muted/10 dark:border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/app')}
            className="p-2 rounded-lg hover:bg-muted/10 dark:hover:bg-white/5 text-subInk dark:text-darkSubInk"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-accent dark:text-darkAccent" />
            <h1 className="text-lg font-serif text-ink dark:text-darkInk">{t('settings.title')}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Theme settings */}
        <section className="bg-white dark:bg-white/5 rounded-xl p-6 border border-muted/10 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-accent dark:text-darkAccent" />
              ) : (
                <Sun className="w-5 h-5 text-accent dark:text-darkAccent" />
              )}
              <div>
                <h2 className="font-medium text-ink dark:text-darkInk">{t('settings.theme.title')}</h2>
                <p className="text-sm text-subInk dark:text-darkSubInk">
                  {t('settings.theme.current', {
                    mode: theme === 'dark' ? t('settings.theme.dark') : t('settings.theme.light'),
                  })}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={toggleTheme}>
              {t('settings.theme.toggle')}
            </Button>
          </div>
        </section>

        {/* Password */}
        <section className="bg-white dark:bg-white/5 rounded-xl p-6 border border-muted/10 dark:border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-accent dark:text-darkAccent" />
            <h2 className="font-medium text-ink dark:text-darkInk">{t('settings.password.title')}</h2>
          </div>

          <div className="space-y-4 max-w-sm">
            <div>
              <label className="text-sm text-ink dark:text-darkInk block mb-1.5">
                {t('settings.password.current')}
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('settings.password.placeholderCurrent')}
              />
            </div>
            <div>
              <label className="text-sm text-ink dark:text-darkInk block mb-1.5">
                {t('settings.password.new')}
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('settings.password.placeholderNew')}
              />
            </div>
            <div>
              <label className="text-sm text-ink dark:text-darkInk block mb-1.5">
                {t('settings.password.confirm')}
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('settings.password.placeholderConfirm')}
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? t('settings.password.buttonLoading') : t('settings.password.button')}
            </Button>
          </div>
        </section>

        {/* Admin settings */}
        {isAdmin && (
          <>
            {/* Provider management */}
            <section className="bg-white dark:bg-white/5 rounded-xl p-6 border border-muted/10 dark:border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-accent dark:text-darkAccent" />
                  <h2 className="font-medium text-ink dark:text-darkInk">{t('settings.providers.title')}</h2>
                </div>
                <Button size="sm" onClick={handleAddProvider}>
                  <Plus className="w-4 h-4 mr-1" />
                  {t('settings.providers.add')}
                </Button>
              </div>

              <ProviderList
                providers={providers}
                onEdit={handleEditProvider}
                onDelete={handleDeleteProvider}
              />
            </section>

            {/* Memory settings */}
            {settings && (
              <section className="bg-white dark:bg-white/5 rounded-xl p-6 border border-muted/10 dark:border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-5 h-5 text-accent dark:text-darkAccent" />
                  <h2 className="font-medium text-ink dark:text-darkInk">{t('settings.memorySettings.title')}</h2>
                </div>

                <div className="space-y-4 max-w-sm">
                  <div>
                    <label className="text-sm text-ink dark:text-darkInk block mb-1.5">
                      {t('settings.memorySettings.topK')}
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={settings.memory_top_k}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 5
                        handleUpdateSettings({ memory_top_k: value })
                      }}
                      disabled={savingSettings}
                    />
                    <p className="text-xs text-muted dark:text-muted/60 mt-1">
                      {t('settings.memorySettings.topKDesc')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="memory_extraction"
                      checked={settings.memory_extraction_enabled}
                      onChange={(e) => {
                        handleUpdateSettings({ memory_extraction_enabled: e.target.checked })
                      }}
                      className="w-4 h-4 rounded border-muted/30 text-accent focus:ring-accent"
                    />
                    <label htmlFor="memory_extraction" className="text-sm text-ink dark:text-darkInk">
                      {t('settings.memorySettings.autoExtract')}
                    </label>
                  </div>

                  {settings.memory_extraction_enabled && (
                    <div>
                      <label className="text-sm text-ink dark:text-darkInk block mb-1.5">
                        {t('settings.memorySettings.idleMinutes')}
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        value={settings.memory_silent_minutes}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 5
                          handleUpdateSettings({ memory_silent_minutes: value })
                        }}
                      />
                      <p className="text-xs text-muted dark:text-muted/60 mt-1">
                        {t('settings.memorySettings.idleDesc')}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Provider Modal */}
      {showProviderModal && (
        <ProviderModal
          provider={editingProvider}
          onClose={() => setShowProviderModal(false)}
          onSave={handleSaveProvider}
        />
      )}
    </div>
  )
}
