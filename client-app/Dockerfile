FROM node:22-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_GATEWAY_PORTAL_URL=

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_GATEWAY_PORTAL_URL=${VITE_GATEWAY_PORTAL_URL}

RUN pnpm run build

FROM nginxinc/nginx-unprivileged:stable-alpine AS runner

ENV AUDITCHAIN_API_UPSTREAM=http://api-gateway:8080

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist/ /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
