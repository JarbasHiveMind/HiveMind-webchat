"""The page ships no dead routes, dead handlers, unused assets, or insecure
or late-loaded CSS resources."""
import re
from pathlib import Path

PKG = Path(__file__).resolve().parent.parent / "hivemind_webchat"
CSS = (PKG / "static" / "css" / "app.css").read_text()
JS = (PKG / "static" / "js" / "app.js").read_text()


def test_no_dead_static_route_or_handler():
    import hivemind_webchat
    assert not hasattr(hivemind_webchat, "StaticFileHandler")
    source = (PKG / "__init__.py").read_text()
    # settings["static_path"] serves /static/; a second route is dead.
    assert "r\"/static/(.*)\"" not in source


def test_css_import_comes_first():
    rules = re.sub(r"/\*.*?\*/", "", CSS, flags=re.S).lstrip()
    imports = [m.start() for m in re.finditer(r"@import", rules)]
    assert all(i == 0 for i in imports), "an @import after a rule is ignored"


def test_css_loads_no_http_or_third_party_images():
    for rule in re.findall(r"background(?:-image)?:[^;]*", CSS):
        assert "url(" not in rule, rule


def test_css_has_no_rules_for_missing_elements():
    for selector in ["#player_container", "#movie", "#searchResponse", "#skitt-ui",
                     ".loader", ".credits", ".write-link", ".conversation-start",
                     "#footer", "#header", "#wrapper", ".right .top"]:
        assert selector not in CSS, selector


def test_js_has_no_contact_list_handlers():
    assert ".left .person" not in JS
    assert ".right .top .name" not in JS


def test_unused_assets_removed():
    for name in ["img/Logo2.png", "img/Logo2_.png", "img/blue_logo.png",
                 "img/blue_logo_menu.png", "js/jquery-3.2.1.min.js"]:
        assert not (PKG / "static" / name).exists(), name
