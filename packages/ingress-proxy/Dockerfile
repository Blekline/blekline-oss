FROM node:20-alpine

WORKDIR /app

COPY packages/ingress-proxy/server.mjs /app/server.mjs
COPY packages/ingress-proxy/entrypoint.sh /entrypoint.sh
COPY packages/contracts/dist /app/node_modules/@blekline/contracts/dist
COPY packages/contracts/package.json /app/node_modules/@blekline/contracts/package.json

RUN chmod +x /entrypoint.sh && \
    node -e "const p=require('./node_modules/@blekline/contracts/package.json'); p.exports={'.':{import:'./dist/index.js',require:'./dist/index.js'},'./dist/*':'./dist/*'}; require('fs').writeFileSync('./node_modules/@blekline/contracts/package.json', JSON.stringify(p,null,2))"

ENV BLEKLINE_INGRESS_TARGET=https://app.blekline.com
ENV BLEKLINE_INGRESS_REGION=global
ENV LISTEN_PORT=8787
ENV BLEKLINE_EDGE_LOCAL_MASK=true

EXPOSE 8787

ENTRYPOINT ["/entrypoint.sh"]
