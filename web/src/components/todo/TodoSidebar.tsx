import { useState, useEffect } from 'react'
import { Plus, X, Filter } from 'lucide-react'
import { api } from '@/services/api'
import type { Todo, TodoCreate } from '@/types'
import { TodoItem } from './TodoItem'
import { TodoDetailPanel } from './TodoDetailPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TodoSidebarProps {
  onClose?: () => void
}

export function TodoSidebar({ onClose }: TodoSidebarProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadTodos()
  }, [statusFilter])

  const loadTodos = async () => {
    try {
      setLoading(true)
      const params: any = { parent_id: null, include_children: true }
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      const data = await api.getTodos(params)
      setTodos(data)
    } catch (error) {
      console.error('加载任务失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodoTitle.trim()) return

    try {
      const todoData: TodoCreate = {
        title: newTodoTitle.trim(),
        priority: 3,
      }
      await api.createTodo(todoData)
      setNewTodoTitle('')
      await loadTodos()
    } catch (error) {
      console.error('创建任务失败:', error)
    }
  }

  const handleToggleStatus = async (todo: Todo) => {
    try {
      const newStatus = todo.status === 'completed' ? 'pending' : 'completed'
      await api.updateTodo(todo.id, { status: newStatus })
      await loadTodos()
    } catch (error) {
      console.error('更新任务状态失败:', error)
    }
  }

  const handleDeleteTodo = async (todoId: string) => {
    try {
      await api.deleteTodo(todoId)
      await loadTodos()
      if (selectedTodo?.id === todoId) {
        setSelectedTodo(null)
      }
    } catch (error) {
      console.error('删除任务失败:', error)
    }
  }

  const handleUpdateTodo = async () => {
    await loadTodos()
    setSelectedTodo(null)
  }

  return (
    <div className="flex flex-col h-full w-80 border-l bg-background">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">任务列表</h2>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 筛选器 */}
      <div className="p-4 border-b">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="pending">待处理</SelectItem>
            <SelectItem value="in_progress">进行中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 快速添加 */}
      <form onSubmit={handleCreateTodo} className="p-4 border-b">
        <div className="flex gap-2">
          <Input
            placeholder="快速添加任务..."
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
          />
          <Button type="submit" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && <div className="text-center text-muted-foreground">加载中...</div>}
        {!loading && todos.length === 0 && (
          <div className="text-center text-muted-foreground">暂无任务</div>
        )}
        {!loading &&
          todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggleStatus}
              onClick={() => setSelectedTodo(todo)}
              onDelete={handleDeleteTodo}
            />
          ))}
      </div>

      {/* 详情面板 */}
      {selectedTodo && (
        <TodoDetailPanel
          todo={selectedTodo}
          onClose={() => setSelectedTodo(null)}
          onUpdate={handleUpdateTodo}
          onDelete={handleDeleteTodo}
        />
      )}
    </div>
  )
}
