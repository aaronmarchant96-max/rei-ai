# Contributing to REI.ai

## Getting started

1. Clone the repo: `git clone https://github.com/aaronmarchant96-max/rei-ai`
2. Install dependencies: `npm install`
3. Run the dev server: `npm run dev`
4. Run tests: `npm test`

## Making changes

- Keep tests passing — 113 suites, 1321 tests as the safety net
- Write tests for new behavior before or alongside the implementation
- Follow the [Architecture Decision Record](docs/DECISIONS.md) format for significant design choices
- Keep commit messages descriptive — what changed and why

## Pull request checklist

- [ ] Tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No hardcoded credentials or API keys
- [ ] Landing page claims match current measured numbers
- [ ] New domains follow the [domain registry pattern](src/domains/)

## Code style

- React components use functional style with hooks
- CSS lives in `src/styles/reiTheme.css` for REI UI, `src/style.css` for global
- Prompt text lives in `src/systemPrompts.js`
- Domain configs live in `src/domains/<name>/index.js`

## Documentation

- Architecture decisions go in `docs/DECISIONS.md`
- Methodology changes go in `docs/fortis-et-liber.md`
- Testing philosophy is in `docs/TESTING.md`
- Root-level docs (`README.md`, `LICENSE`, `SECURITY.md`) are for external visitors

## Questions?

Open an issue on GitHub.
