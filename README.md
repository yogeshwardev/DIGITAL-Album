# శుభ వివాహం · దొరబాబు ❤ రేవతి

Digital wedding album — N. Dorababu & N. Revathi, 7 September 2005, Sri Eswara Temple, Kattamanchi.

A phone-first Telugu website: the two wedding DVDs (remastered to HD, split into labelled moments),
the invitation (శుభలేఖ), and photo albums with music.

**The videos are not in this repository** (they are several GB each). They live in `media/` on the home PC.
Run `Start Show.bat` on that PC and open the address it shows on any phone on the same Wi-Fi.
See `HOW TO USE.txt`.

## Deploying

- **GitHub Pages**: https://yogeshwardev.github.io/DIGITAL-Album/
- **Cloudflare Workers** (static assets): `wrangler.jsonc` serves this folder. `.assetsignore` keeps the
  multi-GB videos, `tools/` and PC-only files out (Cloudflare's limit is 25 MiB per file);
  `_headers` sets caching. Deploy with `npx wrangler deploy`, or push to `main` if the repo is
  connected to Cloudflare.
- **Videos** are streamed from the GitHub release `videos` (`disc1-web.mp4`, `disc2-web.mp4`, each under 2 GB).
  The URL is `onlineVideos` in `config.js`. To replace them: `tools/upload-videos.ps1`.
