import { useEffect, useRef } from 'react'
import type { Message } from '@/types'
import { User, Bot } from 'lucide-react'

interface ChatMessagesProps {
  messages: Message[]
  streamingContent: string
  isStreaming: boolean
}

export function ChatMessages({
  messages,
  streamingContent,
  isStreaming,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const formatContent = (content: string) => {
    // 简单的 markdown 处理：代码块、加粗、斜体
    let html = content
      // 代码块
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      // 行内代码
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // 加粗
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // 斜体
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-accent dark:text-darkAccent hover:underline">$1</a>')
      // 换行
      .replace(/\n/g, '<br />')

    return html
  }

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 dark:bg-darkAccent/10 flex items-center justify-center">
            <Bot className="w-8 h-8 text-accent dark:text-darkAccent" />
          </div>
          <h2 className="text-xl font-serif text-ink dark:text-darkInk mb-3">
            开始新对话
          </h2>
          <p className="text-subInk dark:text-darkSubInk text-sm leading-relaxed">
            写下你想说的话，我会记住我们之间的每一次对话。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-accent/10 dark:bg-darkAccent/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-accent dark:text-darkAccent" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-accent dark:bg-darkAccent text-white'
                  : 'bg-white dark:bg-white/5 text-ink dark:text-darkInk'
              }`}
            >
              <div
                className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: formatContent(message.content),
                }}
              />
              <div
                className={`text-xs mt-2 ${
                  message.role === 'user'
                    ? 'text-white/60'
                    : 'text-muted dark:text-muted/60'
                }`}
              >
                {new Date(message.created_at).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-ink/10 dark:bg-white/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-ink dark:text-darkInk" />
              </div>
            )}
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-accent/10 dark:bg-darkAccent/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-accent dark:text-darkAccent" />
            </div>
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white dark:bg-white/5 text-ink dark:text-darkInk">
              <div
                className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: formatContent(streamingContent),
                }}
              />
              <div className="flex gap-1 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent dark:bg-darkAccent typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent dark:bg-darkAccent typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent dark:bg-darkAccent typing-dot" />
              </div>
            </div>
          </div>
        )}

        {/* Typing indicator when streaming starts but no content yet */}
        {isStreaming && !streamingContent && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-accent/10 dark:bg-darkAccent/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-accent dark:text-darkAccent" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-white dark:bg-white/5">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-accent dark:bg-darkAccent typing-dot" />
                <span className="w-2 h-2 rounded-full bg-accent dark:bg-darkAccent typing-dot" />
                <span className="w-2 h-2 rounded-full bg-accent dark:bg-darkAccent typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
