"""Extract ISLAND outlines from the site's existing font for Three.js extrusion."""

import json
from pathlib import Path

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]


class OutlinePen(BasePen):
    def __init__(self, glyph_set):
        super().__init__(glyph_set)
        self.commands = []

    def command(self, name, *points):
        self.commands.append(name)
        self.commands.extend(str(round(value, 3)) for point in points for value in point)

    def _moveTo(self, point):
        self.start = point
        self.command("m", point)

    def _lineTo(self, point):
        self.command("l", point)

    def _qCurveToOne(self, control, end):
        # Three.js typeface outlines store the endpoint before the controls.
        self.command("q", end, control)

    def _curveToOne(self, first, second, end):
        self.command("b", end, first, second)

    def _closePath(self):
        self.command("l", self.start)


font = TTFont(ROOT / "scripts/fonts/UnboundedSans-Regular.ttf")
glyph_set = font.getGlyphSet()
cmap = font.getBestCmap()
glyphs = {}
for letter in sorted(set("ISLAND")):
    name = cmap[ord(letter)]
    pen = OutlinePen(glyph_set)
    glyph_set[name].draw(pen)
    glyphs[letter] = {
        "ha": font["hmtx"][name][0] + font["head"].unitsPerEm * 0.06,
        "o": " ".join(pen.commands),
    }

data = {
    "familyName": "UnboundedSans",
    "source": "scripts/fonts/UnboundedSans-Regular.ttf",
    "license": "scripts/fonts/OFL.txt",
    "resolution": font["head"].unitsPerEm,
    "boundingBox": {"yMin": font["head"].yMin, "yMax": font["head"].yMax},
    "underlineThickness": font["post"].underlineThickness,
    "glyphs": glyphs,
}
(ROOT / "src/views/Home/islandTextFont.generated.json").write_text(
    json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
