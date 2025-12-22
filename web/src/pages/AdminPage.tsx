import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import type { InviteCode, User } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/contexts/I18nContext'
import {
  ArrowLeft,
  Shield,
  Plus,
  Trash2,
  Ticket,
  Users,
  Copy,
  Check,
  Clock,
} from 'lucide-react'

export default function AdminPage() {
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const { t, language } = useI18n()

  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Invite code form state
  const [maxUses, setMaxUses] = useState(1)
  const [expiresDays, setExpiresDays] = useState<number | ''>('')
  const [creating, setCreating] = useState(false)

  // Copy indicator
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
      return
    }
    if (!authLoading && user && user.role !== 'admin') {
      navigate('/app')
      return
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      const [codesData, usersData] = await Promise.all([
        api.getInviteCodes(),
        api.getUsers(),
      ])
      setInviteCodes(codesData.invite_codes)
      setUsers(usersData.users)
    } catch (error) {
      console.error('Failed to load admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCode = async () => {
    setCreating(true)
    try {
      const days = typeof expiresDays === 'number' ? expiresDays : undefined
      const newCode = await api.createInviteCode(maxUses, days)
      setInviteCodes([newCode, ...inviteCodes])
      setMaxUses(1)
      setExpiresDays('')
    } catch (error) {
      console.error('Failed to create invite code:', error)
      alert(t('admin.invites.alerts.createFailed'))
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteCode = async (id: string) => {
    if (!confirm(t('admin.invites.confirmDelete'))) return
    try {
      await api.deleteInviteCode(id)
      setInviteCodes(inviteCodes.filter((c) => c.id !== id))
    } catch (error) {
      console.error('Failed to delete invite code:', error)
      alert(t('admin.invites.alerts.deleteFailed'))
    }
  }

  const handleDeleteUser = async (id: string) => {
    const targetUser = users.find((u) => u.id === id)
    if (!targetUser) return
    if (targetUser.id === user?.id) {
      alert(t('admin.users.cantDeleteSelf'))
      return
    }
    if (!confirm(t('admin.users.confirmDelete', { username: targetUser.username }))) return
    try {
      await api.deleteUser(id)
      setUsers(users.filter((u) => u.id !== id))
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert(t('admin.users.alerts.deleteFailed'))
    }
  }

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      console.error('Failed to copy invite code:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-paper dark:bg-darkPaper flex items-center justify-center">
        <div className="text-subInk dark:text-darkSubInk">{t('common.loading')}</div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

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
            <Shield className="w-5 h-5 text-accent dark:text-darkAccent" />
            <h1 className="text-lg font-serif text-ink dark:text-darkInk">{t('admin.title')}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Invite codes */}
        <section className="bg-white dark:bg-white/5 rounded-xl p-6 border border-muted/10 dark:border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <Ticket className="w-5 h-5 text-accent dark:text-darkAccent" />
            <h2 className="font-medium text-ink dark:text-darkInk">{t('admin.invites.title')}</h2>
          </div>

          {/* Create form */}
          <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-muted/10 dark:border-white/5">
            <div className="flex items-center gap-2">
              <label className="text-sm text-subInk dark:text-darkSubInk whitespace-nowrap">
                {t('admin.invites.fields.maxUses')}
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                className="w-20"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-subInk dark:text-darkSubInk whitespace-nowrap">
                {t('admin.invites.fields.expiresDays')}
              </label>
              <Input
                type="number"
                min={1}
                max={365}
                value={expiresDays}
                onChange={(e) => setExpiresDays(e.target.value ? parseInt(e.target.value) : '')}
                placeholder={t('admin.invites.fields.expiresPlaceholder')}
                className="w-24"
              />
            </div>
            <Button onClick={handleCreateCode} disabled={creating}>
              <Plus className="w-4 h-4 mr-1" />
              {creating ? t('admin.invites.buttons.creating') : t('admin.invites.buttons.create')}
            </Button>
          </div>

          {/* Invite code list */}
          {inviteCodes.length === 0 ? (
            <div className="text-center py-8 text-subInk dark:text-darkSubInk text-sm">
              {t('admin.invites.empty')}
            </div>
          ) : (
            <div className="space-y-3">
              {inviteCodes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-center justify-between py-3 px-4 bg-paperDark dark:bg-darkPaperLight rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <code className="font-mono text-sm text-ink dark:text-darkInk bg-white dark:bg-white/10 px-2 py-1 rounded">
                      {code.code}
                    </code>
                    <button
                      onClick={() => handleCopyCode(code.code)}
                      className="p-1.5 rounded hover:bg-muted/10 dark:hover:bg-white/5 text-subInk dark:text-darkSubInk"
                    >
                      {copiedCode === code.code ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <span className="text-xs text-muted dark:text-muted/60">
                      {t('admin.invites.usage', {
                        used: code.used_count,
                        max: code.max_uses,
                      })}
                    </span>
                    {code.expires_at && (
                      <span className="text-xs text-muted dark:text-muted/60 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(code.expires_at)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteCode(code.id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* User management */}
        <section className="bg-white dark:bg-white/5 rounded-xl p-6 border border-muted/10 dark:border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-accent dark:text-darkAccent" />
            <h2 className="font-medium text-ink dark:text-darkInk">
              {t('admin.users.titleWithCount', { count: users.length })}
            </h2>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-8 text-subInk dark:text-darkSubInk text-sm">
              {t('admin.users.empty')}
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between py-3 px-4 bg-paperDark dark:bg-darkPaperLight rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-accent/20 dark:bg-darkAccent/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-accent dark:text-darkAccent">
                        {u.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink dark:text-darkInk">
                          {u.username}
                        </span>
                        {u.role === 'admin' && (
                          <span className="px-1.5 py-0.5 text-xs bg-accent/10 dark:bg-darkAccent/20 text-accent dark:text-darkAccent rounded">
                            {t('sidebar.badges.admin')}
                          </span>
                        )}
                        {u.id === user.id && (
                          <span className="text-xs text-muted dark:text-muted/60">{t('sidebar.badges.me')}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted dark:text-muted/60">
                        {t('admin.users.registeredAt', { date: formatDate(u.created_at) })}
                      </span>
                    </div>
                  </div>
                  {u.id !== user.id && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
