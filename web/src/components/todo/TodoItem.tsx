import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Todo } from '@/types'
import { useState } from 'react'

interface TodoItemProps {
  todo: Todo
  onToggle: (todo: Todo) => void
  onClick: () => void
  onDelete: (todoId: string) => void
  depth?: number
}

export function TodoItem({ todo, onToggle, onClick, onDelete, depth = 0 }: TodoItemProps) {
  const [expanded, setExpanded] = useState(true)

  const getPriorityColor = (priority: number) => {
    if (priority >= 5) return 'destructive'
    if (priority >= 4) return 'default'
    return 'secondary'
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待处理'
      case 'in_progress':
        return '进行中'
      case 'completed':
        return '已完成'
      case 'cancelled':
        return '已取消'
      default:
        return status
    }
  }

  const hasChildren = todo.children && todo.children.length > 0

  return (
    <div className={`${depth > 0 ? 'ml-4 border-l-2 border-muted pl-2' : ''}`}>
      <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 group">
        {/* 展开/收起按钮 */}
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          </Button>
        )}

        {/* 复选框 */}
        <Checkbox
          checked={todo.status === 'completed'}
          onCheckedChange={(e) => {
            e.stopPropagation()
            onToggle(todo)
          }}
          className="mt-0.5"
        />

        {/* 任务内容 */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm ${
                todo.status === 'completed' ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {todo.title}
            </span>
            {todo.priority && todo.priority > 3 && (
              <Badge variant={getPriorityColor(todo.priority)} className="text-xs px-1 py-0">
                P{todo.priority}
              </Badge>
            )}
          </div>
          {todo.deadline && (
            <div className="text-xs text-muted-foreground mt-1">
              截止：{new Date(todo.deadline).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* 删除按钮 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(todo.id)
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* 子任务 */}
      {hasChildren && expanded && (
        <div className="mt-1">
          {todo.children.map((child) => (
            <TodoItem
              key={child.id}
              todo={child}
              onToggle={onToggle}
              onClick={onClick}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
