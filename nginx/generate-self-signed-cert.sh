#!/bin/sh
set -eu

CERT_DIR=/etc/nginx/tls
CERT_FILE="$CERT_DIR/railsafe.crt"
KEY_FILE="$CERT_DIR/railsafe.key"

mkdir -p "$CERT_DIR"

if [ ! -s "$CERT_FILE" ] || [ ! -s "$KEY_FILE" ]; then
  COMMON_NAME="${TLS_COMMON_NAME:-RailSafe}"
  SAN="${TLS_SAN:-DNS:localhost}"
  DAYS="${TLS_CERT_DAYS:-365}"

  echo "Generating RailSafe self-signed TLS certificate for $SAN"
  openssl req \
    -x509 \
    -nodes \
    -newkey rsa:2048 \
    -sha256 \
    -days "$DAYS" \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/CN=$COMMON_NAME" \
    -addext "subjectAltName=$SAN"

  chmod 600 "$KEY_FILE"
  chmod 644 "$CERT_FILE"
fi
