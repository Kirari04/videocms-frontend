# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package.json .
COPY bun.lockb .
RUN bun install --frozen-lockfile --verbose

COPY . .
RUN bun run build --verbose

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", ".output/server/index.mjs" ]
