const { stat } = require('fs/promises');
const puppeteer = require('puppeteer');

const divData = {}

const financials_url = 'https://finance.yahoo.com/quote/BBY/financials?p=BBY';
const statistics_url = 'https://finance.yahoo.com/quote/BBY/key-statistics?p=BBY';
const insider_url = 'https://finance.yahoo.com/quote/BBY/insider-transactions?p=BBY';
const dividendGrowthURL = 'https://www.digrin.com/stocks/detail/BBY/';


async function scrapeDividend(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const navigationPromise = page.waitForNavigation({waitUntil: "domcontentloaded"});
    await page.goto(url);
    
    await navigationPromise;
    await page.waitForXPath('/html/body/div[1]/div[2]/div[2]/p[24]/span/strong');

    await navigationPromise;
    const [el] = await page.$x('/html/body/div[1]/div[2]/div[2]/p[24]/span/strong');

    const txt = await el.getProperty('textContent');
    let data = await txt.jsonValue();
    data = data.replace('%', '')
    data = data/100

    // browser.close();
    return data;
}

(async () => {
    try {
        const s = await scrapeDividend(dividendGrowthURL)
        console.log(s)
    } catch (error) {
        console.log(error)
        // await browser.close();
    }
 })()

