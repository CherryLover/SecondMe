# 12-PWA 支持设计

## 1. 背景

将 SecondMe 改造为 PWA（Progressive Web App），提升用户体验：
- 支持添加到主屏幕，独立窗口运行
- 离线时能打开应用（无需完全可用）
- 缓存静态资源，提升加载速度
- 自动后台更新

## 2. 目标

- ✅ 支持"添加到主屏幕"功能
- ✅ 独立窗口运行（无浏览器地址栏）
- ✅ 离线时能打开应用（显示缓存的页面）
- ✅ 静态资源缓存（JS/CSS/图片/字体）
- ✅ 后台自动更新，下次打开生效
- ✅ 多尺寸图标支持
- ❌ 不需要离线完全可用
- ❌ 不需要推送通知

## 3. 技术方案

### 3.1 技术选型

使用 `vite-plugin-pwa` 插件实现，理由：
- 配置简单，开箱即用
- 自动生成 Service Worker
- 支持 Workbox 缓存策略
- 开发时热更新友好
- 社区成熟，文档完善

### 3.2 缓存策略

**静态资源（JS/CSS/图片/字体）**
- 策略：CacheFirst（缓存优先）
- 更新：后台静默更新，下次访问生效
- 缓存时间：1 年

**HTML 文档**
- 策略：NetworkFirst（网络优先）
- 离线降级：显示缓存的版本

**API 请求**
- 策略：NetworkOnly（仅网络）
- 离线时：不缓存，让其自然报错

### 3.3 更新策略

- 用户打开应用时，后台检查更新
- 如有新版本，后台下载
- 下次刷新/重新打开时自动使用新版本
- 不弹窗打扰用户

## 4. 实现方案

### 4.1 安装依赖

```bash
cd web
npm install -D vite-plugin-pwa workbox-window
```

### 4.2 配置 Vite

修改 `web/vite.config.ts`，添加 PWA 插件配置：

```typescript
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['secondme-icon.svg', 'vite.svg'],
      manifest: {
        name: 'Evera · 常在',
        short_name: 'Evera',
        description: '带有长期记忆能力的 AI 对话助手',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    })
  ]
})
```

### 4.3 更新 HTML

修改 `web/index.html`，添加 PWA 相关 meta 标签：

```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/secondme-icon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="#000000" />
  <meta name="description" content="带有长期记忆能力的 AI 对话助手" />
  <link rel="apple-touch-icon" href="/pwa-192x192.png" />

  <title>Evera · 常在</title>
</head>
```

### 4.4 生成图标

使用在线工具或脚本将 `secondme-icon.svg` 转换为多尺寸 PNG：
- `pwa-192x192.png`
- `pwa-512x512.png`

放置到 `web/public/` 目录。

### 4.5 构建配置

插件会自动生成：
- `manifest.webmanifest` - 应用清单
- `sw.js` - Service Worker
- `workbox-*.js` - Workbox 运行时

生产构建时自动注入。

## 5. 用户体验

### 5.1 安装提示

浏览器会在合适时机自动显示"添加到主屏幕"提示：
- Chrome: 地址栏显示安装图标
- Safari: 分享菜单 → 添加到主屏幕
- Edge: 地址栏显示安装图标

### 5.2 离线体验

- 有网络：正常使用
- 无网络：
  - 能打开应用（显示缓存的 HTML/CSS/JS）
  - API 请求失败，页面显示错误提示
  - 用户知道是网络问题

### 5.3 更新体验

- 用户无感知后台更新
- 下次打开自动使用新版本
- 无弹窗打扰

## 6. 涉及文件

### 新增文件
- `web/public/pwa-192x192.png` - 应用图标 192x192
- `web/public/pwa-512x512.png` - 应用图标 512x512

### 修改文件
- `web/vite.config.ts` - 添加 PWA 插件配置
- `web/index.html` - 添加 PWA meta 标签
- `web/package.json` - 添加依赖

### 自动生成文件（构建时）
- `web/dist/manifest.webmanifest` - 应用清单
- `web/dist/sw.js` - Service Worker
- `web/dist/workbox-*.js` - Workbox 运行时

## 7. 测试要点

### 7.1 安装测试
- [ ] Chrome 地址栏显示安装图标
- [ ] 点击安装，应用添加到桌面/应用列表
- [ ] 独立窗口打开，无浏览器地址栏

### 7.2 离线测试
- [ ] 首次访问应用，加载正常
- [ ] 关闭网络（飞行模式）
- [ ] 刷新或重新打开应用
- [ ] 应用能打开，显示页面结构
- [ ] API 请求失败，显示错误提示

### 7.3 更新测试
- [ ] 修改代码，重新构建
- [ ] 用户端后台自动下载更新
- [ ] 关闭应用，重新打开
- [ ] 新版本生效

### 7.4 缓存测试
- [ ] 首次访问后，静态资源已缓存
- [ ] 离线时静态资源从缓存加载
- [ ] 清除缓存后，重新下载资源

## 8. 注意事项

1. **HTTPS 要求**：Service Worker 要求 HTTPS（localhost 除外）
2. **主题色**：需要根据应用实际主题色调整 `theme_color`
3. **图标**：确保图标清晰，背景透明或纯色
4. **测试环境**：本地开发用 `npm run build && npm run preview` 测试
5. **浏览器兼容**：现代浏览器均支持，Safari 需要 11.3+

## 9. 后续扩展（可选）

- 添加离线页面提示（优雅的错误页面）
- 支持推送通知（需要后端配合）
- 添加应用更新提示（可选弹窗）
- 缓存部分 API 数据（如历史对话）
- 添加 iOS 启动画面

## 10. 版本规划

**版本号**: v1.5.0

**发布清单**：
- 安装 vite-plugin-pwa 依赖
- 配置 Vite PWA 插件
- 生成应用图标
- 更新 HTML meta 标签
- 构建测试
- 部署验证
