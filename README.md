# Nix

> 极简新标签页扩展 — Edge / Chrome Manifest V3
>
> 空无一物，只剩你需要的。

[安装包](https://github.com/skykrkr/Nix/releases) ·
[在线自测页](https://skykrkr.github.io/Nix/) ·
[更新日志](CHANGELOG.md) ·
[隐私说明](PRIVACY.md)

## 功能

- **设计画布** — 位置按设计坐标保存，换分辨率 / 多屏 / 改窗口大小都不漂移
- **拖拽定位** — Pointer Events + 指针捕获，松手零跳变；把手贴底翻上、空间不足收进内部
- **搜索栏** — pill 形半透明，宽高圆角透明度可调，支持 Bing / Google / Baidu / DuckDuckGo / Sogou
- **时间组件** — 可拖拽，字号、字重、颜色、透明度可调
- **尺寸与对齐** — 组件整体大小 60–180%，全局缩放 60–160%，整体 / 组件中轴线吸附（默认关）
- **单项还原** — 每个可调项独立还原，另有「还原全部默认」
- **背景** — 默认渐变流动，可上传图片 / GIF / 视频，存 IndexedDB；背景音量默认 100%
- **模板** — 只保存组件参数 + 背景 + 音量，切换不覆盖搜索引擎与全局缩放
- **设置面板** — 二级折叠，滑块实时生效

纯原生，零依赖，打包约 17 KB。

## 安装

### 从 Release 安装

1. 下载最新的 `Nix-vX.Y.zip` 并解压
2. 打开 `edge://extensions/`（Chrome 为 `chrome://extensions/`）
3. 开启「开发人员模式」
4. 点击「加载解压缩的扩展」，选择解压后**包含 `manifest.json` 的那一层目录**

### 从源码安装

下载本仓库，选择 `extension/` 目录加载即可。

## 项目结构

```
extension/    扩展源码，唯一编辑源
├── index.html
├── script.js
├── style.css
├── manifest.json
└── icons/

demo/         与 extension 同源的三件套，可直接用浏览器打开
docs/         GitHub Pages 在线自测页（由 tools/sync.py 生成）
reports/      历史压测报告
tools/        sync.py — 同步与一致性校验
```

## 同步与校验

`docs/` 与 `demo/` 都是 `extension/` 的派生物，不要直接编辑：

```bash
python3 tools/sync.py          # 重新生成 docs/ 与 demo/
python3 tools/sync.py --check  # 只校验，不一致返回非零
```

Pages 部署前会自动执行 `--check`，漂移时构建失败。

## 浏览器支持

Chromium 内核（Edge / Chrome），Manifest V3。

## 许可

MIT
