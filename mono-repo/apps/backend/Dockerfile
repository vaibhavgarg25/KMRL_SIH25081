FROM node:20-alpine AS deps
WORKDIR /deps
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

FROM node:20-alpine AS builder

WORKDIR /build

COPY package*.json ./
RUN npm install && npm cache clean --force

COPY . .
RUN npm run build

FROM gcr.io/distroless/nodejs20:nonroot AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY --from=deps /deps/node_modules ./node_modules
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/generated ./generated
COPY --from=builder /build/package.json ./

EXPOSE 8000

CMD ["node","dist/index.js"]