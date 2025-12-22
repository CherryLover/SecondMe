import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import type { Flowmo } from '@/types'
import { FlowmoList } from '@/components/flowmo/FlowmoList'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, Sparkles, Trash2, MessageCircle } from 'lucide-react'

export default function FlowmoPage() {
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const [flowmos, setFlowmos] = useState<Flowmo[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (user) {
      loadFlowmos()
    }
  }, [user])

  const loadFlowmos = async () => {
    setLoading(true)
    try {
      const data = await api.getFlowmos(1, 100)
      setFlowmos(data.flowmos)
    } catch (error) {
      console.error('加载 Flowmo 失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteFlowmo(id)
      setFlowmos(flowmos.filter((f) => f.id !== id))
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败')
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm('确定要删除所有随想吗？此操作不可恢复！')) return
    try {
      const result = await api.deleteAllFlowmos()
      setFlowmos([])
      alert(`已删除 ${result.deleted_count} 条随想`)
    } catch (error) {
      console.error('删除所有 Flowmo 失败:', error)
      alert('删除失败')
    }
  }

  const handleAdd = async () => {
    if (!newContent.trim()) return
    setAdding(true)
    try {
      const newFlowmo = await api.createFlowmo(newContent.trim())
      setFlowmos([newFlowmo, ...flowmos])
      setNewContent('')
      setShowAddForm(false)
    } catch (error) {
      console.error('添加失败:', error)
      alert('添加失败')
    } finally {
      setAdding(false)
    }
  }

  const handleGoToFlowmoChat = async () => {
    try {
      const topic = await api.getFlowmoTopic()
      navigate(`/app?topic=${topic.id}`)
    } catch (error) {
      console.error('获取 Flowmo 话题失败:', error)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-paper dark:bg-darkPaper flex items-center justify-center">
        <div className="text-subInk dark:text-darkSubInk">加载中...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-darkPaper">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-paper/80 dark:bg-darkPaper/80 backdrop-blur-sm border-b border-muted/10 dark:border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/app')}
              className="p-2 rounded-lg hover:bg-muted/10 dark:hover:bg-white/5 text-subInk dark:text-darkSubInk"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent dark:text-darkAccent" />
              <h1 className="text-lg font-serif text-ink dark:text-darkInk">Flowmo</h1>
              <span className="text-sm text-muted dark:text-muted/60">({flowmos.length})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleGoToFlowmoChat}>
              <MessageCircle className="w-4 h-4 mr-1" />
              对话
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDeleteAll} disabled={flowmos.length === 0}>
              <Trash2 className="w-4 h-4 mr-1" />
              清空
            </Button>
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 mr-1" />
              添加
            </Button>
          </div>
        </div>
      </header>

      {/* Add Form */}
      {showAddForm && (
        <div className="max-w-4xl mx-auto px-4 py-4 border-b border-muted/10 dark:border-white/5">
          <div className="bg-white dark:bg-white/5 rounded-lg p-4 border border-muted/10 dark:border-white/10">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="写下你的想法..."
              rows={3}
              className="w-full bg-transparent text-ink dark:text-darkInk placeholder:text-muted dark:placeholder:text-muted/60 outline-none resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                取消
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={!newContent.trim() || adding}>
                {adding ? '添加中...' : '添加'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <p className="text-sm text-subInk dark:text-darkSubInk">
          Flowmo 是你的随想记录空间。在 Flowmo 对话中，你的每条消息都会被自动保存为随想。
        </p>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-subInk dark:text-darkSubInk">加载中...</div>
          </div>
        ) : (
          <FlowmoList flowmos={flowmos} onDelete={handleDelete} />
        )}
      </main>
    </div>
  )
}
