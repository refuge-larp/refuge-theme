# Refuge shared theme

Shared presentation assets for participating Refuge website previews. National and chapter content, photographs and chapter-specific JavaScript stay in their own repositories. This repository does not control the existing production websites or Rails application.

## One change, participating sites updated

Edit the four files in `assets/`, review and commit, then publish a new immutable release such as `v1.0.1`. Participating sites check for releases hourly and on content pushes. Each build resolves the release tag to a commit, copies its assets into a static artifact, runs browser checks and deploys only if those checks pass. Published pages do not depend on runtime requests to this repository.

Each site has `theme.json`:

```json
{"release":"latest"}
```

To hold or roll back a site, set its release to a known tag, for example `v1.0.0`, and push. Never move an existing release tag. A failed build leaves the previous Pages deployment in place. Scheduled Actions can be delayed; they are not an instantaneous rollout guarantee. GitHub may disable schedules in inactive public repositories after 60 days, so monitor Actions and run manually or push content to resume.

The reusable workflow is pinned by the consumer to a commit. Its tooling checkout is pinned to `v1.0.0`. Theme asset releases update automatically; workflow or test-tooling changes require an explicit reviewed consumer update. No cross-repository write tokens or new secrets are required.

## Shared contract

- `styles.css`: base presentation, 12 named palettes and typography.
- `polish.css`: shared visual adjustments.
- `motion.css` and `motion.js`: progressive motion and reduced-motion behavior.
- Sites retain `data-theme`, `#theme`, `.mosaic .tile`, `#photo-dialog` and existing shared classes. Optional sections remain local content.
- Styles are loaded by relative paths, so project Pages subdirectories work.

Source: supplied Claude Design public-site export, adapted in Refuge Next. Existing themes are design options, not a claim of WCAG compliance. Contrast, human screen-reader usability and cross-browser checks remain release review responsibilities.

## Testing

`scripts/check.cjs` checks 320/390/1440px in normal and reduced-motion modes, image loading, page errors, local asset responses, overflow, local anchors, theme changes and photo lightbox focus return. It also checks no-JavaScript resource navigation. This is smoke coverage, not full accessibility certification.

`scripts/build.py SITE NEW_OUTPUT` requires a new output directory and public GitHub access. It copies site content, adds the selected theme assets and writes `theme-version.json` with the exact release and commit. The deployment workflow uses a separate generated output directory.
