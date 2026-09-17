#!/usr/bin/env python3
"""Render the store and intro screenshots from the scenes in store/scenes/.

Each scene is a small mock page (a job board, a company profile, a company
website, the popup) that runs the extension's real badge code from src/, with
a headline band above it. Headless Chrome renders it at 1024x640 CSS px with a
2x device scale factor; this script then scales the 2048x1280 capture to:

- `store/screenshots/1280x800/<scene>.png` — the exact size the Chrome Web
  Store asks for, headline included.
- `src/assets/screenshots/<name>.jpg` — the page area only (no headline, no
  browser chrome) at 1600px wide, for the intro page that ships inside the
  extension.

Nothing in the scenes is a real capture, so there is nothing to blur.

Needs the Vite dev server (`npm run dev`) so the scenes can import
src/content/badge.ts, and Pillow (`pip3 install Pillow`). Set CHROME to point
at a different Chrome/Chromium binary.
"""
import os
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SCENES = ROOT / 'store' / 'scenes'
STORE_OUT = ROOT / 'store' / 'screenshots' / '1280x800'
INTRO_OUT = ROOT / 'src' / 'assets' / 'screenshots'

DEV_SERVER = os.environ.get('DEV_SERVER', 'http://localhost:5173')
CHROME = os.environ.get('CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')

# Scene page size and the scale factor Chrome renders it at.
PAGE_W, PAGE_H, DPR = 1024, 640, 2
STORE_W, STORE_H = 1280, 800
INTRO_W = 1600

# The page area inside the mock browser window, in CSS px (see store/scenes/frame.css:
# .window is inset 52px left/right, starts at 172px and ends 26px above the bottom;
# its toolbar is 36px tall).
PAGE_AREA = (52, 172 + 36, PAGE_W - 52, PAGE_H - 26)

# Scenes that also feed the intro page, and the file name it imports.
INTRO = {
    '01-job-page': 'job-page.jpg',
    '03-similar-sponsors': 'company-page.jpg',
    '04-company-website': 'company-website.jpg',
}


def render(scene: str, out: Path) -> None:
    """Screenshot one scene. Chrome writes the file after --timeout and then, with
    the dev server's HMR socket still open, does not always exit on its own, so
    it is stopped as soon as the file has stopped growing."""
    url = f'{DEV_SERVER}/store/scenes/{scene}.html'
    with tempfile.TemporaryDirectory() as profile:
        proc = subprocess.Popen(
            [
                CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                '--no-first-run', '--no-default-browser-check', f'--user-data-dir={profile}',
                f'--window-size={PAGE_W},{PAGE_H}', f'--force-device-scale-factor={DPR}',
                # capture after a fixed delay: module imports, React and the popup's debounce need a moment
                '--timeout=4000',
                f'--screenshot={out}', url,
            ],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        try:
            deadline = time.time() + 60
            size = -1
            while time.time() < deadline:
                time.sleep(0.5)
                if proc.poll() is not None:
                    break
                if out.exists():
                    if out.stat().st_size == size:
                        break
                    size = out.stat().st_size
            else:
                sys.exit(f'{scene}: Chrome produced no screenshot within 60s')
        finally:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(5)
                except subprocess.TimeoutExpired:
                    proc.kill()
    if not out.exists():
        sys.exit(f'{scene}: Chrome exited without writing a screenshot')


def main() -> None:
    try:
        urllib.request.urlopen(f'{DEV_SERVER}/store/scenes/frame.css', timeout=3)
    except Exception as e:  # noqa: BLE001
        sys.exit(f'Dev server not reachable at {DEV_SERVER} ({e}). Run `npm run dev` first.')
    if not Path(CHROME).exists():
        sys.exit(f'Chrome not found at {CHROME}; set CHROME=/path/to/chrome')

    STORE_OUT.mkdir(parents=True, exist_ok=True)
    INTRO_OUT.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])

    for page in sorted(SCENES.glob('*.html')):
        scene = page.stem
        if only and scene not in only:
            continue
        with tempfile.TemporaryDirectory() as tmp:
            raw = Path(tmp) / 'raw.png'
            render(scene, raw)
            im = Image.open(raw).convert('RGB')
        if im.size != (PAGE_W * DPR, PAGE_H * DPR):
            sys.exit(f'{scene}: unexpected capture size {im.size}')

        store = im.resize((STORE_W, STORE_H), Image.LANCZOS)
        store.save(STORE_OUT / f'{scene}.png', 'PNG', optimize=True)
        print(f'{STORE_OUT / f"{scene}.png"}  {STORE_W}x{STORE_H}')

        if scene in INTRO:
            x0, y0, x1, y1 = (v * DPR for v in PAGE_AREA)
            area = im.crop((x0, y0, x1, y1))
            intro = area.resize((INTRO_W, round(area.height * INTRO_W / area.width)), Image.LANCZOS)
            intro.save(INTRO_OUT / INTRO[scene], 'JPEG', quality=82, optimize=True)
            print(f'{INTRO_OUT / INTRO[scene]}  {intro.width}x{intro.height}')

    print('\nOpen the images before shipping: a scene that overflowed its window is only visible by eye.')


if __name__ == '__main__':
    main()
