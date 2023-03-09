# ecm-sampler

- [ECM Records](https://ecmrecords.com)에서 무료로 제공하는 sample music들을 puppeteer로 scraping하여 db로 저장 (/sync), 저장된 db를 읽어오는 (/) 백엔드 서버.

## 사용된 package들

- [fastify](https://www.fastify.io/)
- [puppeteer](https://pptr.dev/)
- [chrome-aws-lambda](https://github.com/alixaxel/chrome-aws-lambda)
- [node-tap](https://node-tap.org/)
- AWS SAM
- AWS RDS Postgres
- [node-postgres(pg)](https://node-postgres.com/)
- ts-node and typescript
- [bluebird](http://bluebirdjs.com/docs/getting-started.html)
- [Slack Incoming Webhook](https://personalnotif-5j53202.slack.com/apps/A0F7XDUAZ--?tab=more_info)

## todos

1. ~~@fastify/aws-lambda 사용~~
2. /sync를 진행 percentage를 표시하도록 수정
3. ~~테스트 코드를 추가해서 크롤링 대상 웹사이트가 바뀌었는지 미리 감지할 수 있게 하기~~
4. ~~/sync를 크론잡으로 일주일에 한번 주기적으로 돌려서 자동으로 실행~~
5. ~~/sync 람다함수 결과를 슬랙 메세지로 연동~~
