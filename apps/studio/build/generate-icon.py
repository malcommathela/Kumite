"""
Generate the Kumite application icons.

The mark is drawn geometrically rather than supplied as artwork: a warm amber
stem with two off-white arms on a charcoal rounded square, modelled on the app's
own palette (`background-kumite` / `foreground-kumite`). Everything is rendered
at 4x and downsampled, so edges stay crisp at 16px and 1024px alike.

Usage (from apps/studio):
    python build/generate-icon.py

Writes build/icon.png (1024), build/icon.ico (multi-size) and build/icon.icns.
Requires Pillow. The generated files are checked in; re-run only when the mark
changes.
"""

from pathlib import Path

import math

from PIL import Image, ImageDraw

BUILD_DIR = Path(__file__).resolve().parent
MASTER = 1024
SCALE = 4
CANVAS = MASTER * SCALE

BACKGROUND = (21, 21, 21, 255)  # #151515, charcoal
AMBER = (245, 165, 36, 255)  # #F5A524
BONE = (244, 241, 234, 255)  # #F4F1EA


def s(value: float) -> int:
    """Scale a design-space value (1024 grid) to the supersampled canvas."""
    return round(value * SCALE)


def build_master() -> Image.Image:
    img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))

    # Rounded square field.
    ImageDraw.Draw(img).rounded_rectangle(
        (0, 0, CANVAS - 1, CANVAS - 1), radius=s(224), fill=BACKGROUND
    )

    stroke = s(92)

    # Arms first: their inner ends tuck behind the stem, so the junction reads as
    # a clean overlap instead of a wedge cut out of the amber bar.
    arm_length = s(380)
    half = s(190)
    for angle in (40.0, -40.0):
        arm = Image.new("RGBA", (arm_length, stroke), (0, 0, 0, 0))
        ImageDraw.Draw(arm).rectangle((0, 0, arm_length - 1, stroke - 1), fill=BONE)
        arm = arm.rotate(angle, resample=Image.BICUBIC, expand=True)
        # Pillow rotates counter-clockwise on screen, so the bar's outer end sits
        # at center + (half*cos, -half*sin). Solve for the centre that puts the
        # inner end on the stem's right edge, halfway down the stem.
        radians = math.radians(angle)
        cx = s(392) + half * math.cos(radians)
        cy = s(512) - half * math.sin(radians)
        img.alpha_composite(
            arm, (round(cx) - arm.width // 2, round(cy) - arm.height // 2)
        )

    # Stem, drawn last so it stays unbroken.
    stem = Image.new("RGBA", (stroke, s(756 - 268)), (0, 0, 0, 0))
    ImageDraw.Draw(stem).rectangle((0, 0, stroke - 1, stem.height - 1), fill=AMBER)
    img.alpha_composite(stem, (s(300), s(268)))

    return img.resize((MASTER, MASTER), Image.LANCZOS)


def main() -> None:
    master = build_master()
    master.save(BUILD_DIR / "icon.png", optimize=True)

    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    master.save(BUILD_DIR / "icon.ico", sizes=ico_sizes)

    icns_sizes = [(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512), (1024, 1024)]
    master.save(BUILD_DIR / "icon.icns", sizes=icns_sizes)

    print("wrote", BUILD_DIR / "icon.png", master.size)
    print("wrote", BUILD_DIR / "icon.ico", ico_sizes)
    print("wrote", BUILD_DIR / "icon.icns", icns_sizes)


if __name__ == "__main__":
    main()
