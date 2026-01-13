import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { X, RefreshCw } from 'lucide-react'

export function PWAUpdatePrompt() {
  const [show, setShow] = useState(false)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl: string, r: ServiceWorkerRegistration | undefined) {
      console.log('Service Worker 已注册:', swUrl)
      // 每隔 10 秒检查一次更新
      if (r) {
        setInterval(() => {
          r.update()
        }, 10000)
      }
    },
    onRegisterError(error: any) {
      console.error('Service Worker 注册失败:', error)
    },
  })

  useEffect(() => {
    if (needRefresh) {
      // 显示提示 2 秒后自动刷新
      setShow(true)
      setTimeout(() => {
        updateServiceWorker(true)
      }, 2000)
    }
  }, [needRefresh, updateServiceWorker])

  const handleUpdate = () => {
    setShow(false)
    updateServiceWorker(true)
  }

  const handleClose = () => {
    setShow(false)
    setNeedRefresh(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom duration-300">
      <div className="bg-white dark:bg-darkPaper shadow-lg rounded-lg border border-muted/20 dark:border-white/10 p-4 flex items-center gap-4 min-w-[320px] max-w-md mx-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-ink dark:text-darkInk mb-1">
            发现新版本
          </p>
          <p className="text-xs text-subInk dark:text-darkSubInk">
            2秒后自动刷新...
          </p>
        </div>

        <button
          onClick={handleUpdate}
          className="flex items-center gap-2 px-4 py-2 bg-accent dark:bg-darkAccent text-white rounded-md hover:opacity-90 transition-opacity text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>

        <button
          onClick={handleClose}
          className="p-1 text-muted dark:text-muted/60 hover:text-ink dark:hover:text-darkInk transition-colors"
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
