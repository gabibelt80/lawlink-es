#!/bin/bash
# LawLink - Script de respaldo de base de datos + almacenamiento de archivos
# Uso: ./scripts/backup.sh [/directorio/de/backups]
# Por defecto respalda en ./backups/

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"

# Leer configuracion de la base de datos desde .env
if [ -f .env ]; then
  source .env
fi

DB_URL="${DATABASE_URL:-}"
STORAGE_DIR="${STORAGE_PATH:-./storage}"

if [ -z "$DB_URL" ]; then
  echo "Error: DATABASE_URL no esta configurada"
  exit 1
fi

# Parsear parametros de conexion desde DATABASE_URL
# Formato: postgresql://usuario:password@host:puerto/base
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
echo "[1/4] Exportando la base de datos..."
PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --compress=6 \
  -f "${BACKUP_PATH}/database.dump"
echo "  Respaldo de la base de datos completado: $(du -sh "${BACKUP_PATH}/database.dump" | cut -f1)"

# 2. Almacenamiento de archivos
echo "[2/4] Comprimiendo el almacenamiento de archivos..."
if [ -d "$STORAGE_DIR" ]; then
  tar czf "${BACKUP_PATH}/storage.tar.gz" -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"
  echo "  Respaldo del almacenamiento de archivos completado: $(du -sh "${BACKUP_PATH}/storage.tar.gz" | cut -f1)"
else
  echo "  Omitido: el directorio de almacenamiento no existe"
fi

# 3. Metadatos
echo "[3/4] Escribiendo metadatos..."
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

# 4. Rotacion: mantener solo los ultimos 10 backups
echo "[4/4] Rotando backups antiguos (mantener 10)..."
DELETED=0
for old in $(ls -1t "$BACKUP_DIR" | tail -n +11); do
  rm -rf "${BACKUP_DIR}/${old}"
  echo "  Eliminado: ${old}"
  DELETED=$((DELETED + 1))
done
echo "  Backups eliminados: ${DELETED}"

echo ""
echo "=== Respaldo completado ==="
echo "Ruta: ${BACKUP_PATH}"
echo "Tamaño total: $(du -sh "$BACKUP_PATH" | cut -f1)"
echo ""
echo "Sugerencia: subi ${BACKUP_PATH} a un almacenamiento externo (S3 / OSS / otro servidor)"