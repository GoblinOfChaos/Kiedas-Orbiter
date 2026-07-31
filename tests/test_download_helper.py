import hashlib
import io
import stat
import zipfile

import pytest

from download_helper import _safe_extract_zip, _verify_asset_data


def _asset_for(data):
    return {
        "name": "test.bin",
        "size": len(data),
        "digest": f"sha256:{hashlib.sha256(data).hexdigest()}",
    }


def _zip(entries):
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        for name, data in entries:
            archive.writestr(name, data)
    return output.getvalue()


def test_asset_digest_and_size_are_required():
    data = b"trusted release bytes"
    _verify_asset_data(_asset_for(data), data)

    bad = _asset_for(data)
    bad["digest"] = "sha256:" + "0" * 64
    with pytest.raises(ValueError, match="SHA-256 mismatch"):
        _verify_asset_data(bad, data)

    missing = _asset_for(data)
    missing.pop("digest")
    with pytest.raises(ValueError, match="no usable SHA-256"):
        _verify_asset_data(missing, data)


@pytest.mark.parametrize("name", [
    "../escape.exe",
    "/absolute.exe",
    r"..\\escape.exe",
    r"C:\\escape.exe",
])
def test_safe_zip_rejects_escape_paths(tmp_path, name):
    with pytest.raises(ValueError, match="unsafe ZIP member"):
        _safe_extract_zip(_zip([(name, b"bad")]), tmp_path)


def test_safe_zip_rejects_symlinks(tmp_path):
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        member = zipfile.ZipInfo("orbiter-link")
        member.create_system = 3
        member.external_attr = (stat.S_IFLNK | 0o777) << 16
        archive.writestr(member, "../outside")
    with pytest.raises(ValueError, match="symlink"):
        _safe_extract_zip(output.getvalue(), tmp_path)


def test_safe_zip_extracts_regular_files(tmp_path):
    _safe_extract_zip(
        _zip([("orbiter.exe", b"exe"), ("runtime/tesseract.dll", b"dll")]),
        tmp_path,
    )
    assert (tmp_path / "orbiter.exe").read_bytes() == b"exe"
    assert (tmp_path / "runtime" / "tesseract.dll").read_bytes() == b"dll"
