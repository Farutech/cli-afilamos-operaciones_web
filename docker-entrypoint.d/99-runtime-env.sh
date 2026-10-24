#!/bin/sh
set -e

CONFIG_FILE="/usr/share/nginx/html/env-config.js"

API_URL="${VITE_API_BASE_URL:-${API_BASE_URL:-}}"

if [ -n "$API_URL" ]; then
  echo "Injecting runtime VITE_API_BASE_URL=$API_URL into $CONFIG_FILE"
  cat <<EOF > "$CONFIG_FILE"
window.__ENV__ = {
  VITE_API_BASE_URL: "${API_URL}"
};
EOF
fi
