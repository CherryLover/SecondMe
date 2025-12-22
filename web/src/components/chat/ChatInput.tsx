import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'

interface ChatInputProps {
  onSend: (content: string) => void
  disabled: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  disabled,
  placeholder,
}: ChatInputProps) {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { t } = useI18n()
  const effectivePlaceholder = placeholder ?? t('chat.placeholders.composer')

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [content])

  const handleSubmit = () => {
    if (!content.trim() || disabled) return
    onSend(content.trim())
    setContent('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-muted/10 dark:border-white/5 bg-paper dark:bg-darkPaper px-4 py-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-3 bg-white dark:bg-white/5 rounded-2xl px-4 py-3 border border-muted/10 dark:border-white/10 focus-within:border-accent/30 dark:focus-within:border-darkAccent/30 transition-colors">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={effectivePlaceholder}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-ink dark:text-darkInk placeholder:text-muted dark:placeholder:text-muted/60 text-sm leading-relaxed max-h-[200px]"
          />
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || disabled}
            className={`p-2 rounded-full transition-all ${
              content.trim() && !disabled
                ? 'bg-accent dark:bg-darkAccent text-white hover:opacity-90'
                : 'bg-muted/10 dark:bg-white/5 text-muted dark:text-muted/60 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-xs text-muted dark:text-muted/60 mt-2">
          {t('chat.helper')}
        </p>
      </div>
    </div>
  )
}
