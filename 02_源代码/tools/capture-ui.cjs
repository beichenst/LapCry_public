const path = require("path");
const {Builder, By, until} = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const chromedriver = require("chromedriver");

const url = process.argv[2] || "http://localhost:8000/index.html";
const output = path.resolve(process.argv[3] || "build/ui-check.png");
const width = Number(process.argv[4] || 1440);
const height = Number(process.argv[5] || 900);
const language = process.argv[6] || "zh-CN";
const theme = process.argv[7] || "dark";

(async () => {
    const service = new chrome.ServiceBuilder(chromedriver.path);
    const options = new chrome.Options();
    options.addArguments("--headless=new", `--window-size=${width},${height}`);
    const driver = await new Builder()
        .forBrowser("chrome")
        .setChromeOptions(options)
        .setChromeService(service)
        .build();

    try {
        await driver.get(url);
        await driver.wait(until.elementLocated(By.id("search")), 10000);
        await driver.wait(async () => !(await driver.findElements(By.id("preloader"))).length, 10000);
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
        const recipe = process.env.LAPCRY_RECIPE ? JSON.parse(process.env.LAPCRY_RECIPE) : [];
        if (recipe.length) {
            await driver.executeScript(operations => {
                window.app.setInput("LapCry visual regression input 0123456789");
                operations.forEach(name => window.app.manager.recipe.addOperation(name));
            }, recipe);
        }
        await driver.sleep(700);
        const image = await driver.takeScreenshot();
        require("fs").writeFileSync(output, image, "base64");
        console.log(output);
    } finally {
        await driver.quit();
    }
})().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
