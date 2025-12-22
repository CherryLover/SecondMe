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

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [providers, setProviders] = useState<Provider[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  const [showProviderModal, setShowProviderModal] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)

  // 密码修改
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // 设置更新
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
      console.error('加载数据失败:', error)
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
      console.error('删除服务商失败:', error)
      alert('删除失败')
    }
  }

  const handleUpdateSettings = async (updates: Partial<Settings>) => {
    if (!settings) return
    setSavingSettings(true)
    try {
      const updated = await api.updateSettings(updates)
      setSettings(updated)
    } catch (error) {
      console.error('更新设置失败:', error)
      alert('更新失败')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      alert('请填写当前密码和新密码')
      return
    }
    if (newPassword !== confirmPassword) {
      alert('两次输入的密码不一致')
      return
    }
    if (newPassword.length < 6) {
      alert('新密码至少需要6位')
      return
    }

    setChangingPassword(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      alert('密码修改成功')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('修改密码失败:', error)
      alert(error instanceof Error ? error.message : '修改失败')
    } finally {
      setChangingPassword(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-paper dark:bg-darkPaper flex items-center justify-center">
        <div className="text-subInk dark:text-darkSubInk">加载中...</div>
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
            <h1 className="text-lg font-serif text-ink dark:text-darkInk">设置</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* 主题设置 */}
        <section className="bg-white dark:bg-white/5 rounded-xl p-6 border border-muted/10 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-accent dark:text-darkAccent" />
              ) : (
                <Sun className="w-5 h-5 text-accent dark:text-darkAccent" />
              )}
              <div>
                <h2 className="font-medium text-ink dark:text-darkInk">主题</h2>
                <p className="text-sm text-subInk dark:text-darkSubInk">
                  当前: {theme === 'dark' ? '深色模式' : '浅色模式'}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={toggleTheme}>
              切换主题
            </Button>
          </div>
        </section>

        {/* 密码修改 */}
        <section className="bg-white dark:bg-white/5 rounded-xl p-6 border border-muted/10 dark:border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-accent dark:text-darkAccent" />
            <h2 className="font-medium text-ink dark:text-darkInk">修改密码</h2>
          </div>

          <div className="space-y-4 max-w-sm">
            <div>
              <label className="text-sm text-ink dark:text-darkInk block mb-1.5">
                当前密码
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="输入当前密码"
              />
            </div>
            <div>
              <label className="text-sm text-ink dark:text-darkInk block mb-1.5">
                新密码
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="输入新密码（至少6位）"
              />
            </div>
            <div>
              <label className="text-sm text-ink dark:text-darkInk block mb-1.5">
                确认新密码
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? '修改中...' : '修改密码'}
            </Button>
          </div>
        </section>

        {/* 管理员设置 */}
        {isAdmin && (
          <>
            {/* 服务商管理 */}
            <section className="bg-white dark:bg-white/5 rounded-xl p-6 border border-muted/10 dark:border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-accent dark:text-darkAccent" />
                  <h2 className="font-medium text-ink dark:text-darkInk">服务商管理</h2>
                </div>
                <Button size="sm" onClick={handleAddProvider}>
                  <Plus className="w-4 h-4 mr-1" />
                  添加
                </Button>
              </div>

              <ProviderList
                providers={providers}
                onEdit={handleEditProvider}
                onDelete={handleDeleteProvider}
              />
            </section>

            {/* 记忆设置 */}
            {settings && (
              <section className="bg-white dark:bg-white/5 rounded-xl p-6 border border-muted/10 dark:border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-5 h-5 text-accent dark:text-darkAccent" />
                  <h2 className="font-medium text-ink dark:text-darkInk">记忆设置</h2>
                </div>

                <div className="space-y-4 max-w-sm">
                  <div>
                    <label className="text-sm text-ink dark:text-darkInk block mb-1.5">
                      记忆检索数量 (Top K)
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
                      每次对话检索最相关的记忆条数
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
                      启用记忆自动提取
                    </label>
                  </div>

                  {settings.memory_extraction_enabled && (
                    <div>
                      <label className="text-sm text-ink dark:text-darkInk block mb-1.5">
                        静默提取间隔（分钟）
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
                        对话静默后多久触发记忆提取
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
