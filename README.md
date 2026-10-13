# LapCry v0.0.8 交付包

本文件夹是 LapCry 的完整交付物，同时包含**源文件**、**构建与打包方式**、**已构建好的可执行程序**以及**测试记录与文档**。

- 产品名称：LapCry
- 版本：`0.0.8`
- 创作人 / 版权：Bin9chn（Copyright 2026）
- 许可：Apache License 2.0
- 目标平台：Windows 10 / 11 x64
- 源码基线：Apache-2.0 上游数据处理引擎 11.5.0（Rebranded / Redesigned）

LapCry 是一个**本地优先**的桌面数据处理工作台，面向编码、解码、加密、解密、哈希、
压缩、解析、提取、取证与数据分析。配方与输入只在本机进程内流转，不上传任何 LapCry 服务。

---

## 一、文件夹结构

```
LapCry_v0.0.8_交付包\
├─ README.md                     ← 本文件（总入口）
├─ 01_可执行程序\                ← 已构建好的可执行程序
│  ├─ LapCry.exe                 ← 自包含单文件 EXE，双击即用
│  ├─ LapCry_v0.0.8_web-standalone.zip  ← 纯网页版（可选，浏览器打开）
│  └─ SHA256SUMS.txt             ← 上面两个文件的 SHA-256 校验值
├─ 02_源代码\                    ← 完整源码（可重新构建）
│  ├─ src\                       ← 核心操作引擎与前端界面
│  ├─ desktop\LapCry.Desktop\    ← .NET 8 WinForms + WebView2 桌面壳
│  ├─ tests\                     ← Node / 操作 / 浏览器测试
│  ├─ tools\                     ← 辅助脚本
│  ├─ package.json 等            ← 前端工程配置
│  └─ LAPCRY_DEVELOPMENT_ACCEPTANCE.md  ← 开发与验收规范
├─ 03_构建与打包\                ← 构建与打包方式
│  ├─ 一键构建.ps1               ← 一键从源码重建 EXE
│  └─ 构建与打包说明.md          ← 环境要求与分步说明
├─ 04_文档与许可\                ← 许可与项目文档
│  ├─ LICENSE                    ← Apache License 2.0
│  ├─ THIRD_PARTY_NOTICES.md     ← 第三方组件声明
│  ├─ LAPCRY_DEVELOPMENT_ACCEPTANCE.md
│  ├─ README.md                  ← 项目源码 README
│  └─ SECURITY.md
└─ 05_测试记录\                  ← v0.0.8 构建与测试日志
   ├─ npm-test-v008.log
   ├─ nightwatch-v008-final.log
   ├─ build-v008.log
   └─ dotnet-publish-v008.log
```

---

## 二、快速开始（直接运行）

1. 进入 `01_可执行程序`。
2. 双击 `LapCry.exe`。
3. 首次启动会把内嵌前端释放到 `%LOCALAPPDATA%\LapCry\runtime\`，随后打开主界面。
4. 无需安装 .NET 运行时（EXE 自包含），但系统需具备
   **Microsoft Edge WebView2 Runtime**（Windows 11 与多数 Windows 10 已内置）。

运行要求：

- Windows 10 / 11 x64
- Microsoft Edge WebView2 Runtime（Evergreen）
- 不需要安装 Node.js、.NET SDK 或浏览器即可运行

可选：`LapCry_v0.0.8_web-standalone.zip` 是纯前端单页版本，解压后用浏览器打开
`index.html` 即可，适合不便运行 EXE 的场景。

### 校验下载完整性

```powershell
cd 01_可执行程序
Get-FileHash .\LapCry.exe -Algorithm SHA256
# 与 SHA256SUMS.txt 中的值比对
```

本次交付的校验值：

```
240ec5458cc5c44d0baa47c3432c84b32726274eb8c00d66671efc7b08a3898e  LapCry.exe
d49f44d9f0dbe860df8b78c2a58045989bbfd628022f49a3fb9ad0035f8725eb  LapCry_v0.0.8_web-standalone.zip
```

---

## 三、从源码重新构建

完整说明见 `03_构建与打包\构建与打包说明.md`，最简方式：

```powershell
cd 03_构建与打包
powershell -ExecutionPolicy Bypass -File .\一键构建.ps1
```

脚本会安装依赖、静态检查、构建前端、运行非 UI 测试并发布单文件 EXE，
最终产物输出到交付包根目录的 `dist\LapCry.exe`。

构建环境：Node.js `>=24 <27`、npm、.NET 8 SDK。

---

## 四、本次（v0.0.8）测试与验收结果

| 项目 | 命令 | 结果 |
| --- | --- | --- |
| 静态检查 | `npm run lint` | 通过（ESLint：configs / core / web / node / tests 全部无报错） |
| Node API 测试 | `npm test` | 通过：279 / 279 |
| 操作单元测试 | `npm test` | 通过：2330 / 2330 |
| 生产前端构建 | `npm run build` | 通过：webpack 编译成功，产出 `build/prod` |
| UI 浏览器测试 | `npm run testui` | 通过：2359 条断言全部通过 |
| 操作库完整性 | — | 507 个操作可发现（上游 506 + 自定义 JavaScript） |
| 桌面发布 | `dotnet publish` | 通过：自包含单文件 `LapCry.exe`（约 86.7 MB，版本 0.0.8.0） |
| EXE 启动 | 双击 / Start-Process | 通过：窗口标题 `LapCry`，10 秒内可用 |
| 本地服务 | `Get-NetTCPConnection` | 通过：仅监听 `127.0.0.1` 随机端口，未暴露局域网 |
| 内嵌资源 | HTTP 请求本机端口 | 通过：`index.html`、`assets/main.js`、`assets/main.css` 均返回 200 |
| 单实例 | 连续启动两次 | 通过：第二次启动即退出，进程数保持 1 |
| 退出清理 | 关闭窗口后检查 | 通过：进程退出、无残留、监听端口释放 |

> UI 测试过程中曾出现一次“操作库打开状态”断言因点击时序抖动而失败。已将该用例
> 由固定 `pause` 改为等待 `body.vault-open` / `body.output-maximised` 状态出现，
> 消除竞态后复跑 2359 条断言全部通过（多次复跑稳定）。

### 已修复的测试问题

- `tests/browser/04_dragdrop.js`「Operations catalog and output workspace controls」：
  移除固定延时断言，改为等待界面状态类落定，避免点击分发慢时误判。

---

## 五、已知限制

- **内存占用偏高（需优化）**：空闲时实测进程组（LapCry + WebView2）约
  **827 MB 工作集 / 623 MB 私有字节**，高于验收规范中“空闲不高于 250 MB、
  高于 350 MB 需优化或说明”的目标。桌面进程本身约 120 MB，其余为 WebView2
  渲染/GPU 子进程。后续可通过延迟加载操作模块、减少首屏同步解析、按需创建
  Worker 等方式降低占用。该指标不影响功能正确性，但列入优化清单。
- **WebView2 运行时依赖**：未安装 Evergreen WebView2 Runtime 时会提示安装；
  程序本身不内置浏览器内核以控制体积。
- 首次启动因需释放内嵌资源，会略慢于后续启动。

---

## 六、许可与署名

LapCry 以 **Apache License 2.0** 发布，产品版权归 **Bin9chn** 所有。
项目中包含的第三方组件仍归各自权利人所有，详细声明见
`04_文档与许可\THIRD_PARTY_NOTICES.md` 与 `LICENSE`。
用户界面、EXE 元数据与发布品牌均为 LapCry / Bin9chn，第三方来源声明仅保留在法律文件中。

## 七、仓库

https://github.com/Bin9chn/LapCry
