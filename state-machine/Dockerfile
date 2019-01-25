FROM node:8.10 as base
WORKDIR /app

FROM base as test
COPY package.json yarn.lock .
COPY src ./src
COPY spec ./spec
RUN yarn install && yarn test

FROM base
COPY --from=test /app/package.json /app/yarn.lock .
COPY src ./src
RUN yarn install --production && yarn cache clean
