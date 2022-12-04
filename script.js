const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const { stat } = require('fs/promises');
const { resolve } = require('path');



let ticker = "";

const scrape = async (browser, url, paths) => {
    const page = await browser.newPage();
    const navigationPromise = page.waitForNavigation({
        waitUntil: "domcontentloaded",
    });
    await page.goto(url);
    await page.setDefaultNavigationTimeout(0);
    await navigationPromise;
    return Promise.all(
        paths.map(async (p) =>
            (await page.waitForXPath(p)).evaluate((e) => e.textContent)
        )
    );
};

const app = express();

app.set("view engine", 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
})

app.post('/', function(req, res){
    ticker = (req.body.ticker).toUpperCase();
    res.redirect('/object');
})

app.get('/object', function(req, res){
    let browser;
    (async () => {

    const financials_url = `https://finance.yahoo.com/quote/${ticker}/financials?p=${ticker}`;
    const statistics_url = `https://finance.yahoo.com/quote/${ticker}/key-statistics?p=${ticker}`;
    const insider_url = `https://finance.yahoo.com/quote/${ticker}/insider-transactions?p=${ticker}`;
    const dividendGrowthURL = `https://www.digrin.com/stocks/detail/${ticker}/`;

    const yahooFinancePath = ['//*[@id="atomic"]/body/script[1]'];
    const divGrowthPath = ["/html/body/div/div[2]/div[2]/p[24]/span/strong"];

    browser = await puppeteer.launch({ 
        headless: true,
        executablePath: `C:/Program Files/Google/Chrome/Application/chrome.exe`
    });
    const text = await Promise.all([
        scrape(browser, financials_url, yahooFinancePath),
        scrape(browser, statistics_url, yahooFinancePath),
        scrape(browser, insider_url, yahooFinancePath),
        scrape(browser, dividendGrowthURL, divGrowthPath),
    ]);

    const compiledData = [];

    for (let i = 0; i < 3; i++) {
        const start = text[i][0].search("context") - 2;
        const cleanedData = text[i][0].slice(start, -12);
        const json_data = JSON.parse(cleanedData);
        compiledData.push(json_data);
    }
    compiledData.push(text[3][0]);

    const netIncome = [];
    const operatingCashflow = [];
    const cash = [];
    const debtRepaymentRatio = [];

    const annual_is = compiledData[0]['context']['dispatcher']['stores']['QuoteSummaryStore']['incomeStatementHistory']['incomeStatementHistory'].reverse();

    // net income
    annual_is.forEach(e => {
        netIncome.push({
            'year': e['endDate']['fmt'].split('-')[0],
            'netIncome': e['netIncome']['raw']
        });
    })

    // debt repayment capacity
    annual_is.forEach(e => {
        const netIncome = e['netIncome']['raw'];
        const interestExpense = Math.abs(e['interestExpense']['raw']/1000);
        const endDate = e['endDate']['fmt'].split('-')[0];

        debtRepaymentRatio.push({
                    'year': endDate,
                    'debtRepaymentRatio': Math.round((netIncome/interestExpense) * 100) / 100
        })
    })

    const annual_bs = compiledData[0]['context']['dispatcher']['stores']['QuoteSummaryStore']['balanceSheetHistory']['balanceSheetStatements'].reverse();

    // cash & cash equivalents
    annual_bs.forEach(e => {
        cash.push({
            'year': e['endDate']['fmt'].split('-')[0],
            'cash': e['cash']['raw']
        })
    })

    const annual_cf = compiledData[0]['context']['dispatcher']['stores']['QuoteSummaryStore']['cashflowStatementHistory']['cashflowStatements'].reverse();

    // operating cashflow
    annual_cf.forEach(e => {
        operatingCashflow.push({
            'year': e['endDate']['fmt'].split('-')[0],
            'operatingCashflow': e['totalCashFromOperatingActivities']['raw']
        })
    })

    // dividend yield
    const divYield = compiledData[1]['context']['dispatcher']['stores']['QuoteSummaryStore']['summaryDetail']['trailingAnnualDividendYield']['raw']

    // dividend growth
    const divGrowth = compiledData[3].replace('%', '')/100

    // dividend payout ratio
    const divPayoutRatio = compiledData[1]['context']['dispatcher']['stores']['QuoteSummaryStore']['summaryDetail']['payoutRatio']['raw']

    // dividend return on equity
    const returnOnEquity = compiledData[1]['context']['dispatcher']['stores']['QuoteSummaryStore']['financialData']['returnOnEquity']['raw']

    // insider action statistics
    const purchases = compiledData[2]['context']['dispatcher']['stores']['QuoteSummaryStore']['netSharePurchaseActivity']['buyInfoCount']['raw']
    const purchaseVolume = compiledData[2]['context']['dispatcher']['stores']['QuoteSummaryStore']['netSharePurchaseActivity']['buyInfoShares']['raw']
    const sales = compiledData[2]['context']['dispatcher']['stores']['QuoteSummaryStore']['netSharePurchaseActivity']['sellInfoCount']['raw']

    let salesVolume = 'N/A';
    try {
        salesVolume = compiledData[2]['context']['dispatcher']['stores']['QuoteSummaryStore']['netSharePurchaseActivity']['sellInfoShares']['raw']
    } catch (error) {

    }

    const held = compiledData[2]['context']['dispatcher']['stores']['QuoteSummaryStore']['netSharePurchaseActivity']['totalInsiderShares']['raw']
    const sharesPercentSold = compiledData[2]['context']['dispatcher']['stores']['QuoteSummaryStore']['netSharePurchaseActivity']['netPercentInsiderShares']['raw']

    const insiderAction = {
        'purchase': {
            'transactions': purchases,
            'volume': purchaseVolume
        },
        'sales': {
            'transactions': sales,
            'volume': salesVolume
        },
        'held': held,
        'sharesPercentSold': sharesPercentSold
    }

    // scraped dividend data as JSON object
    const divData = {
        'netIncome': netIncome,
        'operatingCashflow': operatingCashflow,
        'cash': cash,
        'debtRepaymentRatio': debtRepaymentRatio,
        'divYield': divYield,
        'divGrowth': divGrowth,
        'divPayoutRatio': divPayoutRatio,
        'returnOnEquity': returnOnEquity,
        'insiderAction': insiderAction
    }

    console.log(divData)

    res.render('divStats', {
        ticker: ticker,
        netIncome: divData['netIncome'],
        operatingCashflow: divData['operatingCashflow'],
        cash: divData['cash'],
        debtRepaymentRatio: divData['debtRepaymentRatio'],
        divYield: divData['divYield'],
        divGrowth: divData['divGrowth'],
        divPayoutRatio: divData['divPayoutRatio'],
        returnOnEquity: divData['returnOnEquity'],
        insiderAction: divData['insiderAction']
    })
 })()
})

app.listen(3000, function() {
    console.log('Listening to port 3000');
});