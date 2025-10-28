# Build Options

## Core Commands

### `npm restart`
**Use this during development.** Rebuilds the project and restarts the dev server so you can instantly view changes in the browser.

```bash
npm restart
```

**What it does:**
1. Kills any process on port 8080
2. Runs a full build
3. Starts the development server

### `npm run build:jamble`
Compiles TypeScript to JavaScript, increments the build number, injects version info, and outputs to `dist/`.

```bash
npm run build:jamble
```

### `npm run serve`
Starts the Python development server on port 8080. Visit `http://localhost:8080` to view the game.

```bash
npm run serve
```

### `npm run export:blog`
Copies `jamble.js` and `jamble.css` from `dist/` to your blog's static assets directory.

```bash
npm run export:blog
```

**Export location:** `~/blog/static/games/jamble/` (or `$JAMBLE_BLOG_ROOT/static/games/jamble/` if custom path is set)

**Using in blog posts:**
```html
{{< jamble >}}
```

The shortcode (in `shortcodes/jamble.html`) automatically loads the CSS/JS and initializes the game.

**Typical deployment workflow:**
```bash
npm run build:jamble
npm run export:blog
```
