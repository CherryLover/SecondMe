import { useState } from 'react'
import { api } from '@/services/api'
import type { Todo, TodoUpdate } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface TodoDetailPanelProps {
  todo: Todo
  onClose: () => void
  onUpdate: () => void
  onDelete: (todoId: string) => void
}

export function TodoDetailPanel({ todo, onClose, onUpdate, onDelete }: TodoDetailPanelProps) {
  const [title, setTitle] = useState(todo.title)
  const [description, setDescription] = useState(todo.description || '')
  const [status, setStatus] = useState(todo.status)
  const [priority, setPriority] = useState(todo.priority.toString())
  const [groupName, setGroupName] = useState(todo.group_name || '')
  const [deadline, setDeadline] = useState(todo.deadline ? todo.deadline.slice(0, 16) : '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)
      const updateData: TodoUpdate = {
        title,
        description: description || undefined,
        status,
        priority: parseInt(priority),
        group_name: groupName || undefined,
        deadline: deadline || undefined,
      }
      await api.updateTodo(todo.id, updateData)
      onUpdate()
    } catch (error) {
      console.error('更新任务失败:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('确定要删除这个任务吗？')) {
      await onDelete(todo.id)
      onClose()
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>编辑任务</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 标题 */}
          <div>
            <Label>标题</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* 描述 */}
          <div>
            <Label>描述</Label>
            <Textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={3}
              placeholder="添加任务描述..."
            />
          </div>

          {/* 状态 */}
          <div>
            <Label>状态</Label>
            <Select value={status} onValueChange={(val) => setStatus(val as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="in_progress">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 优先级 */}
          <div>
            <Label>优先级 (1-5)</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - 最低</SelectItem>
                <SelectItem value="2">2 - 低</SelectItem>
                <SelectItem value="3">3 - 中</SelectItem>
                <SelectItem value="4">4 - 高</SelectItem>
                <SelectItem value="5">5 - 最高</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 分组 */}
          <div>
            <Label>分组</Label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="如：工作、生活..."
            />
          </div>

          {/* 截止日期 */}
          <div>
            <Label>截止日期</Label>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="destructive" onClick={handleDelete}>
            删除
          </Button>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
