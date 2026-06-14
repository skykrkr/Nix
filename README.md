# Nix

> 极简新标签页扩展 — Edge/Chrome Manifest V3


## 功能

- **动态背景** — 默认渐变流动，支持上传图片/GIF/视频（IndexedDB 持久化）
- **搜索栏** — pill 形半透明，可调宽高圆角透明度位置，支持 Bing/Google/Baidu/DuckDuckGo/Sogou
- **拖拽定位** — 圆形按钮拖拽，GPU 合成无极移动，不触发布局重算
- **时间组件** — 可拖拽，可调字号字重颜色透明度位置
- **模板系统** — 保存布局配置，随时切换
- **设置面板** — 二级折叠结构，滑块实时生效

一切纯原生，零依赖，不到 20KB。

## 安装

1. 打开 `edge://extensions/`（Chrome: `chrome://extensions/`）
2. 开启「开发人员模式」
3. 点击「加载解压缩的扩展」
4. 选择 `extension/` 目录

新标签页立即生效。

## 项目结构

```
extension/          ← 侧加载时选择此文件夹
├── index.html      ← 新标签页
├── script.js       ← 全部逻辑
├── style.css       ← 全部样式
├── manifest.json   ← Manifest V3
└── icons/          ← 扩展图标

demo/               ← 浏览器直接打开可预览
└── index.html
```

## 构建

无需构建。纯原生 HTML + CSS + JS。

## 许可

MIT
