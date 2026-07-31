import importlib.util
from pathlib import Path


def _module():
    path = Path(__file__).parents[1] / "helper-update-sentinel.py"
    spec = importlib.util.spec_from_file_location("helper_update_sentinel", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_installed_digest_reads_downloader_manifest(tmp_path, monkeypatch):
    module = _module()
    manifest = tmp_path / "manifest.json"
    manifest.write_text('{"api_helper": {"digest": "sha256:abc"}}')
    monkeypatch.setattr(module, "INSTALL_MANIFEST", manifest)
    assert module._installed_digest() == "sha256:abc"


def test_missing_manifest_has_unknown_installed_digest(tmp_path, monkeypatch):
    module = _module()
    monkeypatch.setattr(module, "INSTALL_MANIFEST", tmp_path / "missing.json")
    assert module._installed_digest() == ""
