# ASCII Habitat

ASCII Habitat is a Chrome New Tab extension built on this repository's ASCII animal engine. Each species has its own detailed character-cell design, movement, depth, and reaction to clicks. The Tweaks panel keeps movement and appearance controls, with settings saved separately for each animal.

By [Aditya Joshi](https://adi-21-4.github.io/) · [GitHub profile](https://github.com/adi-21-4)

The New Tab page keeps the greeting, a compact current-animal picker that expands on click, six quick links (Gmail, YouTube, ChatGPT, Slack, GitHub, and Notion), and a live local clock/date above the animated habitat.

Glass controls apply across the search surface, species picker, quick-link dock, and Tweaks panel. Edit, remove, and add quick-link buttons in Tweaks; names and web addresses are saved locally.

## Build and install in Chrome

1. Open this folder in VS Code.
2. Run `npm install`.
3. Run `npm run build`.
4. In Chrome, open `chrome://extensions` and turn on **Developer mode**.
5. Choose **Load unpacked** and select this project's `dist` folder.
6. Open a new tab to see ASCII Habitat.

After making changes, run `npm run build` again and click the extension's reload button on `chrome://extensions`.

## Development

- `npm run dev` starts the local Vite preview.
- `npm run typecheck` checks TypeScript.
- The same page works locally and as the extension's New Tab override.
- The extension uses local browser storage through the page's origin; it asks for no Chrome permissions and loads no remote scripts or fonts.

## Animals

| Animal | Movement and character |
| Butterfly | Morphos flutter, zigzag, and glide with wings flat. |
| Koi | Koi swim along bending S-curves; click to drop food and attract nearby fish. |
| Jellyfish | A pulsing magenta bell with twisting frilled arms and drifting marine snow. |
| Dragonfly | Hovers, darts, and cruises with individually veined wings. |
| Frog | Spotted frogs breathe, blink, and leap in an arc with a landing splash. |
| Crane | Red-crowned cranes flap and glide independently. |
| Crab | Crabs scuttle sideways in bursts; click to startle them into a bolt. |

The shared flock handles population, depth, course, re-entry, separation, and click reactions in `src/flock.ts`. The cell renderer is in `src/renderer.ts`; species artwork and behavior live in `src/animals/`; the simulation loop is in `src/engine.ts`.

The greeting starts as **Hello, User**. Change the name from **Tweaks → Personalization**; it is saved on this device. The center search field submits queries to Google. The animation itself works offline after the extension is built.