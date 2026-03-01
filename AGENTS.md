# AGENTS.md

## Cursor Cloud specific instructions

This is a React/TypeScript + Rust/WASM static web application for music chord analysis and playback. There is no backend — it is a fully client-side SPA.

### Tech stack

- **Frontend**: React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, shadcn/ui
- **WASM module**: Rust compiled via `wasm-pack` to `frissonic-formulae/pkg/`
- **Package manager**: pnpm (lockfile: `pnpm-lock.yaml`)

### Key commands

Refer to `package.json` `scripts` section. Summary:

| Task | Command |
|---|---|
| Dev server | `pnpm run dev` (builds WASM then starts Vite on `:5173`) |
| Build WASM only | `pnpm run wasm-pack:dev` |
| TypeScript check | `pnpm run typecheck` |
| Lint | `pnpm run lint` |
| Production build | `pnpm run build` |

### Non-obvious caveats

- **Rust toolchain required**: The `wasm32-unknown-unknown` target and `wasm-pack` must be installed. The update script handles this.
- **pnpm v10 build script approval**: pnpm v10 blocks native package build scripts by default. After `pnpm install`, run `pnpm rebuild esbuild @tailwindcss/oxide @swc/core unrs-resolver` to ensure platform-specific binaries are available. The update script handles this.
- **`@eslint/eslintrc` missing from upstream**: The ESLint config (`eslint.config.mjs`) imports `@eslint/eslintrc` but it was not listed in `package.json`. It has been added as a devDependency to make `pnpm run lint` work.
- **`pnpm run dev` is sequential**: It runs `wasm-pack build --dev` first, then starts Vite. The initial WASM compilation takes ~15-20s on first run (subsequent runs use cached artifacts).
- **Pre-existing lint errors**: The codebase has ~354 pre-existing ESLint errors (mostly prettier formatting in shadcn/ui components and unused variables). These are not blockers.
- **No automated tests**: The repository does not include a test framework or test files.
- **The `frissonic-formulae/target/` directory is tracked in git** despite `target/` in `.gitignore`. Avoid committing changes to build artifacts in that directory.
