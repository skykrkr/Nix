# Changelog

## v4.1 — 2026-06-14

壁纸系统全面重写：从 base64 迁移到 Blob URL 存储，修复两个已知 bug。

### 🔥 BUG-001 修复：壁纸切换高 CPU / base64 巨型 URL

**根因：** 图片以全分辨率 base64 data URL 存入 IndexedDB，设到 CSS `background-image` 上字符串达数 MB。切换壁纸时旧 base64 在异步等待期间持续解码渲染，导致 CPU 飙升。

**修复：**
- **Eager Cleanup** — 切换壁纸前立即清空 bg-layer，停止旧图片渲染
- **上传压缩** — 图片超 1080p 时 canvas 等比缩小 + JPEG 85% 导出
- **Blob URL 存储（核心）** — IndexedDB 直接存原生二进制 Blob，`backgroundImage` 用 `url(blob:...)`（几十字节），不再嵌 base64 字符串；`createObjectURL` / `revokeObjectURL` 管理生命周期
- 兼容旧 base64 数据，无需迁移

### 🖥️ BUG-002 修复：小屏幕默认位置重叠

**根因：** 时钟默认 posY=40%、搜索栏 posY=50%，小屏幕实际像素间距不够。

**修复：**
- 首次加载且视口高度 < 700px 时自动上移时钟，保证底部与搜索栏间距 ≥ 30px
- 「还原默认」后也触发自适应
- 用户拖拽后以保存的位置为准

### ⚡ 拖拽保存优化

拖拽结束不再依赖 500ms 防抖，改为立即同步写入 localStorage，拖拽后刷新不丢位置。

---

## v4.0 — 2026-06-14

初始发布。转为 Edge Manifest V3 扩展，拆分为独立文件。更名为 Nix。
