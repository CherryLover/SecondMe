import { useState, useEffect, useRef } from 'react'
import { api } from '@/services/api'
import type { Provider } from '@/types'
import { ChevronDown, Search, Check, Loader2 } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'

interface ModelSelectorProps {
  providers: Provider[]
  selectedProviderId: string | null
  selectedModel: string | null
  onSelect: (providerId: string, model: string) => void
  mode: 'chat' | 'embedding'
}

// 嵌入模型关键词
const EMBEDDING_KEYWORDS = ['embed', 'embedding', 'bge', 'e5', 'text-']

// 判断是否为嵌入模型
function isEmbeddingModel(modelId: string): boolean {
  const lower = modelId.toLowerCase()
  return EMBEDDING_KEYWORDS.some(keyword => lower.includes(keyword))
}

export function ModelSelector({
  providers: _providers,
  selectedProviderId,
  selectedModel,
  onSelect,
  mode,
}: ModelSelectorProps) {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingProviderId, setLoadingProviderId] = useState<string | null>(null)
  const [modelsMap, setModelsMap] = useState<Record<string, string[]>>({})
  const [customModel, setCustomModel] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  /* State for confirmation modal */
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingModel, setPendingModel] = useState<string | null>(null)

  // 获取显示的模型列表
  const getFilteredModels = (providerId: string): string[] => {
    const models = modelsMap[providerId] || []
    const filtered = models.filter(model => {
      // 根据模式过滤模型
      if (mode === 'embedding') {
        return isEmbeddingModel(model)
      } else {
        // 对话模式，排除嵌入模型
        return !isEmbeddingModel(model)
      }
    })
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return filtered.filter(m => m.toLowerCase().includes(query))
    }
    return filtered
  }

  // 获取当前服务商的可用模型
  const availableModels = selectedProviderId
    ? getFilteredModels(selectedProviderId)
    : []

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 当选中的服务商改变时，加载模型列表
  useEffect(() => {
    if (!selectedProviderId) return

    // 如果已经加载过，跳过
    if (modelsMap[selectedProviderId]) return

    const loadModels = async () => {
      setLoadingProviderId(selectedProviderId)
      try {
        const response = await api.getProviderModels(selectedProviderId)
        setModelsMap(prev => ({
          ...prev,
          [selectedProviderId]: response.models.map(m => m.id),
        }))
      } catch (error) {
        console.error('Failed to load models:', error)
        // 失败时设置为空数组，避免重复请求
        setModelsMap(prev => ({
          ...prev,
          [selectedProviderId]: [],
        }))
      } finally {
        setLoadingProviderId(null)
      }
    }

    loadModels()
  }, [selectedProviderId])

  const handleConfirm = () => {
    if (selectedProviderId && pendingModel) {
      onSelect(selectedProviderId, pendingModel)
    }
    setShowConfirmModal(false)
    setPendingModel(null)
    setSearchQuery('')
  }

  const handleModelSelect = (e: React.MouseEvent, model: string) => {
    e.stopPropagation()
    if (!selectedProviderId) return

    // 向量模型切换时需要确认
    if (mode === 'embedding' && selectedModel && selectedModel !== model) {
      setPendingModel(model)
      setIsOpen(false)
      setShowConfirmModal(true)
      return
    }

    onSelect(selectedProviderId, model)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleUseCustomModel = () => {
    if (!customModel.trim() || !selectedProviderId) return

    const newModel = customModel.trim()

    // 向量模型切换时需要确认
    if (mode === 'embedding' && selectedModel && selectedModel !== newModel) {
      setPendingModel(newModel)
      setIsOpen(false)
      setCustomModel('')
      setShowConfirmModal(true)
      return
    }

    onSelect(selectedProviderId, newModel)
    setIsOpen(false)
    setCustomModel('')
  }

  // 获取显示文本
  const getDisplayText = () => {
    if (!selectedProviderId) {
      return mode === 'chat'
        ? t('settings.modelConfig.selectChatProvider')
        : t('settings.modelConfig.selectEmbeddingProvider')
    }
    if (!selectedModel) {
      return mode === 'chat'
        ? t('settings.modelConfig.selectChatModel')
        : t('settings.modelConfig.selectEmbeddingModel')
    }
    return selectedModel
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      {/* 选择按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-left bg-white dark:bg-white/5 border border-muted/20 dark:border-white/10 rounded-lg hover:border-accent/30 dark:hover:border-darkAccent/30 transition-colors"
        disabled={!selectedProviderId}
      >
        <span className="text-sm text-ink dark:text-darkInk truncate">
          {selectedModel || getDisplayText()}
        </span>
        <ChevronDown className={`w-4 h-4 text-subInk dark:text-darkSubInk transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉面板 */}
      {isOpen && selectedProviderId && (
        <div className="absolute z-50 mt-1 min-w-[500px] bg-white dark:bg-white/5 border border-muted/20 dark:border-white/10 rounded-lg shadow-lg overflow-hidden">
          {/* 搜索框 */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-muted/10 dark:border-white/5">
            <Search className="w-4 h-4 text-subInk dark:text-darkSubInk flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('settings.modelConfig.searchPlaceholder')}
              className="flex-1 bg-transparent text-sm text-ink dark:text-darkInk placeholder:text-subInk dark:placeholder:text-darkSubInk outline-none"
            />
          </div>

          {/* 模型列表 */}
          <div className="max-h-60 overflow-y-auto">
            {loadingProviderId === selectedProviderId ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-accent dark:text-darkAccent animate-spin" />
              </div>
            ) : availableModels.length === 0 ? (
              <div className="py-4 text-center text-sm text-subInk dark:text-darkSubInk">
                {searchQuery
                  ? t('settings.modelConfig.noResults')
                  : t('settings.modelConfig.noModels')}
              </div>
            ) : (
              <div>
                {availableModels.map(model => (
                  <button
                    key={model}
                    type="button"
                    onClick={(e) => handleModelSelect(e, model)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/10 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm text-ink dark:text-darkInk truncate flex-1 text-left">
                      {model}
                    </span>
                    {selectedModel === model && (
                      <Check className="w-4 h-4 text-accent dark:text-darkAccent flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 自定义模型输入 */}
          <div className="p-3 border-t border-muted/10 dark:border-white/5">
            <div className="flex gap-2">
              <input
                type="text"
                value={customModel}
                onChange={e => setCustomModel(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleUseCustomModel()
                  }
                }}
                placeholder={t('settings.modelConfig.customModelPlaceholder')}
                className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-white/5 border border-muted/20 dark:border-white/10 rounded text-ink dark:text-darkInk placeholder:text-subInk dark:placeholder:text-darkSubInk outline-none focus:border-accent/30 dark:focus:border-darkAccent/30"
              />
              <button
                type="button"
                onClick={handleUseCustomModel}
                disabled={!customModel.trim()}
                className="px-3 py-1.5 text-sm bg-accent dark:bg-darkAccent text-white dark:text-darkInk rounded disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false)
          setPendingModel(null)
          setSearchQuery('')
        }}
        onConfirm={handleConfirm}
        title={t('settings.modelConfig.embeddingModelChangeTitle') || 'Confirm Change'}
        description={t('settings.modelConfig.embeddingModelChangeWarning')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
      />
    </div>
  )
}
