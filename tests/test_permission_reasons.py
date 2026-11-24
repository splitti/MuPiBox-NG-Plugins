"""Permission reason validation and first-party manifest coverage."""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from mupiapp import PackageError, validate_manifest


class PermissionReasonTests(unittest.TestCase):
    def setUp(self):
        self.manifest = {
            "apiVersion": "1", "id": "community.testapp", "name": "Test App",
            "version": "0.1.0", "runtime": "web", "entry": "index.html",
            "permissions": ["controller"],
        }

    def test_optional_and_valid(self):
        validate_manifest(self.manifest, {"index.html"})
        for reasons in ({}, {"controller": "Spielzüge bestätigen."},
                        {"controller": "ä" * 150}):
            with self.subTest(reasons=reasons):
                validate_manifest({**self.manifest, "permissionReasons": reasons}, {"index.html"})

    def test_reject_invalid_reasons(self):
        for reasons in (None, [], {"audio": "Music"}, {"controller": ""},
                        {"controller": "  "}, {"controller": 42},
                        {"controller": "ä" * 151}, {"controller": "\ud800"}):
            with self.subTest(reasons=reasons), self.assertRaises(PackageError):
                validate_manifest({**self.manifest, "permissionReasons": reasons}, {"index.html"})

    def test_first_party_catalog_apps_explain_all_permissions(self):
        dirs = (
            "tic-tac-toe", "four-in-a-row", "crumbworm", "chess", "klang-memory",
            "mupi-beatbox", "mupi-soundquiz", "mupi-rhythm", "mupi-muehle",
            "mupi-reversi", "mupi-dame", "mupi-wuerfelrennen", "mupi-hnefatafl",
            "mupi-klavier", "mupi-wasserschlacht", "funny-mupi", "mupi-run-native",
        )
        for directory in dirs:
            with self.subTest(app=directory):
                m = json.loads((ROOT / "examples" / directory / "manifest.json").read_text(encoding="utf-8"))
                self.assertEqual(set(m["permissions"]), set(m["permissionReasons"]))
                for reason in m["permissionReasons"].values():
                    self.assertTrue(reason.strip())
                    self.assertLessEqual(len(reason.encode("utf-8")), 300)
