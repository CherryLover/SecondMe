import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import type { ApiToken } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Copy, Trash2, Plus, Check } from 'lucide-react'

export function TokenManagement() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTokenName, setNewTokenName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdToken, setCreatedToken] = useState<ApiToken | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadTokens()
  }, [])

  const loadTokens = async () => {
    try {
      setLoading(true)
      const data = await api.getApiTokens()
      setTokens(data)
    } catch (error) {
      console.error('加载 API Token 失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      alert('请输入 Token 名称')
      return
    }

    try {
      setCreating(true)
      const token = await api.createApiToken(newTokenName.trim())
      setCreatedToken(token)
      setNewTokenName('')
      await loadTokens()
    } catch (error) {
      console.error('创建 Token 失败:', error)
      alert('创建 Token 失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteToken = async (id: string, name: string) => {
    if (!confirm(`确定要删除 Token "${name}" 吗？删除后将无法恢复。`)) {
      return
    }

    try {
      await api.deleteApiToken(id)
      await loadTokens()
    } catch (error) {
      console.error('删除 Token 失败:', error)
      alert('删除 Token 失败')
    }
  }

  const handleCopyToken = async () => {
    if (createdToken?.token) {
      await navigator.clipboard.writeText(createdToken.token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCloseCreateDialog = () => {
    setShowCreateDialog(false)
    setCreatedToken(null)
    setCopied(false)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '从未使用'
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-subInk dark:text-darkSubInk">
          API Token 用于外部程序访问您的 TODO 数据，请妥善保管
        </p>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-1" />
          新建 Token
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-subInk dark:text-darkSubInk py-8">加载中...</div>
      ) : tokens.length === 0 ? (
        <div className="text-center text-subInk dark:text-darkSubInk py-8">
          暂无 API Token，点击上方按钮创建
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-muted/10 dark:border-white/5">
                <th className="text-left py-2 px-3 font-medium text-ink dark:text-darkInk">名称</th>
                <th className="text-left py-2 px-3 font-medium text-ink dark:text-darkInk">Token</th>
                <th className="text-left py-2 px-3 font-medium text-ink dark:text-darkInk">创建时间</th>
                <th className="text-left py-2 px-3 font-medium text-ink dark:text-darkInk">最后使用</th>
                <th className="text-right py-2 px-3 font-medium text-ink dark:text-darkInk">操作</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr key={token.id} className="border-b border-muted/5 dark:border-white/5">
                  <td className="py-3 px-3 text-ink dark:text-darkInk">{token.name}</td>
                  <td className="py-3 px-3 font-mono text-xs text-subInk dark:text-darkSubInk">
                    {token.token_preview}
                  </td>
                  <td className="py-3 px-3 text-subInk dark:text-darkSubInk">
                    {formatDate(token.created_at)}
                  </td>
                  <td className="py-3 px-3 text-subInk dark:text-darkSubInk">
                    {formatDate(token.last_used_at)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteToken(token.id, token.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Token Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={handleCloseCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{createdToken ? 'Token 创建成功' : '创建 API Token'}</DialogTitle>
          </DialogHeader>

          {createdToken ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                  ⚠️ 重要提示
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  请立即复制并妥善保管此 Token，关闭后将无法再次查看完整内容！
                </p>
              </div>

              <div>
                <Label>Token 名称</Label>
                <div className="text-sm text-ink dark:text-darkInk mt-1">{createdToken.name}</div>
              </div>

              <div>
                <Label>Token 值</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={createdToken.token || ''}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={handleCopyToken}
                    className={copied ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        复制
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 dark:bg-white/5 rounded-lg p-3 text-xs text-subInk dark:text-darkSubInk">
                <p className="font-medium mb-1">使用方法：</p>
                <p>在 HTTP 请求头中添加：</p>
                <code className="block mt-1 bg-white dark:bg-black/20 px-2 py-1 rounded">
                  Authorization: Bearer {createdToken.token}
                </code>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Token 名称</Label>
                <Input
                  placeholder="如：移动端应用、定时任务脚本等"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateToken()
                    }
                  }}
                />
              </div>

              <div className="bg-muted/50 dark:bg-white/5 rounded-lg p-3 text-xs text-subInk dark:text-darkSubInk">
                <p>• API Token 具有永久有效性，不会过期</p>
                <p>• Token 仅在创建时显示一次，请妥善保管</p>
                <p>• 可随时删除不再使用的 Token</p>
              </div>
            </div>
          )}

          <DialogFooter>
            {createdToken ? (
              <Button onClick={handleCloseCreateDialog}>关闭</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateToken} disabled={creating}>
                  {creating ? '创建中...' : '创建'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
