FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json .npmrc ./

ARG NODE_AUTH_TOKEN
ENV NODE_AUTH_TOKEN=${NODE_AUTH_TOKEN}

# Soporta secret mount de BuildKit (--secret id=npmrc) o variable NODE_AUTH_TOKEN
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci

COPY . .

ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS final
USER root
COPY --chown=101:101 --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker-entrypoint.d/99-runtime-env.sh /docker-entrypoint.d/99-runtime-env.sh
USER 101

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

