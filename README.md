# canvas-particles

A lightweight particle background drawn on an HTML canvas. Particles drift slowly, fade in and out near the edges, and are gently pulled towards the pointer. No dependencies, written in TypeScript.

**Live demo:** https://mitchellslager.github.io/canvas-particles/

## Features

- Smooth movement at any refresh rate (frame-time based, not frame-count based)
- Sharp on high-DPI screens
- Resizes with its container via `ResizeObserver`
- Respects `prefers-reduced-motion`: particles are shown but not animated
- Configurable through `data-` attributes, no JavaScript needed per instance

## Usage

Place a `<canvas>` with the class `particle-animation` inside a container element. The canvas takes the size of its parent.

```html
<div class="container" aria-hidden="true">
	<canvas
		class="particle-animation"
		data-particle-quantity="50"
		data-particle-speed="0.2"
	></canvas>
</div>
```

Every `.particle-animation` canvas on the page is initialized automatically by `src/main.ts`.

You can also create an instance yourself:

```ts
import { ParticleAnimation } from "./components/particles";

const animation = new ParticleAnimation(canvas, { quantity: 80, speed: 0.5 });

// Stop the animation and remove listeners
animation.destroy();
```

### Options

| Option      | Data attribute            | Default | Description                                                        |
| ----------- | ------------------------- | ------- | ------------------------------------------------------------------ |
| `quantity`  | `data-particle-quantity`  | `30`    | Number of particles.                                               |
| `speed`     | `data-particle-speed`     | `1`     | Drift speed. `0` keeps particles in place.                         |
| `staticity` | `data-particle-staticity` | `50`    | How strongly particles resist the pointer. Higher means less pull. |
| `ease`      | `data-particle-ease`      | `50`    | How slowly particles follow the pointer. Higher means smoother.    |

Particles are drawn in white, so use a dark background behind the canvas.

## Development

Requires Node.js and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev       # start the dev server
pnpm build     # type-check and build to dist/
pnpm preview   # serve the production build
```

## Deployment

Every push to `main` builds the site and deploys it to GitHub Pages through [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The Vite `base` in [`vite.config.ts`](vite.config.ts) is set to `/canvas-particles/` to match the Pages URL.
