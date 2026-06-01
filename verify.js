const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'https://100-x-website-project.vercel.app';
const OUT  = '/tmp/pqa/shots';
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  { name: 'homepage_desktop',        url: '/',            vw: 1440, vh: 900  },
  { name: 'homepage_tablet',         url: '/',            vw: 768,  vh: 1024 },
  { name: 'homepage_mobile',         url: '/',            vw: 375,  vh: 812  },
  { name: 'homepage_320',            url: '/',            vw: 320,  vh: 568  },
  { name: 'products_desktop',        url: '/products',    vw: 1440, vh: 900  },
  { name: 'products_mobile',         url: '/products',    vw: 375,  vh: 812  },
  { name: 'spare_parts_desktop',     url: '/spare-parts', vw: 1440, vh: 900  },
  { name: 'spare_parts_mobile',      url: '/spare-parts', vw: 375,  vh: 812  },
  { name: 'blog_desktop',            url: '/blog',        vw: 1440, vh: 900  },
  { name: 'blog_mobile',             url: '/blog',        vw: 375,  vh: 812  },
  { name: 'about_desktop',           url: '/about',       vw: 1440, vh: 900  },
  { name: 'contact_desktop',         url: '/contact-us',  vw: 1440, vh: 900  },
  { name: 'contact_mobile',          url: '/contact-us',  vw: 375,  vh: 812  },
  { name: 'case_studies_desktop',    url: '/case-studies',vw: 1440, vh: 900  },
  { name: 'deployments_desktop',     url: '/deployments', vw: 1440, vh: 900  },
];

(async () => {
  const browser = await chromium.launch();
  const results = [];

  for (const p of PAGES) {
    const ctx  = await browser.newContext({ viewport: { width: p.vw, height: p.vh } });
    const page = await ctx.newPage();
    const url  = BASE + p.url;
    let status = 0, errMsg = '';
    try {
      const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      status = res ? res.status() : 0;
      await page.waitForTimeout(1500);
      const shot = path.join(OUT, `${p.name}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      results.push({ name: p.name, url, status, shot, err: '' });
    } catch(e) {
      errMsg = e.message.slice(0, 120);
      results.push({ name: p.name, url, status, shot: '', err: errMsg });
    }
    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
