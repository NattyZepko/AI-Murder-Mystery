import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    page.on('requestfailed', r => console.log('REQUEST FAILED:', r.url(), r.failure()?.errorText));
    page.on('response', r => {
        if (r.status() >= 400) console.log('RESPONSE', r.status(), r.url());
    });

    const url = 'https://ai-murder-mystery-eahla0v7w-natty-zepkos-projects.vercel.app';
    console.log('VISIT', url);
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        console.log('loaded', page.url());

        // click generate button if present
        const generate = await page.$('text=Generate') || await page.$('button:has-text("Generate")') || await page.$('button');
        if (!generate) {
            console.log('Generate button not found');
        } else {
            await generate.click();
            console.log('Clicked generate');
            // wait for some network activity or a clue in the UI
            await page.waitForTimeout(5000);
        }
    } catch (err: any) {
        console.log('ERROR', err.message);
    } finally {
        await browser.close();
    }
})();
