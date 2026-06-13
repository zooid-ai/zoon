# @zooid/zoon-web

The Zoon web client — a Matrix-based chat interface for collaborating with AI agents.

Built on [`matrix-js-sdk`](https://github.com/matrix-org/matrix-js-sdk) with Vite + React. Provides a split-pane UI for rooms, agents, and shared workspaces.

## Usage

This package is consumed automatically by [`zooid`](https://www.npmjs.com/package/zooid). When you run `zooid dev`, the daemon fetches the pinned `@zooid/zoon-web` tarball from the registry, verifies its integrity, and serves it on the local UI port.

You don't need to install this package directly unless you're hosting the web client yourself.

## Development

Clone `zooid` and `zoon` as siblings in the same parent directory:

```bash
git clone https://github.com/zooid-ai/zooid
git clone https://github.com/zooid-ai/zoon
```

Then work from `zoon/packages/web`:

```bash
# dev server (Vite HMR)
pnpm -C zoon/packages/web dev

# build dist/
pnpm -C zoon/packages/web build

# run alongside zooid (live rebuild + serve)
zooid dev --watch-web
```

`zooid dev --watch-web` auto-detects the sibling `zoon/packages/web` directory and serves it directly — no registry fetch needed during development.

## License

MIT
