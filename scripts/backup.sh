#!/bin/bash
# LawLink 数据库 + 文件存储备份脚本
# 用法: ./scripts/backup.sh [/备份/目录]
# 默认备份到 ./backups/

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"

# 从 .env 读取数据库配置
if [ -f .env ]; then
  source .env
fi

DB_URL="${DATABASE_URL:-}"
STORAGE_DIR="${STORAGE_PATH:-./storage}"

if [ -z "$DB_URL" ]; then
  echo "Error: DATABASE_URL no está configurada"
  exit 1
fi

# 从 DATABASE_URL 解析连接参数
# 格式: postgresql://user:password@host:port/database
DB_HOST=$(echo "$DB_URL" | sed -E 's/.*@([^:]+):.*/\1/')
DB_PORT=$(echo "$DB_URL" | sed -E 's/.*:([0-9]+)\/.*/\1/')
DB_NAME=$(echo "$DB_URL" | sed -E 's/.*\/([^?]+).*/\1/')
DB_USER=$(echo "$DB_URL" | sed -E 's/.*:\/\/([^:]+):.*/\1/')
DB_PASS=$(echo "$DB_URL" | sed -E 's/.*:\/\/[^:]+:([^@]+)@.*/\1/')

mkdir -p "$BACKUP_PATH"

echo "=== Respaldo de LawLink ${TIMESTAMP} ==="
echo "Base de datos: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "Directorio de almacenamiento: ${STORAGE_DIR}"
echo ""

# 1. pg_dump
echo "[1/3] Exportando la base de datos..."
PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --compress=6 \
  -f "${BACKUP_PATH}/database.dump"
echo "  Respaldo de la base de datos completado: $(du -sh "${BACKUP_PATH}/database.dump" | cut -f1)"

# 2. 文件存储
echo "[2/3] Comprimiendo el almacenamiento de archivos..."
if [ -d "$STORAGE_DIR" ]; then
  tar czf "${BACKUP_PATH}/storage.tar.gz" -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"
  echo "  Respaldo del almacenamiento de archivos completado: $(du -sh "${BACKUP_PATH}/storage.tar.gz" | cut -f1)"
else
  echo "  Omitido: el directorio de almacenamiento no existe"
fi

# 3. 元信息
echo "[3/3] Escribiendo metadatos..."
cat > "${BACKUP_PATH}/manifest.json" << EOF
{
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -Iseconds)",
  "database": "${DB_NAME}",
  "storage_path": "${STORAGE_DIR}",
  "files": [
    {"name": "database.dump", "type": "pg_dump custom compressed"},
    {"name": "storage.tar.gz", "type": "tar gzip"}
  ]
}
EOF

echo ""
echo "=== Respaldo completado ==="
echo "Ruta: ${BACKUP_PATH}"
echo "Tamaño total: $(du -sh "$BACKUP_PATH" | cut -f1)"
echo ""
echo "Sugerencia: subí ${BACKUP_PATH} a un almacenamiento externo (S3 / OSS / otro servidor)"
