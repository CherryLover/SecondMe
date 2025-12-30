export type Language = 'zh' | 'en'

export type TranslationValue =
  | string
  | number
  | boolean
  | TranslationValue[]
  | { [key: string]: TranslationValue }

export const translations = {
  zh: {
    common: {
      loading: '加载中...',
      saving: '保存中...',
      deleting: '删除中...',
      add: '添加',
      edit: '编辑',
      delete: '删除',
      cancel: '取消',
      confirm: '确认',
      close: '关闭',
      comingSoon: '功能正在打磨中，敬请期待。',
      actions: {
        clear: '清空',
        reset: '重置',
        continue: '继续',
      },
      status: {
        success: '操作成功',
        failed: '操作失败',
        deleteFailed: '删除失败',
        saveFailed: '保存失败',
      },
      placeholders: {
        required: '请输入内容',
      },
      labels: {
        manual: '手动',
        manualEntry: '手动添加',
        chatExtracted: '对话提取',
      },
      time: {
        justNow: '刚刚',
        minutesAgo: '{{count}} 分钟前',
        hoursAgo: '{{count}} 小时前',
        daysAgo: '{{count}} 天前',
        today: '今天',
        yesterday: '昨天',
      },
      pagination: {
        previous: '上一页',
        next: '下一页',
        pageInfo: '第 {{page}} 页 / 共 {{total}} 页',
      },
      errors: {
        authExpired: '认证已过期，请重新登录',
        streamFailed: '无法获取响应流',
        sendFailed: '发送失败',
        tokenRefresh: 'Token 已自动刷新',
        requestFailed: '请求失败: {{status}}',
      },
    },
    branding: {
      name: '常在',
      logoAlt: '「常在」图标',
    },
    landing: {
      nav: {
        toggleTheme: '切换主题',
        toggleLang: 'Switch to English',
        langShort: {
          zh: '中',
          en: 'En',
        },
      },
      hero: {
        title: '每个人，都应该有一个<br />可以和自己说话的地方。',
        subtitle: '常在：一个只属于你自己的空间',
        scroll: '向下阅读',
      },
      sections: {
        origin: {
          label: '缘起 / ORIGIN',
          title: '为什么会有「常在」',
          content: [
            '每个人都会经历这样的时刻：看完一本书，却不知道该跟谁聊；听到一首歌，被触动了，却说不清原因；走过一段风景，心里有感受，却无处安放。',
            '有些情绪，不适合说给任何人听。<br/>有些想法，太零碎，也太私人。',
          ],
          quote:
            '我们并不是缺少表达的能力，<br/>而是缺少一个<strong>不会打断、不会评判、不会离开的空间</strong>。',
          conclusion: '「常在」正是为此而存在。',
        },
        define: {
          label: '定义 / DEFINE',
          title: '「常在」是什么',
          notThis: '它不是',
          isThis: '它是',
          notList: ['社交产品', '让你关注别人', '追求互动与热闹'],
          isList: ['一个个人空间', '你可以慢慢说，反复说', '陪你记下走过的路'],
          summary:
            '「常在」的角色，不是指导你该怎么做，而是<strong>时间没有断裂的陪伴</strong>。',
        },
        boundary: {
          label: '边界 / BOUNDARY',
          title: '我们不想做什么',
          intro: '在使用「常在」之前，我们想先把一些事情说清楚。<br/>如果你期待的是：',
          tags: ['被激励', '被评估', '被对比', '被引导'],
          conclusion: '那「常在」可能并不适合你。',
        },
        vision: {
          label: '愿景 / VISION',
          title: '随着时间推移，越来越像你',
          cards: [
            {
              title: '历史感',
              desc: '你反复提到的事情是什么？哪些想法，几年后你还会回来看？',
            },
            {
              title: '稳定性',
              desc: '哪些东西，对你来说是重要的，而不是流行的？',
            },
            {
              title: '了解',
              desc: '不是变得更聪明，而是变得更了解你的语气、你的在意。',
            },
          ],
        },
        privacy: {
          label: '隐私 / PRIVACY',
          title: '独立且私密',
          p1: '「常在」支持多用户，但并不意味着「多人空间」。',
          p2: '每一个人，都是在<strong>完全独立、互不干扰的空间里</strong>使用「常在」。没有公共时间线，没有比较，没有他人的目光。',
          p3: '我们只是提供这个空间本身，空间里发生的一切，永远只属于你。',
        },
      },
      footer: {
        title: '「常在」<br/>并不试图改变你。',
        desc: '如果它真的有一点价值，那大概只是帮你更清楚地看见：你已经是谁，你正在成为谁。',
        cta: '进入你的空间',
        notice: '我正在慢慢成形。\n等准备好了，第一个欢迎的人会是你。',
        copyright: '安静 · 记录 · 存在',
      },
    },
    auth: {
      subtitle: 'AI 对话助手',
      heading: {
        login: '欢迎回来',
        register: '创建账号',
      },
      fields: {
        username: '用户名',
        password: '密码',
        confirmPassword: '确认密码',
        inviteCode: '邀请码',
      },
      placeholders: {
        username: '请输入用户名',
        password: '请输入密码',
        confirmPassword: '请再次输入密码',
        inviteCode: '请输入邀请码',
      },
      actions: {
        login: '登录',
        register: '注册',
        loggingIn: '登录中...',
        registering: '注册中...',
        switchToRegister: '立即注册',
        switchToLogin: '立即登录',
      },
      prompts: {
        noAccount: '还没有账号？',
        hasAccount: '已有账号？',
      },
      errors: {
        passwordMismatch: '两次输入的密码不一致',
        passwordTooShort: '密码长度至少 6 位',
        generic: '操作失败',
      },
    },
    chat: {
      newConversation: '新对话',
      loadingMessages: '加载消息...',
      placeholders: {
        composer: '写下你想说的话...',
        newConversation: '写下你想说的话，开始新对话...',
        continueConversation: '继续对话...',
      },
      helper: '按 Enter 发送，Shift + Enter 换行',
      emptyState: {
        title: '开始新对话',
        description: '写下你想说的话，我会记住我们之间的每一次对话。',
      },
    },
    sidebar: {
      actions: {
        newChat: '新对话',
        themeLight: '浅色模式',
        themeDark: '深色模式',
        logout: '退出登录',
        settings: '设置',
        admin: '管理后台',
      },
      quickLinks: {
        memories: '记忆',
        flowmo: 'Flowmo',
      },
      list: {
        loading: '加载中...',
        empty: '暂无对话',
        defaultTitle: '新对话',
      },
      confirmations: {
        deleteTopic: '确定要删除这个对话吗？',
      },
      badges: {
        admin: '管理员',
        me: '(我)',
      },
    },
    flowmo: {
      title: 'Flowmo',
      description: 'Flowmo 是你的随想记录空间。在 Flowmo 对话中，你的每条消息都会被自动保存为随想。',
      buttons: {
        conversation: '对话',
        clear: '清空',
        add: '添加',
      },
      placeholders: {
        idea: '写下你的想法...',
      },
      actions: {
        cancel: '取消',
        adding: '添加中...',
      },
      list: {
        emptyTitle: '暂无随想',
        emptyDesc: '在 Flowmo 对话中记录的想法会自动出现在这里',
        fromChat: '来自对话',
        delete: '删除',
      },
      confirmations: {
        deleteOne: '确定要删除这条随想吗？',
        deleteAll: '确定要删除所有随想吗？此操作不可恢复！',
      },
      alerts: {
        deleteFailed: '删除失败',
        deleteAllSuccess: '已删除 {{count}} 条随想',
        addFailed: '添加失败',
      },
    },
    memory: {
      title: '记忆',
      buttons: {
        add: '添加',
        clear: '清空',
      },
      filters: {
        all: '全部',
        chat: '对话提取',
        manual: '手动添加',
      },
      empty: {
        title: '暂无记忆',
        desc: '记忆会在对话中自动提取，你也可以手动添加重要信息',
      },
      confirmations: {
        deleteOne: '确定要删除这条记忆吗？',
        deleteAll: '确定要删除所有记忆吗？此操作不可恢复！',
      },
      alerts: {
        deleteFailed: '删除失败',
        deleteAllSuccess: '已删除 {{count}} 条记忆',
      },
      list: {
        types: {
          personal: '个人信息',
          preference: '偏好',
          fact: '事实',
          plan: '计划',
          manual: '手动添加',
          chat: '对话提取',
        },
        sourceManual: '手动',
        useCount: '使用 {{count}} 次',
        view: '查看详情',
        edit: '编辑',
        delete: '删除',
        untitled: '未命名对话',
      },
      pagination: {
        pageStatus: '第 {{page}} 页 / 共 {{total}} 页',
      },
      modal: {
        titles: {
          add: '添加记忆',
          edit: '编辑记忆',
          view: '记忆详情',
        },
        fields: {
          type: '类型',
          content: '内容',
          createdAt: '创建时间',
          useCount: '使用次数',
          recentUsage: '最近使用',
          placeholder: '输入你想记住的信息...',
          helper: '这些信息会在对话中被自动检索使用',
        },
        buttons: {
          close: '关闭',
          cancel: '取消',
          save: '保存',
          saving: '保存中...',
        },
      },
    },
    settings: {
      title: '设置',
      theme: {
        title: '主题',
        current: '当前: {{mode}}',
        dark: '深色模式',
        light: '浅色模式',
        toggle: '切换主题',
      },
      password: {
        title: '修改密码',
        current: '当前密码',
        new: '新密码',
        confirm: '确认新密码',
        placeholderCurrent: '输入当前密码',
        placeholderNew: '输入新密码（至少6位）',
        placeholderConfirm: '再次输入新密码',
        button: '修改密码',
        buttonLoading: '修改中...',
        success: '密码修改成功',
        errors: {
          required: '请填写当前密码和新密码',
          mismatch: '两次输入的密码不一致',
          short: '新密码至少需要6位',
        },
      },
      providers: {
        title: '服务商管理',
        add: '添加',
        empty: '暂无服务商配置',
      },
      modelConfig: {
        title: '模型配置',
        chatModel: '对话模型',
        chatModelDesc: '用于对话和回复生成的 AI 模型',
        embeddingModel: '向量化模型',
        embeddingModelDesc: '用于记忆向量化的嵌入模型',
        selectProvider: '选择服务商',
        selectChatProvider: '请先选择对话服务商',
        selectEmbeddingProvider: '请先选择向量化服务商',
        selectChatModel: '选择对话模型',
        selectEmbeddingModel: '选择向量化模型',
        searchPlaceholder: '搜索模型...',
        noResults: '无匹配结果',
        noModels: '无法获取模型列表，请手动输入',
        customModelPlaceholder: '或手动输入模型名称',
        embeddingModelChangeTitle: '确认切换模型',
        embeddingModelChangeWarning: '修改向量化模型后，之前的记忆向量将无法使用，需要重新生成所有记忆。确定要修改吗？',
      },
      memorySettings: {
        title: '记忆设置',
        topK: '记忆检索数量 (Top K)',
        topKDesc: '每次对话检索最相关的记忆条数',
        autoExtract: '启用记忆自动提取',
        idleMinutes: '静默提取间隔（分钟）',
        idleDesc: '对话静默后多久触发记忆提取',
      },
      alerts: {
        deleteFailed: '删除失败',
        saveFailed: '更新失败',
      },
    },
    admin: {
      title: '管理后台',
      invites: {
        title: '邀请码管理',
        fields: {
          maxUses: '可用次数:',
          expiresDays: '有效天数:',
          expiresPlaceholder: '永久',
        },
        buttons: {
          create: '创建邀请码',
          creating: '创建中...',
        },
        empty: '暂无邀请码',
        usage: '{{used}}/{{max}} 次',
        confirmDelete: '确定要删除这个邀请码吗？',
        alerts: {
          createFailed: '创建失败',
          deleteFailed: '删除失败',
        },
      },
      users: {
        title: '用户管理',
        titleWithCount: '用户管理 ({{count}})',
        empty: '暂无用户',
        registeredAt: '注册于 {{date}}',
        confirmDelete: '确定要删除用户 "{{username}}" 吗？此操作不可恢复！',
        cantDeleteSelf: '不能删除自己',
        alerts: {
          deleteFailed: '删除失败',
        },
      },
    },
    provider: {
      confirmDelete: '确定要删除这个服务商吗？',
      modal: {
        addTitle: '添加服务商',
        editTitle: '编辑服务商',
        fields: {
          name: '名称 *',
          baseUrl: 'Base URL *',
          apiKey: 'API Key',
          apiKeyHint: '(留空保持不变)',
          namePlaceholder: '如：OpenAI、DeepSeek',
          baseUrlPlaceholder: '如：https://api.openai.com/v1',
          apiKeyPlaceholder: 'sk-...',
          enabled: '启用此服务商',
        },
        buttons: {
          cancel: '取消',
          save: '保存',
          saving: '保存中...',
        },
        alerts: {
          saveFailed: '保存失败',
        },
      },
    },
  },
  en: {
    common: {
      loading: 'Loading...',
      saving: 'Saving...',
      deleting: 'Deleting...',
      add: 'Add',
      edit: 'Edit',
      delete: 'Delete',
      cancel: 'Cancel',
      confirm: 'Confirm',
      close: 'Close',
      comingSoon: 'This space is still in the works. Stay tuned.',
      actions: {
        clear: 'Clear',
        reset: 'Reset',
        continue: 'Continue',
      },
      status: {
        success: 'Action completed',
        failed: 'Action failed',
        deleteFailed: 'Delete failed',
        saveFailed: 'Save failed',
      },
      placeholders: {
        required: 'Please enter a value',
      },
      labels: {
        manual: 'Manual',
        manualEntry: 'Manual entry',
        chatExtracted: 'Chat extracted',
      },
      time: {
        justNow: 'Just now',
        minutesAgo: '{{count}} minutes ago',
        hoursAgo: '{{count}} hours ago',
        daysAgo: '{{count}} days ago',
        today: 'Today',
        yesterday: 'Yesterday',
      },
      pagination: {
        previous: 'Previous',
        next: 'Next',
        pageInfo: 'Page {{page}} of {{total}}',
      },
      errors: {
        authExpired: 'Session expired, please sign in again.',
        streamFailed: 'Unable to fetch the response stream.',
        sendFailed: 'Message failed to send.',
        tokenRefresh: 'Token refreshed automatically.',
        requestFailed: 'Request failed: {{status}}',
      },
    },
    branding: {
      name: 'Evera',
      logoAlt: 'Evera icon',
    },
    landing: {
      nav: {
        toggleTheme: 'Toggle Theme',
        toggleLang: '切换到中文',
        langShort: {
          zh: '中',
          en: 'En',
        },
      },
      hero: {
        title: 'Everyone deserves a place<br />to talk to themselves.',
        subtitle: 'Evera: A space that belongs only to you',
        scroll: 'SCROLL DOWN',
      },
      sections: {
        origin: {
          label: 'ORIGIN',
          title: 'Why Evera Exists',
          content: [
            'We all have moments like this: finishing a book with no one to share it with; being moved by a song without knowing why; walking through a landscape with feelings having nowhere to land.',
            'Some emotions are not meant for others.<br/>Some thoughts are too fragmented, too private.',
          ],
          quote:
            "It's not that we lack the ability to express,<br/>but rather a space that <strong>won't interrupt, won't judge, and won't leave</strong>.",
          conclusion: 'This is why Evera exists.',
        },
        define: {
          label: 'DEFINE',
          title: 'What is Evera',
          notThis: 'Not This',
          isThis: 'This',
          notList: ['A social product', 'Following others', 'Seeking interaction or buzz'],
          isList: ['A personal space', 'Speak slowly, speak repeatedly', "Record the path you've walked"],
          summary:
            "Evera's role is not to guide you, but to provide <strong>unbroken companionship over time</strong>.",
        },
        boundary: {
          label: 'BOUNDARY',
          title: "What We Don't Do",
          intro: 'Before using Evera, we want to be clear.<br/>If you are looking for:',
          tags: ['Motivation', 'Evaluation', 'Comparison', 'Guidance'],
          conclusion: 'Then Evera might not be for you.',
        },
        vision: {
          label: 'VISION',
          title: 'More Like You Over Time',
          cards: [
            {
              title: 'History',
              desc: 'What do you mention repeatedly? Which thoughts will you revisit years later?',
            },
            {
              title: 'Stability',
              desc: 'What is important to you, rather than what is popular?',
            },
            {
              title: 'Understanding',
              desc: 'Not smarter, but more attuned to your tone and what you care about.',
            },
          ],
        },
        privacy: {
          label: 'PRIVACY',
          title: 'Independent & Private',
          p1: 'Evera supports multiple users, but it is not a "multi-user space".',
          p2: 'Everyone uses Evera in a <strong>completely independent, undisturbed space</strong>. No public timelines, no comparison, no gaze from others.',
          p3: 'We only provide the space itself. Everything that happens inside belongs only to you.',
        },
      },
      footer: {
        title: "Evera<br/>Doesn't Try to Change You.",
        desc: 'If it has any value, it is perhaps just to help you see more clearly: who you already are, and who you are becoming.',
        cta: 'Enter Your Space',
        notice: "We're crafting this private space right now — stay tuned.",
        copyright: 'QUIET · RECORD · EXIST',
      },
    },
    auth: {
      subtitle: 'AI conversation companion',
      heading: {
        login: 'Welcome back',
        register: 'Create an account',
      },
      fields: {
        username: 'Username',
        password: 'Password',
        confirmPassword: 'Confirm password',
        inviteCode: 'Invite code',
      },
      placeholders: {
        username: 'Enter your username',
        password: 'Enter your password',
        confirmPassword: 'Re-enter your password',
        inviteCode: 'Enter your invite code',
      },
      actions: {
        login: 'Log In',
        register: 'Sign Up',
        loggingIn: 'Signing in...',
        registering: 'Creating account...',
        switchToRegister: 'Sign up now',
        switchToLogin: 'Sign in now',
      },
      prompts: {
        noAccount: "Don't have an account?",
        hasAccount: 'Already have an account?',
      },
      errors: {
        passwordMismatch: "The two passwords don't match.",
        passwordTooShort: 'Password must be at least 6 characters.',
        generic: 'Something went wrong.',
      },
    },
    chat: {
      newConversation: 'New conversation',
      loadingMessages: 'Loading messages...',
      placeholders: {
        composer: "Say what's on your mind...",
        newConversation: 'Write what you want to say to start a new conversation...',
        continueConversation: 'Continue the conversation...',
      },
      helper: 'Press Enter to send, Shift + Enter for a new line',
      emptyState: {
        title: 'Start a new conversation',
        description: 'Tell me what you want to talk about—I will remember every exchange between us.',
      },
    },
    sidebar: {
      actions: {
        newChat: 'New chat',
        themeLight: 'Light mode',
        themeDark: 'Dark mode',
        logout: 'Sign out',
        settings: 'Settings',
        admin: 'Admin console',
      },
      quickLinks: {
        memories: 'Memories',
        flowmo: 'Flowmo',
      },
      list: {
        loading: 'Loading...',
        empty: 'No conversations yet',
        defaultTitle: 'Untitled chat',
      },
      confirmations: {
        deleteTopic: 'Delete this conversation?',
      },
      badges: {
        admin: 'Admin',
        me: '(me)',
      },
    },
    flowmo: {
      title: 'Flowmo',
      description: 'Flowmo is the notebook for your stray thoughts. Everything you tell Flowmo chat is saved here automatically.',
      buttons: {
        conversation: 'Chat',
        clear: 'Clear',
        add: 'Add',
      },
      placeholders: {
        idea: 'Write down your thought...',
      },
      actions: {
        cancel: 'Cancel',
        adding: 'Saving...',
      },
      list: {
        emptyTitle: 'No notes yet',
        emptyDesc: 'Thoughts captured inside Flowmo conversations will appear here.',
        fromChat: 'From chat',
        delete: 'Delete',
      },
      confirmations: {
        deleteOne: 'Delete this note?',
        deleteAll: 'Delete all notes? This cannot be undone.',
      },
      alerts: {
        deleteFailed: 'Delete failed',
        deleteAllSuccess: 'Deleted {{count}} notes',
        addFailed: 'Add failed',
      },
    },
    memory: {
      title: 'Memories',
      buttons: {
        add: 'Add',
        clear: 'Clear',
      },
      filters: {
        all: 'All',
        chat: 'Chat extracted',
        manual: 'Manual entry',
      },
      empty: {
        title: 'No memories yet',
        desc: 'Memories are extracted automatically from conversations, or you can add them yourself.',
      },
      confirmations: {
        deleteOne: 'Delete this memory?',
        deleteAll: 'Delete all memories? This cannot be undone.',
      },
      alerts: {
        deleteFailed: 'Delete failed',
        deleteAllSuccess: 'Deleted {{count}} memories',
      },
      list: {
        types: {
          personal: 'Personal',
          preference: 'Preference',
          fact: 'Fact',
          plan: 'Plan',
          manual: 'Manual entry',
          chat: 'Chat extracted',
        },
        sourceManual: 'Manual',
        useCount: 'Used {{count}} times',
        view: 'View details',
        edit: 'Edit',
        delete: 'Delete',
        untitled: 'Untitled conversation',
      },
      pagination: {
        pageStatus: 'Page {{page}} of {{total}}',
      },
      modal: {
        titles: {
          add: 'Add memory',
          edit: 'Edit memory',
          view: 'Memory details',
        },
        fields: {
          type: 'Type',
          content: 'Content',
          createdAt: 'Created at',
          useCount: 'Usage',
          recentUsage: 'Recent usage',
          placeholder: 'Write the information you want to remember...',
          helper: 'These details will be retrieved automatically in conversations.',
        },
        buttons: {
          close: 'Close',
          cancel: 'Cancel',
          save: 'Save',
          saving: 'Saving...',
        },
      },
    },
    settings: {
      title: 'Settings',
      theme: {
        title: 'Theme',
        current: 'Current: {{mode}}',
        dark: 'Dark mode',
        light: 'Light mode',
        toggle: 'Toggle theme',
      },
      password: {
        title: 'Change password',
        current: 'Current password',
        new: 'New password',
        confirm: 'Confirm new password',
        placeholderCurrent: 'Enter your current password',
        placeholderNew: 'Enter a new password (min 6 characters)',
        placeholderConfirm: 'Re-enter the new password',
        button: 'Change password',
        buttonLoading: 'Updating...',
        success: 'Password updated',
        errors: {
          required: 'Please fill in your current and new passwords.',
          mismatch: "The two passwords don't match.",
          short: 'The new password must be at least 6 characters.',
        },
      },
      providers: {
        title: 'Provider management',
        add: 'Add',
        empty: 'No providers configured yet',
      },
      modelConfig: {
        title: 'Model configuration',
        chatModel: 'Chat model',
        chatModelDesc: 'AI model for conversations and responses',
        embeddingModel: 'Embedding model',
        embeddingModelDesc: 'Embedding model for memory vectorization',
        selectProvider: 'Select provider',
        selectChatProvider: 'Select a chat provider first',
        selectEmbeddingProvider: 'Select an embedding provider first',
        selectChatModel: 'Select chat model',
        selectEmbeddingModel: 'Select embedding model',
        searchPlaceholder: 'Search models...',
        noResults: 'No matching results',
        noModels: 'Unable to fetch models, please enter manually',
        customModelPlaceholder: 'Or enter model name manually',
        embeddingModelChangeTitle: 'Confirm Mode Change',
        embeddingModelChangeWarning: 'Changing the embedding model will make existing memory vectors unusable. All memories will need to be regenerated. Are you sure?',
      },
      memorySettings: {
        title: 'Memory settings',
        topK: 'Memory retrieval count (Top K)',
        topKDesc: 'How many relevant memories to fetch each time.',
        autoExtract: 'Enable automatic memory extraction',
        idleMinutes: 'Idle extraction interval (minutes)',
        idleDesc: 'How long after silence to trigger extraction.',
      },
      alerts: {
        deleteFailed: 'Delete failed',
        saveFailed: 'Update failed',
      },
    },
    admin: {
      title: 'Admin console',
      invites: {
        title: 'Invite codes',
        fields: {
          maxUses: 'Max uses:',
          expiresDays: 'Active days:',
          expiresPlaceholder: 'Never',
        },
        buttons: {
          create: 'Create invite code',
          creating: 'Creating...',
        },
        empty: 'No invite codes yet',
        usage: '{{used}}/{{max}} uses',
        confirmDelete: 'Delete this invite code?',
        alerts: {
          createFailed: 'Creation failed',
          deleteFailed: 'Delete failed',
        },
      },
      users: {
        title: 'User management',
        titleWithCount: 'User management ({{count}})',
        empty: 'No users yet',
        registeredAt: 'Joined {{date}}',
        confirmDelete: 'Delete user "{{username}}"? This cannot be undone.',
        cantDeleteSelf: "You can't delete yourself",
        alerts: {
          deleteFailed: 'Delete failed',
        },
      },
    },
    provider: {
      confirmDelete: 'Delete this provider?',
      modal: {
        addTitle: 'Add provider',
        editTitle: 'Edit provider',
        fields: {
          name: 'Name *',
          baseUrl: 'Base URL *',
          apiKey: 'API Key',
          apiKeyHint: '(leave blank to keep)',
          namePlaceholder: 'e.g. OpenAI, DeepSeek',
          baseUrlPlaceholder: 'e.g. https://api.openai.com/v1',
          apiKeyPlaceholder: 'sk-...',
          enabled: 'Enable this provider',
        },
        buttons: {
          cancel: 'Cancel',
          save: 'Save',
          saving: 'Saving...',
        },
        alerts: {
          saveFailed: 'Save failed',
        },
      },
    },
  },
} as const satisfies Record<Language, TranslationValue>

export type AppMessages = (typeof translations)['zh']
