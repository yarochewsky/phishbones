class Attack {
    constructor(url, page, requests, certs, cookies, html) {
        this.url = url;
        this.page = page;
        this.requests = requests;
        this.certs = certs;
        this.cookies = cookies;
        this.htmlDump = html;
    }

    setPage(page) {
        this.page = page;
    }

    addRequest(req) {
        this.request.add(req);
    }

    addCert(cert) {
        this.certs.add(cert);
    }

    addCookie(cookie) {
        this.cookie.add(cookie);
    }

    addChild(attack) {
        if (this.children == null) {
            this.children = new Set();
        }
        this.children.add(attack);
    }

    setHTML(html) {
        this.htmlDump = html;
    }
}

module.exports = Attack;