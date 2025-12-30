import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { api } from '@/services/api'
import type { Topic } from '@/types'
import { Logo } from '@/components/common/Logo'
import { useI18n } from '@/contexts/I18nContext'
import {
  Plus,
  MessageSquare,
  Settings,
  LogOut,
  Sun,
  Moon,
  // Brain,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit3,
  Check,
  X,
  Shield,
} from 'lucide-react'

interface SidebarProps {
  currentTopicId: string | null
  onSelectTopic: (topic: Topic) => void
  onNewTopic: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({
  currentTopicId,
  onSelectTopic,
  onNewTopic,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t, language } = useI18n()
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    loadTopics()
  }, [])

  const loadTopics = async () => {
    try {
      const data = await api.getTopics()
      // Filter out Flowmo-specific topics
      const normalTopics = data.topics.filter((t) => !t.is_flowmo)
      setTopics(normalTopics)
    } catch (error) {
      console.error('Failed to load topics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation()
    if (!confirm(t('sidebar.confirmations.deleteTopic'))) return
    try {
      await api.deleteTopic(topicId)
      setTopics(topics.filter((t) => t.id !== topicId))
      if (currentTopicId === topicId) {
        onNewTopic()
      }
    } catch (error) {
      console.error('Failed to delete topic:', error)
    }
  }

  const handleStartEdit = (e: React.MouseEvent, topic: Topic) => {
    e.stopPropagation()
    setEditingId(topic.id)
    setEditTitle(topic.title || '')
  }

  const handleSaveEdit = async (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation()
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }
    try {
      await api.updateTopic(topicId, editTitle)
      setTopics(
        topics.map((t) => (t.id === topicId ? { ...t, title: editTitle } : t))
      )
    } catch (error) {
      console.error('Failed to update topic:', error)
    } finally {
      setEditingId(null)
    }
  }

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(null)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 0) return t('common.time.today')
    if (diffDays === 1) return t('common.time.yesterday')
    if (diffDays < 7) return t('common.time.daysAgo', { count: diffDays })
    return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (collapsed) {
    return (
      <div className="w-16 h-full bg-paperDark dark:bg-darkPaperLight flex flex-col items-center py-4 border-r border-muted/10 dark:border-white/5">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors mb-4"
        >
          <ChevronRight className="w-5 h-5 text-subInk dark:text-darkSubInk" />
        </button>

        <button
          onClick={onNewTopic}
          className="p-3 rounded-lg bg-accent/10 dark:bg-darkAccent/10 hover:bg-accent/20 dark:hover:bg-darkAccent/20 transition-colors mb-4"
          title={t('sidebar.actions.newChat')}
        >
          <Plus className="w-5 h-5 text-accent dark:text-darkAccent" />
        </button>

        <div className="flex-1" />

        <div className="flex flex-col gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
            title={theme === 'dark' ? t('sidebar.actions.themeLight') : t('sidebar.actions.themeDark')}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-darkSubInk" />
            ) : (
              <Moon className="w-5 h-5 text-subInk" />
            )}
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
            title={t('sidebar.actions.logout')}
          >
            <LogOut className="w-5 h-5 text-subInk dark:text-darkSubInk" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 h-full bg-paperDark dark:bg-darkPaperLight flex flex-col border-r border-muted/10 dark:border-white/5">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-muted/10 dark:border-white/5">
        <Logo size="sm" />
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-subInk dark:text-darkSubInk" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="p-3 flex gap-2">
        <button
          onClick={onNewTopic}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-accent/10 dark:bg-darkAccent/10 hover:bg-accent/20 dark:hover:bg-darkAccent/20 text-accent dark:text-darkAccent transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">{t('sidebar.actions.newChat')}</span>
        </button>
        <button
          onClick={() => navigate('/app/flowmo')}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-accent/10 dark:bg-darkAccent/10 hover:bg-accent/20 dark:hover:bg-darkAccent/20 text-accent dark:text-darkAccent transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">{t('sidebar.quickLinks.flowmo')}</span>
        </button>
      </div>

      {/* Topics List */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-subInk dark:text-darkSubInk">
              {t('sidebar.list.loading')}
            </span>
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-8 text-subInk dark:text-darkSubInk text-sm">
            {t('sidebar.list.empty')}
          </div>
        ) : (
          <div className="space-y-1">
            {topics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => onSelectTopic(topic)}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${currentTopicId === topic.id
                  ? 'bg-white dark:bg-white/10'
                  : 'hover:bg-white/50 dark:hover:bg-white/5'
                  }`}
              >
                <MessageSquare className="w-4 h-4 text-subInk dark:text-darkSubInk shrink-0" />
                <div className="flex-1 min-w-0">
                  {editingId === topic.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent border-b border-accent dark:border-darkAccent text-sm text-ink dark:text-darkInk outline-none"
                        autoFocus
                      />
                      <button
                        onClick={(e) => handleSaveEdit(e, topic.id)}
                        className="p-1 hover:bg-accent/20 dark:hover:bg-darkAccent/20 rounded"
                      >
                        <Check className="w-3 h-3 text-accent dark:text-darkAccent" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 hover:bg-muted/20 rounded"
                      >
                        <X className="w-3 h-3 text-muted" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-ink dark:text-darkInk truncate">
                        {topic.title || t('sidebar.list.defaultTitle')}
                      </div>
                      <div className="text-xs text-muted dark:text-muted/60">
                        {formatDate(topic.updated_at)}
                      </div>
                    </>
                  )}
                </div>
                {editingId !== topic.id && (
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={(e) => handleStartEdit(e, topic)}
                      className="p-1 hover:bg-muted/20 rounded"
                    >
                      <Edit3 className="w-3 h-3 text-muted" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, topic.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-3 h-3 text-red-500 dark:text-red-400" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links - Removed as Flowmo is now at top */}
      {/* <div className="px-2 py-2 border-t border-muted/10 dark:border-white/5">
        <button
          onClick={() => navigate('/app/memories')}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 text-subInk dark:text-darkSubInk transition-colors"
        >
          <Brain className="w-4 h-4" />
          <span className="text-sm">{t('sidebar.quickLinks.memories')}</span>
        </button>
      </div> */}

      {/* Footer */}
      <div className="p-3 border-t border-muted/10 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent/20 dark:bg-darkAccent/20 flex items-center justify-center">
              <span className="text-sm font-medium text-accent dark:text-darkAccent">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-ink dark:text-darkInk truncate max-w-[100px]">
              {user?.username}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-darkSubInk" />
              ) : (
                <Moon className="w-4 h-4 text-subInk" />
              )}
            </button>
            <button
              onClick={() => navigate('/app/settings')}
              className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
              title={t('sidebar.actions.settings')}
            >
              <Settings className="w-4 h-4 text-subInk dark:text-darkSubInk" />
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/app/admin')}
                className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
                title={t('sidebar.actions.admin')}
              >
                <Shield className="w-4 h-4 text-subInk dark:text-darkSubInk" />
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
              title={t('sidebar.actions.logout')}
            >
              <LogOut className="w-4 h-4 text-subInk dark:text-darkSubInk" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
