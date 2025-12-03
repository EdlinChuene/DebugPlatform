# Debug Platform WebUI

基于 React + TypeScript + Vite + Tailwind CSS 的调试平台前端。

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器 (localhost:3000)
npm run dev

# 开发时需要同时运行 DebugHub 后端 (localhost:8080)
# Vite 会自动代理 /api 和 /ws 请求到后端
```

## 构建与部署

```bash
# 方式 1: 使用 npm script
npm run deploy

# 方式 2: 使用 shell 脚本
./scripts/deploy.sh

# 构建产物会被复制到 ../DebugHub/Public/
```

## 项目结构

```
src/
├── components/       # 可复用组件
│   ├── Sidebar.tsx
│   ├── DeviceCard.tsx
│   ├── HTTPEventTable.tsx
│   ├── HTTPEventDetail.tsx
│   ├── LogList.tsx
│   └── LogFilters.tsx
├── pages/           # 页面组件
│   ├── DeviceListPage.tsx
│   └── DeviceDetailPage.tsx
├── services/        # API 和服务
│   ├── api.ts
│   └── realtime.ts
├── stores/          # 状态管理 (Zustand)
│   ├── deviceStore.ts
│   ├── httpStore.ts
│   ├── logStore.ts
│   └── connectionStore.ts
├── types/           # TypeScript 类型
│   └── index.ts
├── utils/           # 工具函数
│   └── format.ts
├── hooks/           # 自定义 Hooks
├── App.tsx
├── main.tsx
└── index.css
```

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式
- **Zustand** - 状态管理
- **React Router** - 路由
- **date-fns** - 日期格式化

