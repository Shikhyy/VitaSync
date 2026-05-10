#!/usr/bin/env sh
set -eu

echo "== OS =="
uname -a

echo
echo "== Docker =="
docker --version
docker compose version

echo
echo "== AMD GPU Devices =="
ls -l /dev/kfd /dev/dri || true

echo
echo "== ROCm Tools =="
if command -v rocminfo >/dev/null 2>&1; then
  rocminfo | grep -E "Name:|Marketing Name" | head -40
else
  echo "rocminfo not found"
fi

if command -v rocm-smi >/dev/null 2>&1; then
  rocm-smi
else
  echo "rocm-smi not found"
fi

echo
echo "== Container GPU Smoke Test =="
docker run --rm --device=/dev/kfd --device=/dev/dri --group-add video --group-add render rocm/rocm-terminal:latest rocminfo | grep -E "Name:|Marketing Name" | head -40
