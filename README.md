# Portfolio

Source code of my personal portfolio and services website: **[visit the live site](https://edizkesici.github.io)**

I'm Ediz, a computer science student specializing in AI at HELMo. I build custom websites and automation tools that take over repetitive work. This site presents the projects I've built, my background, and how to reach me.

## What's on the site

- **Home**: the services I offer and a pinned horizontal strip of featured projects.
- **Background** (`/parcours`): education, skills, certifications and experience.

## Stack

| Part | Choice |
| --- | --- |
| Framework | [Astro](https://astro.build) 7, static output, no UI framework |
| Styling | Hand-written CSS (glass / Frutiger Aero look, dark theme only) |
| Scripts | One small vanilla JavaScript file (bubbles, reveals, contact button) |
| Horizontal projects strip | CSS scroll-driven animation (`view-timeline`), falls back to a vertical grid on phones, touch screens, reduced motion and browsers without support |
| Fonts | Bricolage Grotesque and Figtree, self-hosted via Fontsource |
| Hosting | GitHub Pages, deployed by GitHub Actions on every push to `main` |

## Run it locally

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/
npm run preview    # serve the production build
```

Requires Node.js 22.23.4 or newer (the minimum Astro 7 declares).

## Project structure

```text
src/
  components/   Header, Footer, Home, Parcours, Privacy
  i18n/ui.js    All French and English texts
  layouts/      Base layout (head, sky, bubbles)
  pages/        fr at the root, en under /en
  scripts/      Client-side JavaScript
  styles/       global.css
public/         Favicons, share images, project screenshots
.github/workflows/deploy.yml   Build and deploy to GitHub Pages
```

## Contact

Through the [site](https://edizkesici.github.io) ("Contact" section).

## License

**All rights reserved.** See [LICENSE](LICENSE). The code, design, visual style, texts, images and screenshots of this site may not be copied, reused or adapted. The names, logos and screenshots of the projects shown belong to their respective owners and are not licensed here.
