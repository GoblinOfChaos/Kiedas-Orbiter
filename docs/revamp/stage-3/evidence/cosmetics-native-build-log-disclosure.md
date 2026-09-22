# Cosmetics native-build log disclosure

The first direct Stage 3E native-build launch was interrupted when the outer rootless Podman launcher returned before the container completed. Its partial log contained only the crate compile start and was later overwritten at the same intended evidence path by the successful attached rerun. The discarded partial run did not produce a new binary: the target still had the accepted Stage 3D timestamp and SHA-256 `5b41d7408736c9ef4bba0872b14e11720316a96c117a9095631c304ad75b9694` when checked immediately afterward.

The final `cosmetics-native-build.log` is the complete successful rerun. It records the release build finishing in 45.75 seconds, and `cosmetics-native-build-exit.json` records exit 0. The resulting raw binary SHA-256 is `3a4ce9c69fe9de6d0eed61ad962cb547006765a4512a0457425db9c6d860a71e`.
