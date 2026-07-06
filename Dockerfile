FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps
COPY --from=build /app/dist ./dist
COPY --from=build /app/api ./api
COPY --from=build /app/src ./src
COPY --from=build /app/data ./data
COPY --from=build /app/server.js ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
