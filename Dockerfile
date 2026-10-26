# Same Node as mise.toml.
FROM node:26.11.1 AS node-build
WORKDIR /src

COPY package*.json ./
RUN npm ci

COPY . .
# The image tag: error reports name it as their release. Not VERSION, the
# same name as the server's argument (where VERSION meant MSBuild's Version).
ARG ECHOPHASE_VERSION=0.0.0-local
RUN npm run build

FROM nginx:alpine
# Links the published package to its repository (and its visibility) on GHCR.
LABEL org.opencontainers.image.source=https://github.com/EchoPhase-Project/webapp

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

# The stock entrypoint renders templates/*.template into this directory.
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx
# Only this variable is substituted; Kubernetes injects many others.
ENV NGINX_ENVSUBST_FILTER=^(API_UPSTREAM|SENTRY_DSN|ERRORS_UPSTREAM|ERRORS_PROJECT|UMAMI_UPSTREAM|UMAMI_WEBSITE_ID|NGINX_LOCAL_RESOLVERS)$
ENV API_UPSTREAM=echophase:8080
# The resolver for ERRORS_UPSTREAM: the entrypoint exports the pod's.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
# No error reporting unless SENTRY_DSN is set; the upstream is a black hole.
ENV SENTRY_DSN=""
ENV ERRORS_UPSTREAM=127.0.0.1:9
ENV ERRORS_PROJECT=0
# No visit statistics unless UMAMI_WEBSITE_ID is set.
ENV UMAMI_WEBSITE_ID=""
ENV UMAMI_UPSTREAM=127.0.0.1:9

COPY --from=node-build /src/dist /usr/share/nginx/html

EXPOSE 80

# CMD, not ENTRYPOINT: the image's entrypoint must run to render the template.
CMD ["nginx", "-g", "daemon off;"]
