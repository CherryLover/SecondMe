# 14-落地页 CTA 直达

## 背景
当前落地页 CTA 点击会出现“功能正在打磨中”提示，阻断用户进入应用，影响自测与实际使用。

## 目标
- CTA 点击后直接进入应用：
  - 未登录 → `/login`
  - 已登录 → `/app`
- 不再显示“正在打磨中”提示层

## 方案
- 前端 `web/src/pages/LandingPage.tsx`：
  - 移除 CTA 开关与提示逻辑（`CTA_NAV_ENABLED`、notice 状态）
  - `handleCTA` 直接导航
  - 去掉提示层 UI
- 无后端改动

## 影响范围
- 仅 LandingPage CTA 行为

## 测试要点
- 未登录点击 CTA → 跳转到 `/login`
- 已登录点击 CTA → 跳转到 `/app`
- 不再出现“正在打磨中”提示
