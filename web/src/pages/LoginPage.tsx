import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/common/Logo'

type FormMode = 'login' | 'register'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, register, user } = useAuth()
  const [mode, setMode] = useState<FormMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 如果已登录，跳转到 /app
  if (user) {
    navigate('/app')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致')
        return
      }
      if (password.length < 6) {
        setError('密码长度至少 6 位')
        return
      }
    }

    setIsLoading(true)

    try {
      if (mode === 'login') {
        await login(username, password)
      } else {
        await register(username, password, inviteCode)
      }
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-darkPaper flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-white/5 rounded-sm border border-ink/10 dark:border-white/10 p-8 md:p-12 shadow-sm">
          {/* Logo */}
          <div className="text-center mb-2">
            <Logo className="text-3xl" />
          </div>
          <p className="text-center text-subInk dark:text-darkSubInk text-sm mb-8">
            AI 对话助手
          </p>

          {/* Title */}
          <h2 className="text-center text-xl font-serif font-semibold text-ink dark:text-darkInk mb-6">
            {mode === 'login' ? '欢迎回来' : '创建账号'}
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink dark:text-darkInk">
                用户名
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink dark:text-darkInk">
                密码
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
              />
            </div>

            {mode === 'register' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink dark:text-darkInk">
                    确认密码
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink dark:text-darkInk">
                    邀请码
                  </label>
                  <Input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="请输入邀请码"
                    required
                  />
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-sm border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={isLoading}
            >
              {isLoading
                ? (mode === 'login' ? '登录中...' : '注册中...')
                : (mode === 'login' ? '登录' : '注册')
              }
            </Button>
          </form>

          {/* Toggle */}
          <p className="text-center text-sm text-subInk dark:text-darkSubInk mt-6">
            {mode === 'login' ? '还没有账号？' : '已有账号？'}
            <button
              onClick={toggleMode}
              className="text-accent dark:text-darkAccent font-medium hover:underline ml-1"
            >
              {mode === 'login' ? '立即注册' : '立即登录'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
