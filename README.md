# Rebuild Your Focus

A suite of free, open-source brain training games and guides.

🔗 **https://rebuildyourfocus.com** *(coming soon)*

## Apps

| App | Description | Status |
|---|---|---|
| [Dual N-Back](./apps/dual-n-back/) | Working-memory trainer following the [Jaeggi 2008](https://www.pnas.org/doi/10.1073/pnas.0801268105) paradigm | ✅ Live |
| [Double Decision](./apps/double-decision/) | Speed-of-processing / UFOV trainer following the [ACTIVE trial](https://jamanetwork.com/journals/jama/fullarticle/195506) paradigm | 🚧 In development |
| (more coming) | — | — |

## Philosophy

- **Free, no ads, no tracking** — sessions are stored locally on your device
- **Open source under MIT** — fork it, host it, contribute back
- **Evidence-based** — every claim links to the research; see the [literature review](./apps/dual-n-back/src/content/literature-review.md) for the honest picture (it's contested)
- **Local-first** — works offline; accounts and cloud sync are deliberately not yet built

## Repo structure

This is a npm-workspaces monorepo:

```
rebuildyourfocus/
├── apps/                 each game / surface
│   ├── dual-n-back/      first game
│   └── double-decision/  second game (in development)
├── packages/             shared code (added when there's something to share)
├── docs/                 project-wide documentation
│   └── superpowers/      design specs + implementation plans
├── package.json          workspace root
└── README.md
```

## Development

```bash
git clone https://github.com/jonathanleane/rebuildyourfocus.git
cd rebuildyourfocus
npm install                  # installs all workspace deps
npm run dev                  # runs dual-n-back at http://localhost:5173
```

Per-app scripts:

```bash
npm -w dual-n-back run dev
npm -w dual-n-back run build
npm -w dual-n-back run test
npm -w dual-n-back run typecheck
```

## Roadmap

1. **Dual N-Back** ✅
2. Landing site at the root domain
3. More games (Stroop, mental math, Schulte tables — TBD)
4. Optional accounts + cross-game progress tracking
5. Native mobile builds (engine modules are already React-Native-portable by design)

## License

[MIT](./LICENSE) © 2026 Jonathan Leane
