const albumSchema = {
  $id: 'album',
  type: 'object',
  properties: {
    id: { type: 'string' },
    url: { type: 'string' },
    album_title: { type: 'string' },
    album_artist: { type: 'string' },
    album_image: { type: 'string' },
    track_title: { type: 'string' },
  },
} as const;

export default albumSchema;
