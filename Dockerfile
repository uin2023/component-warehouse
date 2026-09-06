# RCL Studio — 纯静态页面，用 nginx 托管即可
# Pure static single-page app served by nginx.
FROM nginx:stable-alpine

# 站点配置（gzip / 缓存策略 / UTF-8）
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# 应用本体（单文件）
COPY index.html /usr/share/nginx/html/index.html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
