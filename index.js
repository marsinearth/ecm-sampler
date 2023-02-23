const puppeteer = require('puppeteer');
const bluebird = require('bluebird');
const { Pool } = require('pg');
const format = require('pg-format');
require('dotenv').config();

(async () => {
  const withBrowser = async (fn) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://ecmrecords.com/shop/');
    const products = await page.$$eval('a.woocommerce-LoopProduct-link', list => list.map(el => el.href));
    console.log({ products });
    page.close();

    try {
      return await fn(browser, products);
    } finally {
      await browser.close();
    }
  }

  const withPage = (browser) => async (fn) => {
    const page = await browser.newPage();
    try {
      return await fn(page);
    } finally {
      await page.close();
    }
  }

  const results = await withBrowser(async (browser, urls) => {
    return bluebird.map(urls, async (url) => {
      return withPage(browser)(async (page) => {
        await page.goto(url, {
          waitUntil: 'load',
          timeout: 0
        });
        let id = '';
        let sample_url = '';
        let album_title = '';
        let album_artist = '';
        let album_image = '';
        let track_title = '';

        if (await page.$('a.audioPlayerEvent', { timeout: 3000 })) {
          sample_url = await page.$eval('a.audioPlayerEvent audio#voice_play', el => el.src);
          id = url.split('/').at(-2);
          track_title = await page.$eval('a.audioPlayerEvent span.track_title', el => el.textContent);
          album_title = await page.$eval('h1.album_tile', el => el.textContent);
          album_artist = await page.$eval('h2.album_artist', el => el.textContent);
          album_image = await page.$$eval('a.glightbox', els => els[0].href);
          console.log({ id, url, track_title,album_title,album_artist, album_image, sample_url });
        }
        return [id, sample_url, album_title, album_artist, album_image, track_title];
      });
    }, { concurrency: 3 });
  });

  const filteredResults = results.filter(([id]) => !!id);
  console.log({ results, filteredResults });

  const query = format('INSERT INTO sample_links (id, url, album_title, album_artist, album_image, track_title) VALUES %L ON CONFLICT (id) DO NOTHING RETURNING *;', filteredResults);

  const pool = new Pool();
  const res = await pool.query(query);
  console.log({ res });

  await pool.end();
})();