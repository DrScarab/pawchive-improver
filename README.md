# Pawchive Reader

A [Tampermonkey](https://www.tampermonkey.net/) userscript that makes long [Pawchive](https://pawchive.pw/) posts easier to read. It adds a small floating settings panel, tracks reading progress, and puts previous/next navigation at the bottom of the post as well as at the top.

## Features

- **Text size** from 12 to 34 px.
- **Line height** from 1.20 to 2.20.
- **Typeface** selection: sans, serif, wide sans, or monospace.
- **Content width** from 480 to 1600 px, keeping the post, header, and comments in one column.
- **Word count and estimated reading time** for the post.
- **Reading progress percentage**:
  - Shown in the settings panel.
  - Shown under the collapsed `Aa` button, so progress stays visible while reading.
  - Measured against the post content only: 0% at the start and 100% at the end before the comments.
- **Duplicate previous/next navigation** below the post and above the comments, with the column border kept continuous.
- Settings are saved in `localStorage` and restored on the next visit, including the collapsed state.
- Works with Pawchive's boosted (htmx) navigation: changing chapters keeps the layout and settings intact.

## Install

1. Install a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), or Greasemonkey.
2. Install the script from the raw file:

   [pawchive-reader.user.js](https://raw.githubusercontent.com/DrScarab/pawchive-improver/main/pawchive-reader.user.js)

   Or paste that URL into the manager's "Install from URL" dialog.
3. Open any post on `https://pawchive.pw/`.

## Usage

- Click the **Aa** button in the bottom-right corner to open the settings panel.
- Adjust the sliders or choose a typeface; changes apply immediately.
- Click **×** to collapse the panel. The current reading percentage remains under the `Aa` button.
- **Reset to defaults** restores 18 px text, 1.65 line height, sans typeface, and 760 px content width.
- The percentage updates as you scroll and as the page resizes or loads images.

Settings are stored locally in the browser. The script makes no network requests and collects no data.

## How it works

The script:

- Sets CSS custom properties on the document root for font size, line height, typeface, and column width.
- Injects one stylesheet marked with `data-keep` so the site's htmx navigation does not remove it.
- Re-applies the interface after htmx swaps and history restores.
- Clones the post's previous/next navigation below the content, routing clicks through the original top links so Pawchive's instant navigation still works.
- Counts words in the post content and calculates progress from the content's position relative to the viewport.

## Compatibility

- **Site:** `https://pawchive.pw/*` (features appear on post pages).
- **Managers:** Tampermonkey, Violentmonkey, Greasemonkey.
- **Browsers:** current Chrome, Firefox, Edge, and Safari versions.

## Development

The project is a single userscript with no build step or dependencies. Edit `pawchive-reader.user.js`, then check it with:

```sh
node --check pawchive-reader.user.js
```

## License

MIT © 2026 DrScarab
