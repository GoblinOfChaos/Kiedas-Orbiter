#!/bin/sh
# Run from the repository root. Reuses the prepared local Ubuntu image.
set -eu
flatpak-spawn --host podman run --rm --security-opt label=disable --network=none --cpus=4 --memory=8g \
 --volume /var/home/jedwards/kiedas-orbiter:/var/home/jedwards/kiedas-orbiter:rw \
 --volume /var/home/jedwards/.rustup/toolchains/1.96.0-x86_64-unknown-linux-gnu:/opt/rust:ro \
 --volume /var/home/jedwards/.nvm/versions/node/v24.19.0:/opt/node:ro \
 localhost/kiedas-preview-ubuntu24-package python3 "/var/home/jedwards/kiedas-orbiter/.preview-work/ubuntu-build/$1"
