# Upgrading

The framework lives in your project as `calm/`, and you are free to edit it. `calm upgrade` brings in fixes and features from new CalmAPI releases **without** overwriting your edits.

```bash
npm install -D calmapi@latest   # the new CLI carries the new framework files
npx calm upgrade --dry-run      # see the plan
npx calm upgrade                # apply it
npx calm doctor && npm test
```

## How it works

`calm.lock` records the CalmAPI version your `calm/` folder came from and the SHA-256 hash of every framework file as it was shipped:

```json
{
  "lockfileVersion": 1,
  "calmapi": "2.0.0-alpha.0",
  "template": "api",
  "core": {
    "calm/app.js": "sha256:585bd812...",
    "calm/errors.js": "sha256:3c0f9e21..."
  },
  "blocks": {}
}
```

For each file, `calm upgrade` compares three versions: **yours** (what is in `calm/` now), the **original** (the file as shipped in the version in `calm.lock`) and the **new** one (from the CLI you just installed). The hash tells it whether you changed the file.

| Your file | Upstream | Result | Shown as |
|---|---|---|---|
| unchanged | changed | replaced with the new version | `update` |
| edited | changed, no overlap | three-way merge: your edits plus the upstream change | `merge` |
| edited | changed, same lines | written with conflict markers for you to resolve | `conflict` |
| does not exist | new file | added | `add` |
| unchanged | removed | deleted | `delete` |
| edited | removed | kept | `kept` |
| deleted by you | still exists | left deleted | `skipped` |
| exists, not in `calm.lock` | exists | your file is kept, the new version is written next to it as `<file>.calm-new` | `conflict` |
| edited, original not available | changed | your file is kept, the new version is written as `<file>.calm-new` | `review` |
| edited | unchanged | your file stays as it is | |
| identical to the new version | | nothing to do | |

Then `calm.lock` is updated to the new version and hashes.

```text
  calm upgrade 2.0.0-alpha.0 → 2.0.0-alpha.1

  merge     calm/errors.js
  update    calm/logger.js
  conflict  calm/mail.js
  add       calm/testing.js

? Apply? [Y/n]
```

## Conflicts

A conflicting file contains both versions, like a git merge:

```js
<<<<<<< yours
// Outgoing email (ours).
=======
// Outgoing email.
>>>>>>> calmapi@2.0.0-alpha.1
```

Edit the file to keep what you want and remove the markers. A later `calm upgrade` leaves resolved files alone.

For `.calm-new` files, compare the two versions by hand (`git diff --no-index calm/mail.js calm/mail.js.calm-new`), merge what you need, and delete the `.calm-new` file.

## Where the original files come from

To merge, the upgrade needs the files as they were shipped in the version recorded in `calm.lock`. It downloads that version of the `calmapi` package once with `npm pack` and caches it in `~/.calm/cache`. Offline, or for an unpublished version, pass a checkout with `--base`:

```bash
npx calm upgrade --base ../calmapi/v2
```

Without the originals, edited files cannot be merged and get a `.calm-new` copy instead. The three-way merge uses `git merge-file`, so git must be installed.

## Tips

- Commit before upgrading, so the result is one reviewable diff.
- Prefer extending over editing: hooks in services, plugins in `app/blocks`, options in `calm.config.js`. The fewer edits in `calm/`, the fewer conflicts.
- `calm doctor` lists the framework files you changed locally and tells you when `calm/` is older than the installed CLI.
- `calm upgrade` only touches `calm/`. Your `app/` folder and files added by [blocks](/blocks) are never changed. Blocks are versioned in `calm.lock`; re-add one with `calm add <block> --dry-run` to see what changed upstream.
