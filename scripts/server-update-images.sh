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
  COMPOSE_FILE   Optional. Default: <compose_dir>/docker-compose.yml
  ENV_FILE       Optional. Default: <compose_dir>/.env
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
COMPOSE_FILE="${COMPOSE_FILE:-${COMPOSE_DIR}/docker-compose.yml}"
ENV_FILE="${ENV_FILE:-${COMPOSE_DIR}/.env}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command docker
require_command awk
require_command mktemp

if [[ ! -f "${IMAGE_PACKAGE}" ]]; then
  echo "Image package not found: ${IMAGE_PACKAGE}" >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Environment file not found: ${ENV_FILE}" >&2
  exit 1
fi

echo "Loading image package: ${IMAGE_PACKAGE}"
docker load -i "${IMAGE_PACKAGE}"

API_IMAGE="prompt-skill-manager-api:${IMAGE_TAG}"
WEB_IMAGE="prompt-skill-manager-web:${IMAGE_TAG}"

if ! docker image inspect "${API_IMAGE}" >/dev/null 2>&1; then
  echo "API image was not found after loading the package: ${API_IMAGE}" >&2
  exit 1
fi

if ! docker image inspect "${WEB_IMAGE}" >/dev/null 2>&1; then
  echo "Web image was not found after loading the package: ${WEB_IMAGE}" >&2
  exit 1
fi

TEMP_ENV_FILE="$(mktemp "${ENV_FILE}.tmp.XXXXXX")"
trap 'rm -f "${TEMP_ENV_FILE}"' EXIT

awk -v image_tag="${IMAGE_TAG}" '
  /^IMAGE_TAG=/ {
    if (!updated) {
      print "IMAGE_TAG=" image_tag
      updated = 1
    }
    next
  }
  { print }
  END {
    if (!updated) {
      print "IMAGE_TAG=" image_tag
    }
  }
' "${ENV_FILE}" > "${TEMP_ENV_FILE}"

if ! grep -Fxq "IMAGE_TAG=${IMAGE_TAG}" "${TEMP_ENV_FILE}"; then
  echo "Failed to prepare IMAGE_TAG in ${ENV_FILE}" >&2
  exit 1
fi

docker compose \
  --env-file "${TEMP_ENV_FILE}" \
  -f "${COMPOSE_FILE}" \
  config --quiet

COMPOSE_IMAGES="$(docker compose \
  --env-file "${TEMP_ENV_FILE}" \
  -f "${COMPOSE_FILE}" \
  config --images)"

if ! grep -Fxq "${API_IMAGE}" <<< "${COMPOSE_IMAGES}"; then
  echo "Compose did not resolve the API image to ${API_IMAGE}" >&2
  exit 1
fi

if ! grep -Fxq "${WEB_IMAGE}" <<< "${COMPOSE_IMAGES}"; then
  echo "Compose did not resolve the Web image to ${WEB_IMAGE}" >&2
  exit 1
fi

BACKUP_FILE="${ENV_FILE}.bak-$(date +%Y%m%d%H%M%S)"
cp "${ENV_FILE}" "${BACKUP_FILE}"
echo "Backed up environment file: ${BACKUP_FILE}"

mv "${TEMP_ENV_FILE}" "${ENV_FILE}"
trap - EXIT

echo "Updated IMAGE_TAG in ${ENV_FILE} to ${IMAGE_TAG}"
echo "Preserved WEB_PORT and all other environment settings"

docker compose \
  --env-file "${ENV_FILE}" \
  -f "${COMPOSE_FILE}" \
  up -d --pull never
docker compose \
  --env-file "${ENV_FILE}" \
  -f "${COMPOSE_FILE}" \
  ps
