# Contributing to md-analyzer

Thanks for wanting to help. PRs, bug reports, and feature requests are welcome.

## Branch strategy

Two branches with separated concerns:

- **main** — source only, pristine, release-ready. Tags go here.
- **develop** — active workbench. Audit files, planning docs, experiments, todos.

All contributions target **develop**. Maintainer cherry-picks only source commits to `main` after review. See [cto-branch-strategy](../.agents/skills/cto-branch-strategy/SKILL.md) for full rationale.

| Action | Branch |
|--------|--------|
| Open a PR | `develop` |
| File a bug | `main` (tagged issue, no branch needed) |
| Urgent hotfix | `main` ➜ hotfix branch ➜ merge to `main` + cherry-pick to `develop` |

## Getting Started

```bash
# Fork the repo on GitHub first, then clone your fork
git clone https://github.com/<your-username>/md-analyzer.git
cd md-analyzer
git remote add upstream https://github.com/Ev3lynx727/md-analyzer.git

# Install dependencies
npm install

# Activate pre-commit hooks (one-time, per clone)
pre-commit install
```

The `pre-commit install` step pins the hook versions to what CI uses. Without it, you can commit code that passes your local lint but fails CI.

## Running Tests

```bash
npm test
```

All tests must pass before submitting a PR.

## PR Guidelines

1. Fork the repo and create a feature branch off `develop`:
   ```bash
   git checkout develop
   git checkout -b feat/my-thing
   ```
2. Write your code
3. Add or update tests if applicable
4. Run `npm test` — everything must pass
5. Commit with a clear message following [conventional commits](https://www.conventionalcommits.org/):
   - `feat: add frontmatter validator`
   - `fix: handle empty heading edge case`
   - `docs: update README examples`
   - `chore: bump dependencies`
   - **Keep source and .md commits separate** — never mix `src/` changes with `.md` changes in the same commit
6. Push to your fork and open a PR against `develop`

## Code Style

- **Language**: TypeScript, strict mode
- **Naming**: `camelCase` for functions/variables, `PascalCase` for types/interfaces
- **Lint**: `npm run lint` — zero warnings before commit
- **Formatting**: Follow existing patterns in `src/`
- **Dependencies**: Minimize. No new deps without discussion.

## Architecture Decisions

If you're planning a significant change, open an issue first to discuss the approach. Key principles:

- **Regex-first, AST second**: Current extractors are pure regex (fast, predictable). Micromark integration (if pursued) is a shadow-parser overlay that corrects regex blind spots — it never replaces the regex layer.
- **CLI-first**: The tool is a terminal command. Library mode is secondary.
- **Config over convention**: Hooks and rules live in `hooks.toml` and `config.yaml`.
- **Verbatim output**: Never summarize or transform extracted content. Return what's in the file.

## Community

- **Issues**: Bug reports and feature requests welcome at [github.com/Ev3lynx727/md-analyzer/issues](https://github.com/Ev3lynx727/md-analyzer/issues)
- **Discussions**: For questions and ideas

## License

MIT — your contributions will be released under the same license.

## Git identity for contributions

Before pushing commits, verify that Git is configured with an email address that GitHub can associate with your account:

```bash
git config user.name
git config user.email
```

This is especially important when commits are created through agentic coding tools or automation. Avoid placeholder values such as `your@email.com` or localized template text.
