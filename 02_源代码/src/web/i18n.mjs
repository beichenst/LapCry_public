/**
 * LapCry locale layer.
 *
 * Upstream operation names remain canonical English because recipe
 * serialisation, drag and drop and deep links depend on those identifiers.
 * UI chrome, settings, categories, status labels and common actions are
 * translated without changing recipe data.
 *
 * @author Bin9chn
 * @copyright LapCry 2026
 * @license Apache-2.0
 */

const STORAGE_KEY = "lapcry.settings.v1";
import ZH_OPERATIONS from "./operations.zh.mjs";
import ZH_DESCRIPTIONS from "./descriptions.zh.mjs";
const DEFAULT_LOCALE = "zh-CN";
const SUPPORTED_LOCALES = ["zh-CN", "en-US"];
const originals = new WeakMap();
const attributeOriginals = new WeakMap();
let observer = null;
let currentLocale = DEFAULT_LOCALE;
let applyingLocale = false;

const ZH = {
    "LapCry": "LapCry",
    "Cyber Data Workbench": "网络数据处理工作台",
    "Data Transformation Console": "数据转换控制台",
    "OPERATION INDEX": "操作索引",
    "LOCAL ENGINE": "本地引擎",
    "CATALOG": "目录",
    "PIPELINE": "管线",
    "SOURCE": "来源",
    "RESULT": "结果",
    "Operations": "操作库",
    "Operations catalog": "操作库",
    "Close operations catalog": "关闭操作库",
    "Search operations...": "搜索操作...",
    "Language / 语言": "语言 / Language",
    "Theme / 主题": "主题 / Theme",
    "Switch language": "切换语言",
    "Switch theme": "切换主题",
    "Local engine": "本地引擎",
    "Every operation runs locally on this device.": "所有操作均在本设备本地运行。",
    "Application": "应用",
    "LOCAL": "本地",
    "Search...": "搜索操作...",
    "Recipe": "配方",
    "Input": "输入",
    "Output": "输出",
    "Step": "单步",
    "Bake!": "执行",
    "Auto Bake": "自动执行",
    "Options": "设置",
    "Settings": "设置",
    "Download": "下载",
    "Settings persist between sessions.": "设置会在会话之间保留。",
    "Origin": "来源",
    "Version": "版本",
    "Compile time:": "编译时间：",
    "Release notes": "迭代记录",
    "Aligned responsive shell edges and restored light-theme settings after reload.": "修复响应式界面边缘对齐，并修复刷新后浅色主题设置未恢复的问题。",
    "Refined the liquid-glass workspace, compact recipe cards and resizable pipeline.": "优化液态玻璃工作区、紧凑配方卡片与可调节管线布局。",
    "Completed Chinese operation descriptions and strengthened bilingual theme regression tests.": "完善操作说明中文汉化，并加强双语与主题回归测试。",
    "Fixed operation controls and Chinese text display, and improved interaction experience.": "修复操作控制与中文显示，优化交互体验。",
    "Initial LapCry redevelopment with a new interface, custom functions and desktop foundation.": "LapCry 初始重构版本，包含全新界面、自定义函数与桌面版基础功能。",
    "LapCry is adapted from CyberChef: the transformation engine is sourced from the open-source CyberChef project (Apache-2.0 license).": "LapCry 由 CyberChef 改造而来：转换引擎源自开源项目 CyberChef（Apache-2.0 许可）",
    "About / Support": "关于与支持",
    "Save recipe": "保存配方",
    "Load recipe": "加载配方",
    "Clear recipe": "清空配方",
    "Set breakpoint": "设置断点",
    "Disable operation": "禁用操作",
    "Hide operation's arguments": "隐藏该操作参数",
    "Setting breakpoints": "设置断点",
    "Disabling operations": "禁用操作",
    "Hiding an operation's arguments": "隐藏操作参数",
    "Help topic": "帮助主题",
    "Help topic:": "帮助主题：",
    "Setting a breakpoint on an operation will cause execution of the Recipe to pause when it reaches that operation.": "在某个操作上设置断点后，配方执行到该操作时会暂停。",
    "Disabling an operation will prevent it from being executed when the Recipe is baked. Execution will skip over the disabled operation and continue with subsequent operations.": "禁用操作后，执行配方时会跳过该操作，继续执行后续步骤。",
    "Hiding an operation's argument will save space in the Recipe window. Execution will still take place with the selected argument options.": "隐藏操作参数可以节省配方窗口的空间，执行时仍会使用已选择的参数。",
    "Hide arguments": "隐藏参数",
    "Recipe name": "配方名称",
    "Deep link": "深度链接",
    "Include recipe": "包含配方",
    "Include input": "包含输入",
    "LapCry format": "LapCry 格式",
    "Clean JSON": "易读 JSON",
    "Compact JSON": "紧凑 JSON",
    "Save": "保存",
    "Done": "完成",
    "Cancel": "取消",
    "Load": "加载",
    "Close": "关闭",
    "Ok": "确定",
    "Reset options to default": "恢复默认设置",
    "Theme": "主题",
    "Light": "浅色",
    "Dark": "深色",
    "Language": "语言",
    "中文": "中文",
    "English": "English",
    "Console logging level": "控制台日志级别",
    "Silent": "静默",
    "Error": "错误",
    "Warn": "警告",
    "Info": "信息",
    "Debug": "调试",
    "Trace": "追踪",
    "Update the URL when the input or recipe changes": "输入或配方变化时更新地址",
    "Highlight selected bytes in output and input (when possible)": "高亮输入与输出中的对应字节",
    "Word wrap the input and output": "自动换行输入和输出",
    "Show errors from operations (recommended)": "显示操作错误（推荐）",
    "Operation error timeout in ms (0 for never)": "操作错误提示时长（毫秒，0 为不关闭）",
    "Use meta key for keybindings (Windows ⊞/Command ⌘)": "使用 Meta 键作为快捷键修饰键",
    "Attempt to detect encoded data automagically": "自动检测编码数据",
    "Render a preview of the input if it's detected to be an image": "检测到图片时显示预览",
    "Keep the current tab in sync between the input and output": "保持输入和输出标签同步",
    "Show the number of operations in each category": "显示每个分类的操作数量",
    "Add new input tab": "新建输入标签",
    "Open folder as input": "以文件夹作为输入",
    "Open file as input": "打开文件作为输入",
    "Clear input and output": "清空输入与输出",
    "Reset pane layout": "重置面板布局",
    "Save output to file": "将输出保存到文件",
    "Save all outputs to file": "保存全部输出",
    "Copy output": "复制输出",
    "Switch to input": "切换到输入",
    "Magic": "Magic 自动检测",
    "Find Input Tab": "查找输入标签",
    "Find Output Tab": "查找输出标签",
    "Filter": "筛选",
    "Refresh": "刷新",
    "Pending": "等待",
    "Loading": "加载中",
    "Loaded": "已加载",
    "Baking": "执行中",
    "Baked": "已完成",
    "Stale": "已过期",
    "Errored": "出错",
    "Data format": "数据格式",
    "Encryption / Encoding": "加密 / 编码",
    "Public Key": "公钥",
    "Arithmetic / Logic": "算术 / 逻辑",
    "Networking": "网络",
    "Utils": "实用工具",
    "Date / Time": "日期 / 时间",
    "Extractors": "提取器",
    "Compression": "压缩",
    "Hashing": "哈希",
    "Code": "代码",
    "Multimedia": "多媒体",
    "Other": "其他",
    "Flow control": "流程控制",
    "Forensics": "取证",
    "Bletchley": "Bletchley",
    "Charts": "图表",
    "Regex": "正则表达式",
    "PGP": "PGP",
    "Shellcode": "Shellcode",
    "OCR": "OCR",
    "Access the complete LapCry operations library in the desktop workspace.": "在 LapCry 桌面工作区中使用完整的操作库。",
    "About LapCry": "关于 LapCry",
    "Copied raw output successfully.": "已成功复制原始输出。",
    "Creator: Bin9chn": "创作人：Bin9chn",
    "Licensed under Apache License 2.0.": "基于 Apache License 2.0 许可。",
    "Custom JavaScript": "自定义 JavaScript",
    "Custom functions": "自定义函数",
    "Save named JavaScript functions locally, then add them to the recipe. Network APIs are disabled.": "在本机保存具名 JavaScript 函数，并可加入配方执行。自定义函数中禁止访问网络。",
    "Saved functions": "已保存函数",
    "Function name": "函数名称",
    "Timeout (ms)": "超时时间（毫秒）",
    "Function body": "函数体",
    "New": "新建",
    "Save function": "保存函数",
    "Add to recipe": "加入配方",
    "Delete": "删除",
    "Select a saved function or create a new one.": "请选择一个已保存函数，或新建函数。",
    "Custom function saved.": "自定义函数已保存。",
    "Custom function deleted.": "自定义函数已删除。",
    "Custom function added to the recipe.": "自定义函数已加入配方。",
    "No saved functions": "暂无已保存函数",
    "Untitled function": "未命名函数",
    "Custom function name is required.": "必须填写自定义函数名称。",
    "Custom function body is required.": "必须填写自定义函数体。",
    "Timeout must be between 1 and 30000 ms.": "超时时间必须在 1 至 30000 毫秒之间。",
    "Unable to save custom functions in this browser.": "当前浏览器无法保存自定义函数。",
    "FAQs": "常见问题",
    "Report a bug": "问题反馈",
    "About": "关于",
    "Keybindings": "快捷键",
    "FAQ pane": "常见问题",
    "Answers to common LapCry questions.": "汇总 LapCry 的常见问题与解答。",
    "How does X feature work?": "某项功能如何使用？",
    "LapCry has contextual help. Hover over a control and press": "LapCry 提供上下文帮助。将鼠标悬停在控件上并按下",
    "to read more about it.": "即可了解更多。",
    "What can I do with LapCry?": "LapCry 可以做什么？",
    "LapCry provides": "LapCry 提供",
    "hundreds of": "数百种",
    "local operations for encoding, encryption, compression, parsing and analysis. Here are some examples:": "本地操作，涵盖编码、加密、压缩、解析与分析。以下是一些示例：",
    "Decode a Base64-encoded string": "解码 Base64 字符串",
    "Convert a date and time to a different time zone": "将日期时间转换为其他时区",
    "Parse a Teredo IPv6 address": "解析 Teredo IPv6 地址",
    "Convert data from a hexdump, then decompress": "将十六进制转储转换为数据并解压",
    "Decrypt and disassemble shellcode": "解密并反汇编 Shellcode",
    "Display multiple timestamps as full dates": "将多个时间戳显示为完整日期",
    "Carry out different operations on data of different types": "针对不同类型的数据执行相应操作",
    "Use parts of the input as arguments to operations": "使用输入中的部分内容作为操作参数",
    "Can I load input directly from files?": "可以直接从文件加载输入吗？",
    "Yes! Just drag your file over the input box and drop it.": "可以。将文件拖到输入框并松开即可。",
    "LapCry can load large files, subject to available memory and CPU. Large inputs may take longer to process.": "LapCry 可加载大文件，具体取决于可用内存与处理器性能。大型输入的处理时间可能更长。",
    "If the output is larger than a certain threshold (default": "如果输出超过阈值（默认",
    "), it will be presented to you as a file available for download. Slices of the file can be viewed in the output if you need to inspect them.": "），则会生成可下载的文件。如需检查内容，可在输出面板中查看文件片段。",
    "How do I run operation X over multiple inputs at once?": "如何一次性对多个输入执行某个操作？",
    "Maybe you have 10 timestamps that you want to parse or 16 encoded strings that all have the same key.": "例如，你需要解析 10 个时间戳，或解密 16 个使用相同密钥的编码字符串。",
    "The 'Fork' operation (found in the 'Flow control' category) splits up the input line by line and runs all subsequent operations on each line separately. Each output is then displayed on a separate line. These delimiters can be changed, so if your inputs are separated by commas, you can change the split delimiter to a comma instead.": "“Fork”操作（位于“流程控制”分类）会按行拆分输入，并对每一行分别执行后续操作，结果按行输出。分隔符可以修改，例如输入以逗号分隔时，可将拆分分隔符改为逗号。",
    "Click here": "查看示例",
    "for an example.": "。",
    "How does the 'Magic' operation work?": "Magic 操作如何工作？",
    "Magic uses several detection strategies to suggest operations that may make sense of encoded data.": "Magic 会综合多种检测策略，推荐可能适用于当前编码数据的操作。",
    "Include a clear description, reproduction steps, input sample and the diagnostics below when reporting a problem to Bin9chn.": "向 Bin9chn 反馈问题时，请附上清晰描述、复现步骤、输入样例以及下方诊断信息。",
    "LapCry is a local-first desktop data workbench for encoding, encryption, compression, parsing, extraction and analysis.": "LapCry 是一款本地优先的桌面数据处理工作台，支持编码、加密、压缩、解析、提取与分析。",
    "Creator": "创作人",
    "Created and maintained by Bin9chn. Copyright 2026 Bin9chn.": "由 Bin9chn 创作与维护。版权所有 © 2026 Bin9chn。",
    "Privacy": "隐私",
    "Core operations run locally. LapCry does not provide cloud storage, telemetry or online translation. Operations that intentionally make network requests are described in the download and security documentation.": "核心操作均在本地运行。LapCry 不提供云存储、遥测或在线翻译。会主动发起网络请求的操作已在下载说明与安全文档中标注。",
    "Rebuilt the workspace as a floating liquid-glass space interface with a compact pipeline header.": "将工作区重构为悬浮液态玻璃太空界面，并采用紧凑的管线标题栏。",
    "Refined the floating liquid-glass hierarchy and reduced idle pipeline height.": "优化悬浮液态玻璃层次，并降低空闲状态下的配方区域高度。",
    "Compacted recipe cards, improved dense layouts, and polished interaction details.": "压缩配方卡片高度，优化密集布局与交互细节。",
    "Fixed recipe argument label alignment and control overflow, and refined compact layout details.": "修复配方参数标签错位与控件溢出，优化紧凑布局细节。",
    "Fixed native window sizing, minimize, maximize, restore and close behavior on smaller displays.": "修复小屏幕下桌面窗口的尺寸、最小化、最大化、还原与关闭行为。",
    "Tightened the recipe cards, added a resizable pipeline, and fixed the input status bar with several tabs open.": "收紧配方卡片，新增可调节管线布局，并修复多输入标签下的状态栏显示。",
    "License": "许可",
    "Released under the Apache License, Version 2.0. Third-party notices are available in THIRD_PARTY_NOTICES.md.": "基于 Apache License 2.0 发布，第三方许可信息见 THIRD_PARTY_NOTICES.md。",
    "LapCry © 2026 Bin9chn.": "LapCry © 2026 Bin9chn。",
    "LapCry © 2026 Bin9chn": "LapCry © 2026 Bin9chn",
    "Download LapCry": "下载 LapCry",
    "LapCry runs entirely on this device. Input data and recipe configuration are not sent to a LapCry service.": "LapCry 完全在本设备上运行，输入数据与配方配置不会发送到 LapCry 服务。",
    "Some built-in operations intentionally contact external services, including Show on map, DNS over HTTPS and HTTP request. Custom JavaScript blocks network APIs. All other local operations run without uploading input or recipes.": "部分内置操作会有意访问外部服务，例如“在地图上显示”“DNS over HTTPS”和“HTTP 请求”。自定义 JavaScript 禁止访问网络 API。其他本地操作均不会上传输入或配方。",
    "This package contains the standalone web build of the LapCry data workbench for offline use or internal hosting.": "此软件包包含 LapCry 数据处理工作台的独立 Web 版本，可用于离线运行或内部部署。",
    "The standalone build does not update itself. Download a newer release to receive fixes and new operations.": "独立版本不会自动更新。请下载新版本以获取修复与新增操作。",
    "Build time:": "构建时间：",
    "Third-party notices are included with the release package.": "发布包中包含第三方许可信息。",
    "Released under the Apache Licence, Version 2.0": "基于 Apache License 2.0 发布",
    "SHA256 hash: DOWNLOAD_HASH_PLACEHOLDER": "SHA256 校验值：DOWNLOAD_HASH_PLACEHOLDER",
    "Download ZIP file": "下载 ZIP 压缩包",
    "Go to tab": "转到标签页",
    "Find tab": "查找标签页",
    "Close all tabs": "关闭全部标签页",
    "Content": "内容",
    "Filename": "文件名",
    "Results": "结果",
    "Load Status": "加载状态",
    "Bake Status": "执行状态",
    "Number of results": "结果数量",
    "Filter (regex)": "筛选（正则表达式）",
    "Content filter (regex)": "内容筛选（正则表达式）",
    "Step through the recipe": "逐步执行配方",
    "Run the current recipe against the input data.": "使用当前输入数据执行配方。",
    "Automatically run the recipe when the input or recipe changes.": "当输入或配方发生变化时自动执行。",
    "Hiding every Operation's argument view in a Recipe": "隐藏配方中所有操作的参数",
    "Saving a recipe": "保存配方",
    "Loading a recipe": "加载配方",
    "Clearing a recipe": "清空配方",
    "Searching for operations": "搜索操作",
    "Recipe pipeline": "配方管线",
    "Input pane": "输入面板",
    "Output pane": "输出面板",
    "Opening a file": "打开文件",
    "Opening a folder": "打开文件夹",
    "Clearing the Input and Output": "清空输入与输出",
    "Resetting the pane layout": "重置面板布局",
    "Saving output to a file": "保存输出到文件",
    "Saving all outputs to a zip file": "将所有输出保存为 ZIP",
    "Copying raw output to the clipboard": "复制原始输出到剪贴板",
    "Replacing input with output": "使用输出替换输入",
    "Maximising the Output pane": "最大化输出面板",
    "Magic detection": "Magic 检测",
    "Staleness indicator": "过期状态指示器",
    "Tabs": "标签页",
};

const CATEGORY_LABELS = {
    "LapCry": "LapCry 自定义",
    "Data format": ZH["Data format"],
    "Encryption / Encoding": ZH["Encryption / Encoding"],
    "Public Key": ZH["Public Key"],
    "Arithmetic / Logic": ZH["Arithmetic / Logic"],
    "Networking": ZH.Networking,
    "Language": ZH.Language,
    "Utils": ZH.Utils,
    "Date / Time": ZH["Date / Time"],
    "Extractors": ZH.Extractors,
    "Compression": ZH.Compression,
    "Hashing": ZH.Hashing,
    "Code": ZH.Code,
    "Multimedia": ZH.Multimedia,
    "Other": ZH.Other,
    "Flow control": ZH["Flow control"],
    "Forensics": ZH.Forensics,
    "Bletchley": ZH.Bletchley,
    "Charts": ZH.Charts,
    "Regex": ZH.Regex,
    "PGP": ZH.PGP,
    "Shellcode": ZH.Shellcode,
    "OCR": ZH.OCR,
    "Favourites": "收藏",
    "Edit Favourites": "编辑收藏",
    "Edit favourites": "编辑收藏",
    "To add:": "添加：",
    "To reorder:": "排序：",
    "To remove:": "移除：",
    "drag the operation over the favourites category and drop it": "将操作拖到收藏分类上并松开即可添加",
    "drag up and down in the list below": "在下方列表中上下拖动即可排序",
    "hit the delete button or drag out of the list below": "点击删除按钮，或将条目拖出下方列表即可移除",
    "Reset favourites to default": "恢复默认收藏",
    "User Agent": "User Agent"
};

const SKIP_SELECTOR = [
    "#input-text",
    "#output-text",
    "#rec-list",
    ".ingredients",
    ".op-list",
    "#search-results",
    "pre",
    "code",
    "textarea",
    "[contenteditable='true']",
    "[data-i18n-ignore]"
].join(",");

/**
 * Returns the active locale.
 * @returns {string}
 */
export function getLocale() {
    return currentLocale;
}

/**
 * Reads LapCry settings from local storage.
 * @returns {Object}
 */
export function getStoredSettings() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (err) {
        return {};
    }
}

/**
 * Persists a partial settings object.
 * @param {Object} settings
 */
export function saveSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.assign({}, getStoredSettings(), settings)));
    } catch (err) {
        // Local storage may be unavailable in hardened environments.
    }
}

/**
 * Normalises a stored locale value.
 * @param {string} locale
 * @returns {string}
 */
export function normaliseLocale(locale) {
    let normalised = locale;
    if (locale === "en") normalised = "en-US";
    if (locale === "zh") normalised = "zh-CN";
    return SUPPORTED_LOCALES.includes(normalised) ? normalised : DEFAULT_LOCALE;
}

/**
 * Returns a category label for the active locale.
 * @param {string} category
 * @returns {string}
 */
export function categoryLabel(category) {
    if (currentLocale !== "zh-CN") return category;
    return CATEGORY_LABELS[category] || category;
}

/**
 * Returns the display label for an operation. The canonical English name is
 * still what recipe serialisation, drag and drop and deep links use.
 * @param {string} name - Canonical operation name
 * @returns {string}
 */
export function operationLabel(name) {
    if (currentLocale !== "zh-CN") return name;
    return ZH_OPERATIONS[name] || name;
}


/**
 * Returns the localised hover description for an operation. The canonical
 * English description remains the fallback for untranslated entries.
 * @param {string} name - Canonical operation name
 * @param {string} fallback - Canonical English description
 * @returns {string}
 */
export function operationDescription(name, fallback) {
    if (currentLocale !== "zh-CN") return fallback;
    return ZH_DESCRIPTIONS[name] || fallback;
}

/**
 * Translates a known phrase.
 * @param {string} phrase
 * @param {string} [locale]
 * @returns {string}
 */
export function translatePhrase(phrase, locale=currentLocale) {
    if (locale !== "zh-CN") return phrase;
    return ZH[phrase] || phrase;
}

/**
 * Applies a locale to the document and starts observing future UI updates.
 * @param {string} locale
 */
export function applyLocale(locale) {
    currentLocale = normaliseLocale(locale);
    document.documentElement.lang = currentLocale;
    saveSettings({language: currentLocale});
    applyingLocale = true;
    translateTree(document.body);
    translateAttributes(document);
    applyingLocale = false;

    if (!observer && document.body) {
        observer = new MutationObserver(mutations => {
            if (applyingLocale) return;
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        translateTextNode(node);
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        translateTree(node);
                        translateAttributes(node);
                    }
                }
                if (mutation.type === "characterData") {
                    translateTextNode(mutation.target);
                }
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    document.dispatchEvent(new CustomEvent("lapcrylocalechange", {
        detail: {locale: currentLocale}
    }));
}

/**
 * Applies settings found in localStorage before the app is built.
 */
export function initialiseI18n() {
    const settings = getStoredSettings();
    let options = {};
    try {
        options = JSON.parse(localStorage.getItem("options") || "{}");
    } catch (err) {
        options = {};
    }
    applyLocale(settings.language || options.language || DEFAULT_LOCALE);
}

/**
 * Checks whether a node belongs to user data or an operation identifier.
 * @param {Node} node
 * @returns {boolean}
 */
function isSkipped(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element || typeof element.closest !== "function") return false;
    return Boolean(element.closest(SKIP_SELECTOR));
}

/**
 * Recursively translates text nodes in an element subtree.
 * @param {Node} root
 */
function translateTree(root) {
    if (!root || isSkipped(root)) return;

    if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root);
        return;
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
        translateTextNode(node);
        node = walker.nextNode();
    }
}

/**
 * Translates one text node while preserving surrounding whitespace.
 * @param {Node} node
 */
function translateTextNode(node) {
    if (!node || isSkipped(node)) return;

    if (!originals.has(node)) {
        originals.set(node, node.nodeValue);
    }

    const original = originals.get(node);
    if (!original || !original.trim()) return;

    const leading = original.match(/^\s*/)[0];
    const trailing = original.match(/\s*$/)[0];
    const phrase = original.trim();
    const translated = translatePhrase(phrase);
    const nextValue = translated === phrase ? original : leading + translated + trailing;
    if (node.nodeValue !== nextValue) {
        node.nodeValue = nextValue;
    }
}

/**
 * Translates common HTML attributes.
 * @param {Node} root
 */
function translateAttributes(root) {
    if (!root || !root.querySelectorAll) return;
    const selectors = ["[title]", "[placeholder]", "[aria-label]", "[data-help-title]", "[data-help]"];

    for (const selector of selectors) {
        root.querySelectorAll(selector).forEach(element => {
            if (element.closest("[data-i18n-ignore]")) return;

            if (!attributeOriginals.has(element)) {
                attributeOriginals.set(element, {});
            }
            const stored = attributeOriginals.get(element);
            for (const attribute of ["title", "placeholder", "aria-label", "data-help-title", "data-help"]) {
                if (!element.hasAttribute(attribute)) continue;
                if (!(attribute in stored)) stored[attribute] = element.getAttribute(attribute);
                const original = stored[attribute];
                const translated = translatePhrase(original);
                if (element.getAttribute(attribute) !== translated) {
                    element.setAttribute(attribute, translated);
                }
            }
        });
    }
}
