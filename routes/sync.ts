import bluebird from "bluebird";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Pool } from "pg";
import format from "pg-format";
import puppeteer, { type Browser, type Page } from "puppeteer";
import envVarTypeResolver from "../utils";

type AlbumItem = [string, string, string, string, string, string];
type WithBrowserFN = (browser: Browser, urls: string[]) => Promise<AlbumItem[]>;
type WithPageFN = (page: Page) => Promise<AlbumItem>;

async function withBrowser(fn: WithBrowserFN) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(process.env.PAGE ?? "");
  const products: string[] = await page.$$eval(
    envVarTypeResolver("PRODUCT_LINK"),
    (list) => list.map((el) => (el as HTMLAnchorElement).href)
  );
  console.log({ products });
  page.close();

  try {
    return await fn(browser, products);
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

async function extractSampleAudioInfo(): Promise<AlbumItem[]> {
  const results = await withBrowser(
    async (browser: Browser, urls: string[]) => {
      return bluebird.map(
        urls,
        async (url) => {
          return withPage(browser)(async (page: Page) => {
            await page.goto(url, {
              waitUntil: "load",
              timeout: 0,
            });
            let id = "";
            let sample_url = "";
            let album_title = "";
            let album_artist = "";
            let album_image = "";
            let track_title = "";

            const audioEvent = await page.$(envVarTypeResolver("AUDIO_PLAYER"));
            if (audioEvent) {
              sample_url = await audioEvent!.$eval(
                envVarTypeResolver("AUDIO"),
                (el) => (el as HTMLAudioElement).src
              );
              id = url.split("/").at(-2) as string;
              track_title = await audioEvent!.$eval(
                envVarTypeResolver("TRACK_TITLE"),
                (el) => el.textContent ?? ""
              );

              const productTopArea = await page.$(
                envVarTypeResolver("ALBUM_INFO")
              );
              if (productTopArea) {
                album_title = await productTopArea!.$eval(
                  envVarTypeResolver("ALBUM_TITLE"),
                  (el) => el.textContent ?? ""
                );
                album_artist = await productTopArea!.$eval(
                  envVarTypeResolver("ALBUM_ARTIST"),
                  (el) => el.textContent ?? ""
                );
                album_image = await productTopArea!.$$eval(
                  envVarTypeResolver("ALBUM_IMAGE"),
                  (els) => (els[0] as HTMLAnchorElement).href
                );
              }
              console.log({
                id,
                url,
                track_title,
                album_title,
                album_artist,
                album_image,
                sample_url,
              });
            }
            return [
              id,
              sample_url,
              album_title,
              album_artist,
              album_image,
              track_title,
            ];
          });
        },
        { concurrency: 3 }
      );
    }
  );

  // filter out items without sample audio
  return results.filter(([id]) => !!id);
}

async function pgInsert(queryValues: AlbumItem[]) {
  const pool = new Pool();
  const query = format(envVarTypeResolver("INSERT_QUERY"), queryValues);
  const res = await pool.query(query);
  console.log({ res });
  await pool.end();
  return { rows: res.rowCount };
}

module.exports = {
  path: "/sync",
  method: "GET",
  handler: async (_req: FastifyRequest, _reply: FastifyReply) => {
    const filteredResults = await extractSampleAudioInfo();
    console.log({ filteredResults });
    return await pgInsert(filteredResults);
  },
};
