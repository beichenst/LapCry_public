const {Builder, By, until} = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const chromedriver = require("chromedriver");

const url = process.argv[2] || "http://localhost:8000/index.html";

async function setLocale(driver, language, theme) {
    await driver.executeScript(`
        const settings = JSON.parse(localStorage.getItem("lapcry.settings.v1") || "{}");
        settings.language = arguments[0];
        settings.theme = arguments[1];
        localStorage.setItem("lapcry.settings.v1", JSON.stringify(settings));
        const options = JSON.parse(localStorage.getItem("options") || "{}");
        options.language = arguments[0];
        options.theme = arguments[1];
        localStorage.setItem("options", JSON.stringify(options));
    `, language, theme);
    await driver.navigate().refresh();
    await driver.wait(until.elementLocated(By.id("search")), 10000);
    await driver.wait(async () => !(await driver.findElements(By.id("preloader"))).length, 10000);
}

async function visibleText(driver, selector) {
    const element = await driver.findElement(By.css(selector));
    await driver.wait(until.elementIsVisible(element), 5000);
    return (await element.getText()).replace(/\s+/g, " ").trim();
}

(async () => {
    const service = new chrome.ServiceBuilder(chromedriver.path);
    const options = new chrome.Options();
    options.addArguments("--headless=new", "--window-size=1440,900");
    const driver = await new Builder()
        .forBrowser("chrome")
        .setChromeOptions(options)
        .setChromeService(service)
        .build();

    const checks = [];
    const expect = (name, condition, detail="") => {
        checks.push({name, ok: Boolean(condition), detail});
        if (!condition) console.error(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
        else console.log(`PASS ${name}`);
    };

    try {
        await driver.get(url);
        await setLocale(driver, "zh-CN", "dark");

        await driver.findElement(By.id("search")).sendKeys("Base64");
        const result = await driver.wait(until.elementLocated(By.css("#search-results li.operation")), 5000);
        await driver.actions().move({origin: result}).perform();
        const popover = await driver.wait(until.elementLocated(By.css(".popover-body")), 5000);
        const popoverText = (await popover.getText()).replace(/\s+/g, " ").trim();
        expect("搜索悬停说明已汉化", /编码|解码|Base64/.test(popoverText) && !/This operation|Encodes|Decodes/.test(popoverText), popoverText);

        const supportButton = await driver.findElement(By.id("support"));
        await supportButton.click();
        const supportModal = await driver.wait(until.elementLocated(By.id("support-modal")), 5000);
        await driver.wait(until.elementIsVisible(supportModal), 5000);
        await driver.sleep(400);
        const aboutText = (await supportModal.getText()).replace(/\s+/g, " ").trim();
        expect("关于页中文标题", aboutText.includes("创作人") && aboutText.includes("常见问题") && aboutText.includes("问题反馈"), aboutText.slice(0, 260));
        expect("关于页版本为 v0.0.8", aboutText.includes("v0.0.8"), aboutText.slice(0, 260));

        await driver.findElement(By.css("#tab-3")).click();
        const aboutTabText = await visibleText(driver, "#about");
        expect("关于页中文分节", aboutTabText.includes("创作人") && aboutTabText.includes("隐私") && aboutTabText.includes("迭代记录"), aboutTabText.slice(0, 300));
        expect("关于页来源句子", aboutTabText.includes("LapCry 由 CyberChef 改造而来：转换引擎源自开源项目 CyberChef（Apache-2.0 许可）"), aboutTabText.slice(0, 300));
        expect("关于页来源与版权", /CyberChef/.test(aboutTabText) && /Bin9chn/.test(aboutTabText), aboutTabText.slice(0, 300));

        await driver.sleep(300);
        await driver.findElement(By.css("#support-modal .modal-footer button[data-dismiss='modal']")).click();
        await driver.wait(async () => await driver.executeScript("return getComputedStyle(document.querySelector('#support-modal')).display === 'none'"), 5000);

        const downloadButton = await driver.findElement(By.css("a[data-target='#download-modal']"));
        await downloadButton.click();
        const downloadModal = await driver.wait(until.elementLocated(By.id("download-modal")), 5000);
        await driver.wait(until.elementIsVisible(downloadModal), 5000);
        await driver.sleep(400);
        const downloadText = (await downloadModal.getText()).replace(/\s+/g, " ").trim();
        expect("下载页已汉化", downloadText.includes("构建时间") && downloadText.includes("下载 ZIP 压缩包") && !downloadText.includes("Build time"), downloadText.slice(0, 300));

        await driver.sleep(300);
        await driver.findElement(By.css("#download-modal .modal-footer button[data-dismiss='modal']")).click();
        await driver.wait(async () => await driver.executeScript("return getComputedStyle(document.querySelector('#download-modal')).display === 'none'"), 5000);

        await setLocale(driver, "en-US", "light");
        await driver.findElement(By.id("support")).click();
        const englishModal = await driver.wait(until.elementLocated(By.id("support-modal")), 5000);
        await driver.wait(until.elementIsVisible(englishModal), 5000);
        const englishText = (await englishModal.getText()).replace(/\s+/g, " ").trim();
        expect("英文版保持英文", englishText.includes("Creator: Bin9chn") && /FAQS/i.test(englishText) && !englishText.includes("创作人"), englishText.slice(0, 260));

        const themeClass = await driver.findElement(By.css("html")).getAttribute("class");
        expect("浅色主题已应用", themeClass.includes("light"), themeClass);
    } finally {
        await driver.quit();
    }

    const failed = checks.filter(check => !check.ok);
    console.log(`\nLapCry UI/i18n verification: ${checks.length - failed.length}/${checks.length} passed`);
    if (failed.length) process.exitCode = 1;
})().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
