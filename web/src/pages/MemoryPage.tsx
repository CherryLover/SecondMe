import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import type { Memory } from '@/types'
import { MemoryList } from '@/components/memory/MemoryList'
import { MemoryModal } from '@/components/memory/MemoryModal'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, Brain, Trash2, Filter } from 'lucide-react'

type ModalMode = 'view' | 'edit' | 'add' | null

export default function MemoryPage() {
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'chat' | 'manual'>('all')

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (user) {
      loadMemories()
    }
  }, [user, page, filter])

  const loadMemories = async () => {
    setLoading(true)
    try {
      const source = filter === 'all' ? undefined : filter
      const data = await api.getMemories(page, 20, source)
      setMemories(data.memories)
      setTotal(data.total)
    } catch (error) {
      console.error('加载记忆失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleView = (memory: Memory) => {
    setSelectedMemory(memory)
    setModalMode('view')
  }

  const handleEdit = (memory: Memory) => {
    setSelectedMemory(memory)
    setModalMode('edit')
  }

  const handleAdd = () => {
    setSelectedMemory(null)
    setModalMode('add')
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMemory(id)
      setMemories(memories.filter((m) => m.id !== id))
      setTotal(total - 1)
    } catch (error) {
      console.error('删除记忆失败:', error)
      alert('删除失败')
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm('确定要删除所有记忆吗？此操作不可恢复！')) return
    try {
      const result = await api.deleteAllMemories()
      setMemories([])
      setTotal(0)
      alert(`已删除 ${result.deleted_count} 条记忆`)
    } catch (error) {
      console.error('删除所有记忆失败:', error)
      alert('删除失败')
    }
  }

  const handleSave = async (content: string) => {
    if (modalMode === 'add') {
      const newMemory = await api.createMemory(content)
      setMemories([newMemory, ...memories])
      setTotal(total + 1)
    } else if (modalMode === 'edit' && selectedMemory) {
      const updated = await api.updateMemory(selectedMemory.id, content)
      setMemories(memories.map((m) => (m.id === updated.id ? updated : m)))
    }
  }

  const handleCloseModal = () => {
    setModalMode(null)
    setSelectedMemory(null)
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
              <Brain className="w-5 h-5 text-accent dark:text-darkAccent" />
              <h1 className="text-lg font-serif text-ink dark:text-darkInk">记忆</h1>
              <span className="text-sm text-muted dark:text-muted/60">({total})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleDeleteAll} disabled={memories.length === 0}>
              <Trash2 className="w-4 h-4 mr-1" />
              清空
            </Button>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" />
              添加
            </Button>
          </div>
        </div>
      </header>

      {/* Filter */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted dark:text-muted/60" />
          <div className="flex gap-1">
            {(['all', 'chat', 'manual'] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f)
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  filter === f
                    ? 'bg-accent dark:bg-darkAccent text-white'
                    : 'bg-muted/10 dark:bg-white/5 text-subInk dark:text-darkSubInk hover:bg-muted/20 dark:hover:bg-white/10'
                }`}
              >
                {f === 'all' ? '全部' : f === 'chat' ? '对话提取' : '手动添加'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-subInk dark:text-darkSubInk">加载中...</div>
          </div>
        ) : (
          <>
            <MemoryList
              memories={memories}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />

            {/* Pagination */}
            {total > 20 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <span className="text-sm text-muted dark:text-muted/60">
                  第 {page} 页 / 共 {Math.ceil(total / 20)} 页
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(total / 20)}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal */}
      {modalMode && (
        <MemoryModal
          memory={selectedMemory}
          mode={modalMode}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
