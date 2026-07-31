#!/usr/bin/env python3
"""
download_helper.py — Download warframe-api-helper and orbiter binaries.

Downloads:
1. warframe-api-helper from Sainan's GitHub releases
2. orbiter (Rust OCR detector) from GoblinOfChaos/Kiedas-Orbiter releases

Called automatically by install.py / install.sh if the binaries are missing.
Can also be run manually: python download_helper.py

Usage:
    python download_helper.py           # Download both binaries
    python download_helper.py --force   # Force re-download even if present
"""

import hashlib
import hmac
import json
import os
import shutil
import stat
import sys
import urllib.request
import zipfile
import io
from pathlib import Path
from pathlib import PurePosixPath
from paths import DATA_DIR

WFINFO_DIR = Path(__file__).parent
API_HELPER_REPO = "Sainan/warframe-api-helper"
ORBITER_REPO = "GoblinOfChaos/Kiedas-Orbiter"
GITHUB_API_HELPER = f"https://api.github.com/repos/{API_HELPER_REPO}/releases/latest"
GITHUB_API_ORBITER = f"https://api.github.com/repos/{ORBITER_REPO}/releases/latest"

IS_WINDOWS = sys.platform == "win32"
IS_LINUX = sys.platform.startswith("linux")

# Windows cmd doesn't support ANSI by default; disable colours there
BOLD = "" if IS_WINDOWS else "\033[1m"
RESET = "" if IS_WINDOWS else "\033[0m"

# Expected asset names per platform
API_HELPER_ASSET_NAME = {
    "win32": "warframe-api-helper.exe",
    "linux": "Linux.Ubuntu.22.04+.zip",
}

ORBITER_ASSET_NAME = {
    # Windows ships as a zip because orbiter.exe is dynamically linked
    # against Tesseract/Leptonica DLLs (VCPKGRS_DYNAMIC=1) — those need to
    # sit alongside the exe, not just a bare binary.
    "win32": "orbiter-windows-x86_64.zip",
    "linux": "orbiter-linux-x86_64",
}

# Expected output paths per platform
API_HELPER_OUTPUT_PATH = {
    "win32": WFINFO_DIR / "warframe-api-helper.exe",
    "linux": WFINFO_DIR / "warframe-api-helper",
}

ORBITER_OUTPUT_PATH = {
    "win32": WFINFO_DIR / "orbiter.exe",
    "linux": WFINFO_DIR / "orbiter",
}
INSTALL_MANIFEST = DATA_DIR / "downloaded-binaries.json"


def _record_install(component: str, repo: str, version: str, asset: dict) -> None:
    try:
        manifest = json.loads(INSTALL_MANIFEST.read_text())
        if not isinstance(manifest, dict):
            manifest = {}
    except Exception:
        manifest = {}
    manifest[component] = {
        "repo": repo,
        "version": version,
        "asset": asset["name"],
        "digest": asset["digest"],
    }
    INSTALL_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    temporary = INSTALL_MANIFEST.with_name(INSTALL_MANIFEST.name + ".tmp")
    temporary.write_text(json.dumps(manifest, indent=2))
    temporary.replace(INSTALL_MANIFEST)


def _get_latest_release(repo: str) -> dict:
    """Fetch latest release info from GitHub API."""
    api_url = GITHUB_API_HELPER if repo == API_HELPER_REPO else GITHUB_API_ORBITER
    req = urllib.request.Request(
        api_url,
        headers={
            "User-Agent": "kiedas-orbiter/1.0",
            "Accept": "application/vnd.github+json",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def _verify_asset_data(asset: dict, data: bytes) -> None:
    """Require GitHub's published SHA-256 digest and advertised byte size."""
    digest = asset.get("digest", "")
    if not digest.startswith("sha256:") or len(digest) != len("sha256:") + 64:
        raise ValueError(f"asset {asset.get('name', '?')} has no usable SHA-256 digest")
    expected_size = asset.get("size")
    if not isinstance(expected_size, int) or expected_size < 0:
        raise ValueError(f"asset {asset.get('name', '?')} has no usable size")
    if len(data) != expected_size:
        raise ValueError(
            f"asset size mismatch: expected {expected_size:,} bytes, got {len(data):,}"
        )
    actual = hashlib.sha256(data).hexdigest()
    expected = digest.removeprefix("sha256:").lower()
    if not hmac.compare_digest(actual, expected):
        raise ValueError(
            f"SHA-256 mismatch for {asset.get('name', '?')}: expected {expected}, got {actual}"
        )


def _download_asset(asset: dict) -> bytes:
    """Download and authenticate a GitHub release asset before use."""
    with urllib.request.urlopen(asset["browser_download_url"], timeout=60) as r:
        data = r.read()
    _verify_asset_data(asset, data)
    print(f"  Verified SHA-256: {asset['digest'].removeprefix('sha256:')}")
    return data


def _download_binary(asset: dict, dest: Path):
    """Download a verified binary and atomically replace its destination."""
    print(f"  Downloading {dest.name}...", flush=True)
    tmp = dest.with_suffix(".tmp")
    data = _download_asset(asset)
    tmp.write_bytes(data)
    tmp.replace(dest)
    print(f"  Saved to {dest}")


def _safe_extract_zip(data: bytes, destination: Path) -> None:
    """Extract regular ZIP members without allowing paths outside destination."""
    destination = destination.resolve()
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        for member in zf.infolist():
            normalized = member.filename.replace("\\", "/")
            member_path = PurePosixPath(normalized)
            if (not normalized or normalized.startswith("/")
                    or member_path.is_absolute() or ".." in member_path.parts
                    or (member_path.parts and ":" in member_path.parts[0])):
                raise ValueError(f"unsafe ZIP member path: {member.filename!r}")
            unix_mode = member.external_attr >> 16
            if stat.S_ISLNK(unix_mode):
                raise ValueError(f"ZIP symlink is not allowed: {member.filename!r}")

            target = destination.joinpath(*member_path.parts)
            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            tmp = target.with_name(target.name + ".download-tmp")
            with zf.open(member) as source, tmp.open("wb") as output:
                shutil.copyfileobj(source, output)
            tmp.replace(target)


def download_api_helper(force: bool = False) -> bool:
    """
    Download warframe-api-helper for the current platform.
    Returns True if the binary is present and usable (downloaded now or
    already there), False only on a genuine failure.
    """
    platform = sys.platform
    if platform not in API_HELPER_ASSET_NAME:
        print(f"  No helper binary available for platform: {platform}")
        print("  Inventory features will not work.")
        return False

    asset_name = API_HELPER_ASSET_NAME[platform]
    output = API_HELPER_OUTPUT_PATH[platform]

    if output.exists() and not force:
        print(f"  {output.name} already present — skipping download.")
        print("  Run with --force to re-download.")
        return True

    print(f"Fetching latest warframe-api-helper release...")
    try:
        release = _get_latest_release(API_HELPER_REPO)
    except Exception as e:
        print(f"  ERROR: could not fetch release info: {e}")
        return False

    version = release.get("tag_name", "?")
    print(f"  Latest version: {version}")

    # Find the matching asset
    assets = release.get("assets", [])
    asset = next((a for a in assets if a["name"] == asset_name), None)
    if not asset:
        print(f"  ERROR: asset '{asset_name}' not found in release {version}")
        print(f"  Available: {[a['name'] for a in assets]}")
        return False

    if IS_LINUX and asset_name.endswith(".zip"):
        # Linux release is a zip — extract the binary from it
        print(f"  Downloading {asset_name}...", flush=True)
        data = _download_asset(asset)
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            # Find the binary inside the zip
            names = zf.namelist()
            binary = next(
                (n for n in names if "warframe-api-helper" in n and not n.endswith("/")), None
            )
            if not binary:
                print(f"  ERROR: could not find binary in zip. Contents: {names}")
                return False
            output.write_bytes(zf.read(binary))
        # Make executable
        output.chmod(output.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
        print(f"  Extracted to {output}")
    else:
        _download_binary(asset, output)
        if not IS_WINDOWS:
            output.chmod(output.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)

    print(f"  warframe-api-helper {version} installed.")
    _record_install("api_helper", API_HELPER_REPO, version, asset)
    return True


def download_orbiter(force: bool = False) -> bool:
    """
    Download orbiter binary for the current platform.
    Returns True if the binary is present and usable (downloaded now or
    already there), False only on a genuine failure.
    """
    platform = sys.platform
    if platform not in ORBITER_ASSET_NAME:
        print(f"  No orbiter binary available for platform: {platform}")
        return False

    asset_name = ORBITER_ASSET_NAME[platform]
    output = ORBITER_OUTPUT_PATH[platform]

    if output.exists() and not force:
        print(f"  {output.name} already present — skipping download.")
        print("  Run with --force to re-download.")
        return True

    print(f"Fetching orbiter release from Kiedas-Orbiter...")
    try:
        release = _get_latest_release(ORBITER_REPO)
    except Exception as e:
        print(f"  ERROR: could not fetch orbiter release info: {e}")
        return False

    version = release.get("tag_name", "?")
    print(f"  Latest version: {version}")

    # Find the matching asset
    assets = release.get("assets", [])
    asset = next((a for a in assets if a["name"] == asset_name), None)
    if not asset:
        print(f"  ERROR: orbiter asset '{asset_name}' not found in release {version}")
        print(f"  Available: {[a['name'] for a in assets]}")
        return False

    if IS_WINDOWS and asset_name.endswith(".zip"):
        # Windows ships as a zip of orbiter.exe + the Tesseract/Leptonica
        # DLLs it's dynamically linked against — extract everything into
        # WFINFO_DIR so the DLLs land right next to the exe.
        print(f"  Downloading {asset_name}...", flush=True)
        data = _download_asset(asset)
        _safe_extract_zip(data, WFINFO_DIR)
        print(f"  Extracted orbiter.exe + DLLs to {WFINFO_DIR}")
    else:
        _download_binary(asset, output)
        if IS_LINUX:
            output.chmod(output.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)

    print(f"  orbiter {version} installed.")
    _record_install("orbiter", ORBITER_REPO, version, asset)
    return True


def download_helper(force: bool = False) -> dict:
    """
    Download both warframe-api-helper and orbiter binaries.
    Returns a dict with success status for each component:
    {'api_helper': bool, 'orbiter': bool}
    """
    print("Downloading binaries...", flush=True)

    api_helper_success = download_api_helper(force=force)
    orbiter_success = download_orbiter(force=force)

    print()
    if api_helper_success and orbiter_success:
        print(f"  {BOLD}Both binaries downloaded successfully.{RESET}")
    elif api_helper_success:
        print(f"  ⚠️  warframe-api-helper downloaded, but orbiter missing.")
        print("      Relic reward OCR overlay won't work until orbiter is installed.")
    else:
        print(f"  ⚠️  warframe-api-helper missing. Inventory features won't work.")

    return {
        "api_helper": api_helper_success,
        "orbiter": orbiter_success,
    }


if __name__ == "__main__":
    force = "--force" in sys.argv
    result = download_helper(force=force)
    
    # Exit with non-zero if any binary failed to download
    if not (result["api_helper"] and result["orbiter"]):
        sys.exit(1)
    sys.exit(0)
