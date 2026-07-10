#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  ./server-update-images.sh <image_tag> [image_package] [compose_dir]

Examples:
  ./server-update-images.sh 0.1.1
  ./server-update-images.sh 0.1.1 /tmp/prompt-skill-manager-images-0.1.1.tar.gz
  ./server-update-images.sh 0.1.1 /tmp/prompt-skill-manager-images-0.1.1.tar.gz /opt/prompt-skill-manager

Environment variables:
  IMAGE_PACKAGE  Optional. Default: /tmp/prompt-skill-manager-images-<image_tag>.tar.gz
  COMPOSE_DIR    Optional. Default: /opt/prompt-skill-manager
USAGE
}

IMAGE_TAG="${1:-${IMAGE_TAG:-}}"

if [[ -z "${IMAGE_TAG}" ]]; then
  usage
  exit 1
fi

if [[ ! "${IMAGE_TAG}" =~ ^[A-Za-z0-9_.-]+$ ]]; then
  echo "Invalid image tag: ${IMAGE_TAG}" >&2
  echo "Only letters, numbers, underscores, dots, and hyphens are allowed." >&2
  exit 1
fi

IMAGE_PACKAGE="${2:-${IMAGE_PACKAGE:-/tmp/prompt-skill-manager-images-${IMAGE_TAG}.tar.gz}}"
COMPOSE_DIR="${3:-${COMPOSE_DIR:-/opt/prompt-skill-manager}}"
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.yml"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command docker

if [[ ! -f "${IMAGE_PACKAGE}" ]]; then
  echo "Image package not found: ${IMAGE_PACKAGE}" >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "docker-compose.yml not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

echo "Loading image package: ${IMAGE_PACKAGE}"
docker load -i "${IMAGE_PACKAGE}"

BACKUP_FILE="${COMPOSE_FILE}.bak-$(date +%Y%m%d%H%M%S)"
cp "${COMPOSE_FILE}" "${BACKUP_FILE}"
echo "Backed up compose file: ${BACKUP_FILE}"

sed -i \
  -e "s#image: prompt-skill-manager-api:[A-Za-z0-9_.-]\\+#image: prompt-skill-manager-api:${IMAGE_TAG}#g" \
  -e "s#image: prompt-skill-manager-web:[A-Za-z0-9_.-]\\+#image: prompt-skill-manager-web:${IMAGE_TAG}#g" \
  "${COMPOSE_FILE}"

if ! grep -q "image: prompt-skill-manager-api:${IMAGE_TAG}" "${COMPOSE_FILE}"; then
  echo "Failed to update API image tag in ${COMPOSE_FILE}" >&2
  exit 1
fi

if ! grep -q "image: prompt-skill-manager-web:${IMAGE_TAG}" "${COMPOSE_FILE}"; then
  echo "Failed to update Web image tag in ${COMPOSE_FILE}" >&2
  exit 1
fi

echo "Updated compose images to tag: ${IMAGE_TAG}"

cd "${COMPOSE_DIR}"
docker compose up -d --pull never
docker compose ps
