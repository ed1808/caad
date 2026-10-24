#!/usr/bin/env bash
# Helper script para ejecutar comandos de compilación, test y desarrollo dentro del Dev Container de CAAD

set -e

# Detectar si hay TTY interactivo
INTERACTIVE_FLAG=""
if [ -t 0 ]; then
  INTERACTIVE_FLAG="-it"
fi

exec docker run --rm ${INTERACTIVE_FLAG} \
  --ipc=host \
  --net=host \
  -e DISPLAY="${DISPLAY}" \
  -e WAYLAND_DISPLAY="${WAYLAND_DISPLAY}" \
  -e WEBKIT_DISABLE_COMPOSITING_MODE=1 \
  -e WEBKIT_DISABLE_DMABUF_RENDERER=1 \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  -v /dev/dri:/dev/dri \
  -v "$(pwd)":/workspace \
  -w /workspace \
  caad-dev:latest "$@"
