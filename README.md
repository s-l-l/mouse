# Mouse Spotlight

Windows 鼠标演示标注工具，适用于会议演示、在线教学等场景。在屏幕上绘制高亮标注，标注内容自动淡出消失。

## 功能

- **绘制模式**：自由画笔、直线（自动识别横/竖方向）、矩形框
- **颜色选择**：橙/红/青/黄/白 五色预设
- **线宽选择**：细/中/粗 三档
- **淡出消失**：绘制内容 2 秒平滑淡出
- **自定义快捷键**：通过设置页面自定义按键绑定
- **系统托盘**：最小化到托盘，右键菜单操作

## 快捷键

| 快捷键 | 功能 | 可自定义 |
|--------|------|----------|
| `Ctrl+Alt+D` | 进入/退出演示模式 | 是 |
| `Insert` | 切换绘制模式 ON/OFF | 是 |
| `Esc` | 退出演示模式 | 否 |
| `1` / `2` / `3` | 画笔 / 直线 / 矩形 | 否 |

## 操作流程

1. 启动后出现在系统托盘
2. 按 `Ctrl+Alt+D` 或双击托盘图标进入演示模式
3. 按 `Insert` 开启绘制模式，按住鼠标左键拖动绘制
4. 松开鼠标，绘制内容自动淡出
5. 再次按 `Insert` 关闭绘制，可正常操作桌面
6. 工具栏始终可操作，不受绘制状态影响
7. 托盘右键 → 设置，可自定义快捷键和淡出时间

## 技术栈

- **Electron** — 桌面应用框架，Chromium + Node.js
- **HTML5 Canvas** — 双层画布架构（绘制层 + 淡出层）
- **requestAnimationFrame** — 60fps 淡出动画驱动
- **贝塞尔曲线插值** — 自由画笔平滑绘制
- **Electron globalShortcut** — 系统级快捷键注册
- **Electron BrowserWindow** — 双窗口架构（overlay + toolbar 分离）

## 项目结构

```
main.js                          主进程：双窗口管理、设置读写、动态快捷键
preload/
  overlay-preload.js             画布窗口 IPC 桥接
  toolbar-preload.js             工具栏窗口 IPC 桥接
  settings-preload.js            设置窗口 IPC 桥接
renderer/
  overlay/                       画布窗口（全屏透明，绘制/穿透切换）
    index.html
    renderer.js
    drawing-engine.js            绘制引擎核心
  toolbar/                       工具栏窗口（始终可交互，独立 z-level）
    index.html
    styles.css
    renderer.js
  settings/                      设置页面（快捷键录入、淡出时间）
    index.html
    styles.css
    renderer.js
```

## 开发

```bash
# 安装依赖
npm install

# 启动开发
npm start

# 打包 Windows 安装程序
npm run build
```

## 架构设计

### 双窗口分离

- **overlay 窗口**：全屏透明画布，z-level `floating`，绘制模式时捕获鼠标，非绘制时穿透
- **toolbar 窗口**：独立小窗口，z-level `pop-up-menu`（最高层），始终可点击
- 两个窗口通过主进程 IPC 中转通信

### 绘制引擎

- 双 Canvas 分层：`drawCanvas` 实时绘制 + `fadeCanvas` 淡出动画
- 形状对象化管理：每个形状存储 type/points/color/opacity/timestamp
- `requestAnimationFrame` 驱动淡出：每帧计算 opacity 衰减

### 设置持久化

- 保存位置：`%APPDATA%/mouse-spotlight/settings.json`
- 动态快捷键：保存后立即重新注册 `globalShortcut`
