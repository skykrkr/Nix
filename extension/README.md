# Nix

> 极简新标签页扩展 — Edge/Chrome Manifest V3

空无一物，只剩你需要的。

## 功能

- **动态背景** — 默认渐变流动，支持上传图片/GIF/视频（IndexedDB 持久化）
- **搜索栏** — pill 形半透明，可调宽高圆角透明度位置，支持 Bing/Google/Baidu/DuckDuckGo/Sogou
- **拖拽** — 圆形按钮拖拽定位，GPU 合成无极移动
- **时间组件** — 可拖拽，可调字号字重颜色透明度位置
- **模板系统** — 保存你的布局配置，随时切换
- **设置面板** — 二级折叠结构，滑块实时生效

一切纯原生，零依赖。

## 安装

1. 打开 `edge://extensions/`
2. 开启「开发人员模式」
3. 点击「加载解压缩的扩展」
4. 选择 `extension/` 目录

Chrome 同理：`chrome://extensions/` → 开发者模式 → 加载已解压的扩展。

## 项目结构

```
extension/
├── icons/          ← 扩展图标
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── index.html      ← 新标签页
├── script.js       ← 全部逻辑
├── style.css       ← 全部样式
└── manifest.json   ← Manifest V3

demo/
└── index.html      ← 可浏览器直接打开的 Demo 版
```

## 构建

无需构建。纯原生 HTML + CSS + JS。

## 许可

MIT
