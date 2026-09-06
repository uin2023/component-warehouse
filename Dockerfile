# RCL Studio —— 一体化镜像：页面 + 数据 API + 定期备份
# All-in-one image: web UI + data API + scheduled backups (zero npm dependencies)
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY server.js  /app/server.js
COPY index.html /app/index.html

# 运行参数（可在 docker-compose.yml 里覆盖）
ENV PORT=80 \
    DATA_DIR=/app/data \
    BACKUP_INTERVAL_HOURS=24 \
    BACKUP_KEEP=14

# 所有库存数据（含图片/数据手册）与自动备份都在 /app/data，务必映射到 NAS 目录
VOLUME ["/app/data"]

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/api/health || exit 1

CMD ["node", "/app/server.js"]
