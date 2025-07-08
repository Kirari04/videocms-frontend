FROM oven/bun:1 AS builder

WORKDIR /usr/src/app

# Install Syft for SBOM generation.
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# Copy package manager files
COPY package.json bun.lock ./

# Install dependencies using the lockfile to ensure consistency
RUN bun install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Build the Nuxt application
RUN bun run build --verbose

# Generate the Software Bill of Materials (SBOM)
# Syft will scan the project and its dependencies from bun.lock
RUN syft . -o spdx-json=sbom.spdx.json


FROM oven/bun:1

WORKDIR /usr/src/app

# Set all necessary environment variables for production
ENV NODE_ENV=production
ENV NUXT_PUBLIC_API_URL=https://videocms.senpai.one/api
ENV NUXT_PUBLIC_BASE_URL=https://videocms.senpai.one
ENV NUXT_PUBLIC_DOCKER_HUB_TAG=kirari04/videocms:demo_panel
ENV NUXT_PUBLIC_API_DOCS=https://documenter.getpostman.com/view/15650779/2s93CPrY2w
ENV NUXT_PUBLIC_TUTORIAL=https://videocms.tawk.help/category/tutorial
ENV NUXT_PUBLIC_NAME=VideoCMS
ENV NUXT_PUBLIC_DEMO=false

# Copy the installed dependencies from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy the built application output from the builder stage
COPY --from=builder /usr/src/app/.output ./.output

# Copy the SBOM file into the final image
COPY --from=builder /usr/src/app/sbom.spdx.json ./sbom.spdx.json

# Copy package.json for context (some runtimes or tools might need it)
COPY --from=builder /usr/src/app/package.json ./package.json

# Run as the non-root 'bun' user
USER bun

# Expose the application port
EXPOSE 3000/tcp

# The command to start the application server
ENTRYPOINT [ "bun", "run", ".output/server/index.mjs" ]