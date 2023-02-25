# ecm-sampler

- ecmrecords.com에서 무료로 제공하는 sample music들을 puppeteer로 scraping하여 db로 저장 (/sync), 저장된 db를 읽어오는 (/) 백엔드 서버.

## 사용된 package들

- [fastify](https://www.fastify.io/)
- [puppeteer](https://pptr.dev/)
- yarn berry PnP zero install
- AWS RDS Postgres
- [node-postgres(pg)](https://node-postgres.com/)
- ts-node and typescript
- [bluebird](http://bluebirdjs.com/docs/getting-started.html)
