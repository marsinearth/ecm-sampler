/* istanbul ignore file */
import { FromSchema } from 'json-schema-to-ts';
import { test } from 'tap';
import albumSchema from '../../src/models/album';
import build from '../helper';

type Album = FromSchema<typeof albumSchema>;

test('crawl and sync the db', async (t) => {
  const app = await build(t);

  const res = await app.inject({
    method: 'GET',
    url: '/sync',
    query: {
      mode: 'test',
    },
  });

  t.test('when sync has no error', (t) => {
    t.ok(res);
    const payload: { rows: Album[]; rowCount: number } = JSON.parse(res.payload);
    t.test('when rows with additional albums', (t) => {
      t.hasProps(payload, ['rows', 'rowCount']);

      t.test('crawling page has not been changed', (t) => {
        const defectedItems = payload.rows.filter((props) => {
          return Object.values(props).some((val) => !val);
        });
        t.equal(!!defectedItems.length, false);
        t.end();
      });
      t.end();
    });
    t.end();
  });
  t.end();
});
