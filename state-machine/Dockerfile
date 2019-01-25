FROM node:8.10-alpine as base
WORKDIR /app

FROM base as test
COPY package.json yarn.lock .
RUN yarn install
COPY src ./src
COPY spec ./spec
RUN yarn test

FROM base
COPY package.json yarn.lock .
RUN yarn install --production && yarn cache clean
COPY --from=test /app/src ./src
CMD ["node", "src/local.js"]