import axios from 'axios';
import bluebird from 'bluebird';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import format from 'pg-format';
import type { Browser, Page } from 'puppeteer-core';
import albumSchema from '../models/album';

type AlbumItem = [string, string, string, string, string, string];
type WithBrowserFN = (browser: Browser, urls: string[]) => Promise<AlbumItem[]>;
type WithPageFN = (page: Page) => Promise<AlbumItem>;
type AlbumEntry = FromSchema<typeof albumSchema>;
type QueryParams = {
  mode?: string;
  pageNum: number;
};

const isLambdaRuntime = Boolean(
  process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT || process.env.AWS_EXECUTION_ENV,
);

const DEFAULT_VIEWPORT = {
  deviceScaleFactor: 1,
  hasTouch: false,
  height: 1080,
  isLandscape: true,
  isMobile: false,
  width: 1920,
};

type LambdaChromium = {
  args: string[];
  executablePath: () => Promise<string>;
};

type PuppeteerCoreModule = {
  launch: (options: Record<string, unknown>) => Promise<Browser>;
  defaultArgs: (options: Record<string, unknown>) => Promise<string[]>;
};

const dynamicImport = new Function('specifier', 'return import(specifier);') as (specifier: string) => Promise<any>;

async function loadLambdaChromium(): Promise<LambdaChromium> {
  const chromiumModule = await dynamicImport('@sparticuz/chromium');
  return (chromiumModule.default ?? chromiumModule) as LambdaChromium;
}

async function loadPuppeteerCore(): Promise<PuppeteerCoreModule> {
  const puppeteerCoreModule = await dynamicImport('puppeteer-core');
  return (puppeteerCoreModule.default ?? puppeteerCoreModule) as PuppeteerCoreModule;
}

async function launchLambdaBrowser(): Promise<Browser> {
  const chromium = await loadLambdaChromium();
  const puppeteerCore = await loadPuppeteerCore();

  return puppeteerCore.launch({
    args: await puppeteerCore.defaultArgs({
      args: chromium.args,
      headless: 'shell',
    }),
    defaultViewport: DEFAULT_VIEWPORT,
    executablePath: await chromium.executablePath(),
    headless: 'shell',
    ignoreHTTPSErrors: true,
  });
}

const getPuppeteer = async (): Promise<Browser> => {
  try {
    if (isLambdaRuntime) {
      return await launchLambdaBrowser();
    }

    const puppeteer = require('puppeteer');
    return await puppeteer.launch();
  } catch (error: any) {
    if (!isLambdaRuntime && error.code === 'MODULE_NOT_FOUND') {
      console.info('Local puppeteer is unavailable, falling back to the Lambda browser launcher.');
      return await launchLambdaBrowser();
    }

    throw error;
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

async function withBrowser(fastify: FastifyInstance, pageNum: number, fn: WithBrowserFN, mode?: string) {
  const browser = await getPuppeteer();
  try {
    const page = await browser.newPage();
    try {
      await page.goto(`${fastify.config.PAGE}/page/${pageNum}`, {
        waitUntil: 'load',
        timeout: 0,
      });
      let products: string[] = await page.$$eval(fastify.config.PRODUCT_LINK, (list) =>
        list.map((el) => (el as HTMLAnchorElement).href),
      );

      if (!products?.length) {
        throw new Error(`No product links were found on ${fastify.config.PAGE}/page/${pageNum}.`);
      }

      if (mode === 'test') {
        // when it's test mode, it's just for checking out whether website's crawling points are valid, just process for the first detail page due to saving time
        products = [products[0]];
        console.log("it's on test mode!");
      }

      console.log({ products });

      return await fn(browser, products);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
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

async function extractSampleAudioInfo(fastify: FastifyInstance, pageNum: number, mode?: string): Promise<AlbumItem[]> {
  const results = await withBrowser(
    fastify,
    pageNum,
    async (browser: Browser, urls: string[]) => {
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
              const urlArr = url?.split('/');
              id = urlArr?.length > 2 ? urlArr[urlArr.length - 2] : '';
              track_title = await audioEvent.$eval(fastify.config.TRACK_TITLE, (el) => el.textContent ?? '');

              const productTopArea = await page.$(fastify.config.ALBUM_INFO);
              if (productTopArea) {
                album_title = await productTopArea.$eval(fastify.config.ALBUM_TITLE, (el) => el.textContent ?? '');
                album_artist = await productTopArea.$eval(fastify.config.ALBUM_ARTIST, (el) => el.textContent ?? '');
                const album_image_1000 = await productTopArea.$$eval(
                  fastify.config.ALBUM_IMAGE,
                  (els) => (els[0] as HTMLAnchorElement).href,
                );
                // change source size
                album_image = album_image_1000.replace('_1000', '_300');
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
    },
    mode,
  );
  // filter out items without sample audio
  return results?.filter(([id]) => !!id) ?? [];
}

async function postToSlack(fastify: FastifyInstance, mode?: string, rows?: AlbumEntry[], err?: Error) {
  let text = '';
  let color = 'good';
  if (!!rows) {
    const rowCount = rows?.length ?? 0;

    text = `완료: 총 ${rowCount}개의 엔트리 추가${!!rowCount ? `:\n${rows?.map(({ id }) => id).join('\n')}` : ''}`;
    if (mode === 'test') {
      text = '테스트 완료';
    }
  } else if (err) {
    text = `${mode === 'test' ? '테스트 ' : ''}에러발생: ${err}`;
    color = 'danger';
  }
  try {
    const res = await axios.post(fastify.config.SLACK_WEBHOOK, {
      attachments: [
        {
          text,
          color,
        },
      ],
    });
    console.log({ res });
    console.log(`slack sent`);
  } catch (err) {
    console.warn(`slack message err: ${err}`);
    await postToSlack(fastify, mode, undefined, err as Error);
  }
}

const sync: FastifyPluginAsync = async (fastify) => {
  fastify.get('/sync', { schema }, async (req) => {
    const { mode, pageNum = 1 } = req.query as QueryParams;
    const client = await fastify.pg.connect();
    const filteredResults = await extractSampleAudioInfo(fastify, pageNum, mode);
    console.log({ filteredResults, mode });

    if (!filteredResults.length) {
      postToSlack(fastify, mode, []);
      return { rows: [], rowCount: 0 };
    }

    try {
      const query = format(fastify.config.INSERT_QUERY, filteredResults);
      const { rows, rowCount } = await client.query<AlbumEntry>(query);
      console.log({ query, rows, rowCount });
      await postToSlack(fastify, mode, rows);
      return { rows, rowCount };
    } catch (err) {
      await postToSlack(fastify, mode, undefined, err as Error);
    } finally {
      client.release();
    }
  });
};

export default sync;
