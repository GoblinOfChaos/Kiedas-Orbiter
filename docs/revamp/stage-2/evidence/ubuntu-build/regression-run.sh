#!/bin/sh
set -eu
cd /var/home/jedwards/kiedas-orbiter
flatpak-spawn --host podman run --rm --security-opt label=disable --network=none --cpus=4 --memory=4g --volume /var/home/jedwards/kiedas-orbiter:/var/home/jedwards/kiedas-orbiter:rw localhost/kiedas-preview-ubuntu24-test sh -c 'nice -n 19 cc -shared -fPIC -o /var/home/jedwards/kiedas-orbiter/.preview-work/ubuntu-build/rollback-fault.so /var/home/jedwards/kiedas-orbiter/.preview-work/rollback-fault.c -ldl && python3 /var/home/jedwards/kiedas-orbiter/.preview-work/ubuntu-build/regression.py'
