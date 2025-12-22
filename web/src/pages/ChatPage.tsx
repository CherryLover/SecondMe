import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import type { Topic, Message } from '@/types'
import { Sidebar } from '@/components/chat/Sidebar'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { ChatInput } from '@/components/chat/ChatInput'
import { Menu } from 'lucide-react'

export default function ChatPage() {
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login')
    }
  }, [user, isLoading, navigate])

  useEffect(() => {
    if (currentTopic) {
      loadMessages(currentTopic.id)
    } else {
      setMessages([])
    }
  }, [currentTopic])

  const loadMessages = async (topicId: string) => {
    setLoadingMessages(true)
    try {
      const data = await api.getMessages(topicId)
      setMessages(data.messages)
    } catch (error) {
      console.error('加载消息失败:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSelectTopic = (topic: Topic) => {
    setCurrentTopic(topic)
    setShowMobileSidebar(false)
  }

  const handleNewTopic = () => {
    setCurrentTopic(null)
    setMessages([])
    setShowMobileSidebar(false)
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    // 如果没有当前话题，先创建一个
    let topicId = currentTopic?.id
    if (!topicId) {
      try {
        const newTopic = await api.createTopic()
        setCurrentTopic(newTopic)
        topicId = newTopic.id
      } catch (error) {
        console.error('创建话题失败:', error)
        return
      }
    }

    // 添加用户消息到列表（临时 ID）
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      topic_id: topicId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])

    // 开始流式响应
    setIsStreaming(true)
    setStreamingContent('')

    try {
      await api.sendMessageStream(
        topicId,
        content,
        // onChunk
        (chunk) => {
          setStreamingContent((prev) => prev + chunk)
        },
        // onDone
        (data) => {
          setIsStreaming(false)
          setStreamingContent('')
          // 添加完整的 AI 消息
          const aiMessage: Message = {
            id: data.message_id,
            topic_id: topicId!,
            role: 'assistant',
            content: data.full_content,
            created_at: new Date().toISOString(),
          }
          // 更新用户消息 ID
          setMessages((prev) => {
            const updated = prev.map((m) =>
              m.id === userMessage.id ? { ...m, id: data.user_message_id } : m
            )
            return [...updated, aiMessage]
          })
          // 如果话题标题更新了
          if (data.topic_title && currentTopic) {
            setCurrentTopic({ ...currentTopic, title: data.topic_title })
          }
        },
        // onError
        (error) => {
          setIsStreaming(false)
          setStreamingContent('')
          console.error('消息发送失败:', error)
          // 移除临时用户消息
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
          alert(error)
        }
      )
    } catch (error) {
      setIsStreaming(false)
      setStreamingContent('')
      console.error('发送消息失败:', error)
    }
  }

  if (isLoading) {
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
    <div className="h-screen bg-paper dark:bg-darkPaper flex overflow-hidden">
      {/* Mobile sidebar overlay */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative z-50 h-full transition-transform duration-300 ${
          showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar
          currentTopicId={currentTopic?.id ?? null}
          onSelectTopic={handleSelectTopic}
          onNewTopic={handleNewTopic}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-muted/10 dark:border-white/5">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="p-2 rounded-lg hover:bg-muted/10 dark:hover:bg-white/5"
          >
            <Menu className="w-5 h-5 text-ink dark:text-darkInk" />
          </button>
          <span className="text-sm font-medium text-ink dark:text-darkInk truncate">
            {currentTopic?.title || '新对话'}
          </span>
        </div>

        {/* Chat area */}
        {loadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-subInk dark:text-darkSubInk">加载消息...</div>
          </div>
        ) : (
          <ChatMessages
            messages={messages}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
          />
        )}

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={isStreaming}
          placeholder={
            currentTopic
              ? '继续对话...'
              : '写下你想说的话，开始新对话...'
          }
        />
      </div>
    </div>
  )
}
