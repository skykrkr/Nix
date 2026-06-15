# Changelog

## v4.3 — 2026-06-15

代码重构 + autoplay 策略修复。

### 🧹 代码重构

- CSS custom properties 替代 `injCSS()` 字符串拼接注入样式
- `applyAll()` 拆分为 `applyCSS()` / `applyPositions()` / `syncSlidersUI()` / `autoSave()`
- 删除冗余 `syncSliders()`，合并入 `syncSlidersUI()`
- 加 `clamp()` / `getSearchUrl()` / `safeBgGet()` / `safeBgDel()` 辅助函数
- IndexedDB 操作 try/catch 包装 + `cImg()` 错误兜底
- 上传失败 toast 提示

### 🎵 音频策略修复

- 视频创建始终 `muted=true` 安全 autoplay，不再直接 `muted=false`
- 首次用户交互（`pointerdown`）触发 `activateAudio()` 解除静音
- 音量滑块调高时调用 `v.play()` 重激活音频解码器
- 返回标签页同样恢复

### 🐛 Bug 修复

- **BUG-004（搜索栏中文双重编码）：** `getSearchUrl()` 移除重复的 `encodeURIComponent()`，`ENGINES` 函数内部已有编码
- **BUG-005（切换有声背景需手动调音量）：** `aBg()` 中在 `v2.play()` 前设 `muted=false`，利用 click user gesture 激活音频

---

## v4.2 — 2026-06-15

视频声音控制 + 相对定位 + 背景库排序。

### 🎵 视频背景声音

- 设置面板新增「背景音量」滑块（默认 0% 静音），调高即可播放视频原声
- Page Visibility API：切到其他标签页时自动静音，返回时恢复
- 模板系统同步音量状态
- 「还原默认背景」同时重置音量为 0

### 🎯 时钟默认位置改为相对搜索栏计算

- 旧方案：时钟硬编码 posY=40%，小屏幕 `<700px` 时 hack 上调
- 新方案：首次加载时自动计算，确保时钟底部拖拽按钮与搜索栏之间保持 60px 安全间距
- 全屏适配，不再受视口高度限制
- 「还原时间默认」同样触发相对定位

### 📋 背景库排序

- 背景库改为按上传时间倒序，新上传的排前面

---

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
