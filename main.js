const puppeteer = require("puppeteer");
const winston = require("winston");

const Attack = require('./lib/attack');
const PSError = require("./lib/ps_error");

// TODO: code coverage
// TODO: implement user agent/cookies setting 
// TODO: iframes
// TODO: may get cookies for other urls

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console()
    ]
});

if (process.env.URL == null) {
    logger.warn('you need an entrypoint url');
    process.exit();
}

if (process.env.ASSETS == null) {
    logger.warn('you need an assets folder to save screenshots to');
    process.exit(); 
}

const path = process.env.ASSETS;
const url = process.env.URL;

(async () => {
    const browser = await puppeteer.launch();
    try {
        logger.info(`initiating page acquisition for ${url}`)
        const attack = await summarizeAttack(browser, url, path);
        attack.children.forEach((child) => {
            console.log(child.url);
        });
    } catch(e) {
        logger.warn("error: ", e);
    } finally {
        await browser.close();
    }
})();

const summarizeAttack = async (browser, url, path) => {
    const attack = await gatherPageData(browser, url, path);

    await Promise.all(attack.requests.map(async (req) => {
        logger.info(`=> fetching ${req}`);
        const child = await gatherPageData(browser, req, path);
        attack.addChild(child);
    }));

    return attack;
};


const gatherPageData = async (browser, url, path) => {
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    const requests = [];
    page.on('request', async req => {
        requests.push(req.url());
        req.continue();
    });

    const securityCerts = [];
    page.on('response', async resp => {
        const sec = resp.securityDetails();
        if (sec != null) {
            securityCerts.push({
                subjectName: sec.subjectName(),
                issuer: sec.issuer(),
                validFrom: sec.validFrom(),
                validTo: sec.validTo(),
                protocol: sec.protocol()
            });
        }
    });

    try {
        await page.goto(url, { waitUntil: 'networkidle2'});
        const pageData = await page.evaluate(() => {

            const links = Array.from(document.querySelectorAll("link"), (link) => {
                return {
                    rel: link.rel,
                    href: link.href
                };
            });

            const jsFilenames = [];
            const jsCode = [];
            document.querySelectorAll("script").forEach((jsTag) => {
                if (jsTag.src == "") {
                    // inline js; append code
                    jsCode.push(jsTag.text);
                } else {
                    // append filepath to list
                    jsFilenames.push(jsTag.src);
                }
            });

            const phpRefs = Array.from(document.querySelectorAll("form[action]"), (form) => {
                const inputs = Array.from(form.querySelectorAll("input"), (input) => {
                    return {
                        type: input.type,
                        name: input.name
                    };
                });
                return {
                    scriptName: form.action,
                    inputs: inputs,
                    method: form.method,
                    innerText: form.innerText
                };
            });

            return {
                title: document.querySelector("title") ? document.querySelector("title").text : "N/A",
                domain: window.location.hostname,
                path: window.location.pathname,
                links: links,
                javascriptCode: jsCode,
                javascriptFilepaths: jsFilenames,
                phpRefs: phpRefs
            };
        });
        await page.screenshot({path: `${path}/${urlEscapeFull(url)}.png`, fullPage: true});
        
        const cookies = await page.cookies();
        const htmlDump = await page.content();

        return new Attack(urlDeweaponize(url), pageData, requests, securityCerts, cookies, htmlDump)
    } catch (err) {
        throw new PSError(err, 'could not resolve attack');
    }
};


const urlEscapeFull = (url) => {
    return urlDeweaponize(url).replace(/\//gi, "_");
};

const urlDeweaponize = (url) => {
    return url.replace(/\./gi, "[.]");
};