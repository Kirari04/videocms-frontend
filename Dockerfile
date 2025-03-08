FROM oven/bun:1
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV NUXT_PUBLIC_API_URL=https://videocms.senpai.one/api
ENV NUXT_PUBLIC_BASE_URL=https://videocms.senpai.one
ENV NUXT_PUBLIC_DOCKER_HUB_TAG=kirari04/videocms:demo_panel
ENV NUXT_PUBLIC_API_DOCS=https://documenter.getpostman.com/view/15650779/2s93CPrY2w
ENV NUXT_PUBLIC_TUTORIAL=https://videocms.tawk.help/category/tutorial
ENV NUXT_PUBLIC_NAME=VideoCMS
ENV NUXT_PUBLIC_DEMO=false

COPY package.json .
COPY bun.lock .
RUN bun install

COPY . .
RUN bun run build --verbose

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", ".output/server/index.mjs" ]
