ARG NODE_IMAGE=node:20-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN corepack enable
COPY .npmrc package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --filter @prompt-skill-manager/api... --frozen-lockfile --prod=false

FROM deps AS builder
WORKDIR /app
COPY apps/api apps/api
RUN pnpm --filter @prompt-skill-manager/api prisma:generate
RUN pnpm --filter @prompt-skill-manager/api build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/apps/api/node_modules apps/api/node_modules
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/prisma apps/api/prisma
EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @prompt-skill-manager/api prisma:deploy && pnpm --filter @prompt-skill-manager/api prisma:seed && pnpm --filter @prompt-skill-manager/api start:prod"]
