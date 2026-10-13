# LapCry

LapCry 是一个本地优先的桌面数据处理工作台，面向编码、解码、加密、解密、
哈希、压缩、解析、提取、取证和数据分析。产品、界面、可执行文件元数据与
发布信息均归属于 **Bin9chn**。

- 产品名称：LapCry
- 创作人：Bin9chn
- 版权：Copyright 2026 Bin9chn
- 许可：Apache License 2.0
- 目标平台：Windows 10/11 x64

## 功能概览

- 完整操作库：保留上游全部数据处理操作及配方语义。
- 拖拽配方：从操作库拖入配方、拖拽排序、拖出删除、参数即时编辑。
- 自动与手动执行：支持自动执行、手动执行、单步、断点、Fork 和寄存器。
- 输入输出：支持文本、文件、文件夹、多标签、编码、行尾和文件导出。
- 自定义 JavaScript：在本机 Worker 中运行，支持函数体、超时和错误提示。
- 自定义函数库：支持命名、新增、编辑、删除、持久化和加入配方。
- 双语界面：中文与 English 可即时切换并持久化。
- 双主题：浅色与深色主题可即时切换并持久化。
- 本地优先：不提供账号、云同步、遥测或在线翻译。

部分内置操作会按用户主动操作访问外部服务，例如地图、DNS over HTTPS 和
HTTP 请求。除此之外，输入与配方不会上传到 LapCry 服务。

## 开发环境

- Windows 10/11 x64
- Node.js 24 或 26
- npm
- .NET 8 SDK
- Microsoft Edge WebView2 Runtime

## 安装与构建

```powershell
npm install
npm run build
```

生产前端产物位于 `build/prod/`。完整桌面发布：

```powershell
dotnet publish desktop/LapCry.Desktop/LapCry.Desktop.csproj `
  -c Release -r win-x64 --self-contained true
```

桌面项目会自动包含 `build/prod/`。发布前必须先执行 `npm run build`。

## 测试

```powershell
npm run lint
npm test
npm run testui
dotnet build desktop/LapCry.Desktop/LapCry.Desktop.csproj -c Release
```

验收矩阵、性能阈值、缺陷分级和发布条件见
`LAPCRY_DEVELOPMENT_ACCEPTANCE.md`。

## 使用说明

1. 使用顶部搜索框或“操作库”抽屉查找操作，双击或拖入配方管线。
2. 在紧凑的配方卡片中设置参数，可禁用、设置断点或隐藏参数。
3. 在输入区输入、粘贴或拖入文件。
4. 开启自动执行，或点击“执行”生成输出；拖动配方与输入区之间的分隔条可调整高度。
5. 在“设置”中切换主题与语言。
6. 在“设置 > 自定义函数”中管理常用 JavaScript 函数。

自定义函数接收变量 `input`，必须返回字符串、字节数组、对象或其他可转换为
字符串的值。网络 API 在自定义函数 Worker 中被禁用。函数超时后会被终止，
不会阻塞主界面。

## 桌面安全边界

- 本地静态服务仅绑定 `127.0.0.1` 的随机端口。
- 桌面窗口不允许导航到非回环页面。
- 外部网页链接交由系统默认浏览器处理。
- 退出时关闭本地监听器并释放 WebView2 资源。
- 构建产物不包含开发机绝对路径或用户配方。

## 目录结构

- `src/core/`：操作实现与执行引擎。
- `src/web/`：桌面界面、主题、国际化和交互逻辑。
- `desktop/LapCry.Desktop/`：Windows 桌面壳。
- `tests/`：单元、操作、接口和浏览器测试。
- `build/prod/`：前端构建产物。
- `artifacts/`：本地发布包输出目录。

## 隐私

LapCry 不上传输入、输出、配方或自定义脚本。设置与自定义函数保存在本机
WebView2 用户数据目录的本地存储中。卸载前如需保留配置，应先导出配方或
备份用户数据目录。

## 许可与署名

LapCry 以 Apache License 2.0 发布，产品版权归 Bin9chn 所有。项目中包含的
第三方组件仍归各自权利人所有，详细声明见 `THIRD_PARTY_NOTICES.md` 和
`LICENSE`。用户界面、EXE 元数据和发布品牌不作为第三方产品展示。

## 仓库

https://github.com/Bin9chn/LapCry
