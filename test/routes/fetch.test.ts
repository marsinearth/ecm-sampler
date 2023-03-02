import { FromSchema } from 'json-schema-to-ts';
import { test } from 'tap';
import albumSchema from '../../src/models/album';
import build from '../helper';

type Album = FromSchema<typeof albumSchema>;

const albumProps = Object.keys(albumSchema.properties);

test('fetch the db', async (t) => {
  const app = await build(t);

  const res = await app.inject({
    method: 'GET',
    url: '/',
  });

  t.test('when fetch has no error', (t) => {
    t.ok(res);
    const payload: Album[] = JSON.parse(res.payload);
    t.type(payload, 'Array');

    t.test('when rows with albums', (t) => {
      t.equal(!!payload.length, true);
      t.hasProps(payload?.[0], albumProps);
      t.end();
    });
    t.end();
  });
  t.end();
});
