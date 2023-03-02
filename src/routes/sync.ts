import bluebird from 'bluebird';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import format from 'pg-format';
import type { Browser, Page } from 'puppeteer-core';

type AlbumItem = [string, string, string, string, string, string];
type WithBrowserFN = (browser: Browser, urls: string[]) => Promise<AlbumItem[]>;
type WithPageFN = (page: Page) => Promise<AlbumItem>;

const getPuppeteer = async (): Promise<Browser | void> => {
  try {
    const puppeteer = require('puppeteer');
    return await puppeteer.launch();
  } catch (error: any) {
    console.log({ error });
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('Error(This package is used for local development) ', JSON.stringify(error, null, 2));
      try {
        const chromium = require('chrome-aws-lambda');
        return await chromium.puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
        });
      } catch (_error) {
        throw error;
      }
    }
  }
};

const schema = {
  response: {
    200: {
      rows: {
        type: 'array',
        items: { $ref: 'album' },
      },
      rowCount: {
        type: 'integer',
      },
    },
  },
};

async function withBrowser(fastify: FastifyInstance, fn: WithBrowserFN) {
  const browser = await getPuppeteer();
  console.log({ browser });
  if (browser) {
    const page = await browser.newPage();
    await page.goto(process.env.PAGE ?? '');
    const products: string[] = await page.$$eval(fastify.config.PRODUCT_LINK, (list) =>
      list.map((el) => (el as HTMLAnchorElement).href),
    );

    if (!products?.length) {
      throw new Error('page has been changed!');
    }

    page.close();

    try {
      return await fn(browser, products);
    } finally {
      await browser.close();
    }
  }
}

function withPage(browser: Browser) {
  return async (fn: WithPageFN) => {
    const page = await browser.newPage();
    try {
      return await fn(page);
    } finally {
      await page.close();
    }
  };
}

async function extractSampleAudioInfo(fastify: FastifyInstance): Promise<AlbumItem[]> {
  const results = await withBrowser(fastify, async (browser: Browser, urls: string[]) => {
    return bluebird.map(
      urls,
      async (url) => {
        return withPage(browser)(async (page: Page) => {
          await page.goto(url, {
            waitUntil: 'load',
            timeout: 0,
          });
          let id = '';
          let sample_url = '';
          let album_title = '';
          let album_artist = '';
          let album_image = '';
          let track_title = '';

          const audioEvent = await page.$(fastify.config.AUDIO_PLAYER);
          if (audioEvent) {
            sample_url = await audioEvent.$eval(fastify.config.AUDIO, (el) => (el as HTMLAudioElement).src);
            id = url.split('/').at(-2) as string;
            track_title = await audioEvent.$eval(fastify.config.TRACK_TITLE, (el) => el.textContent ?? '');

            const productTopArea = await page.$(fastify.config.ALBUM_INFO);
            if (productTopArea) {
              album_title = await productTopArea.$eval(fastify.config.ALBUM_TITLE, (el) => el.textContent ?? '');
              album_artist = await productTopArea.$eval(fastify.config.ALBUM_ARTIST, (el) => el.textContent ?? '');
              album_image = await productTopArea.$$eval(
                fastify.config.ALBUM_IMAGE,
                (els) => (els[0] as HTMLAnchorElement).href,
              );
            } else {
              console.warn(`page structure of album info has been changed on: ${url}`);
            }
          } else {
            console.warn(`no sample music on: ${url}`);
          }
          return [id, sample_url, album_title, album_artist, album_image, track_title];
        });
      },
      { concurrency: 3 },
    );
  });
  // filter out items without sample audio
  return results?.filter(([id]) => !!id) ?? [];
}

const sync: FastifyPluginAsync = async (fastify) => {
  fastify.get('/sync', { schema }, async () => {
    const client = await fastify.pg.connect();
    const filteredResults = await extractSampleAudioInfo(fastify);
    console.log({ filteredResults });

    if (!filteredResults.length) {
      return { rows: [], rowCount: 0 };
    }

    try {
      const query = format(fastify.config.INSERT_QUERY, filteredResults);
      console.log({ query });
      const { rows, rowCount } = await client.query<AlbumItem>(query);
      return { rows, rowCount };
    } finally {
      client.release();
    }
  });
};

export default sync;
