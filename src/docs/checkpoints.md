# Checkpoints

Git takes care of the code. Checkpoints take care of the data: `calm checkpoint` snapshots your development database, and `calm restore` puts it back exactly as it was. Take one before a migration, a seed, a cleanup script, or before you let an agent loose on the data.

```bash
npx calm checkpoint                     # named "manual"
npx calm checkpoint "before migration"  # a name you will recognize
npx calm checkpoint list                # newest first
npx calm restore                        # the latest one, after a confirmation
npx calm restore 20261013-141500-before-migration --yes
npx calm checkpoint delete 20261013-141500-before-migration
```

`calm restore` shows what it will do first: each collection in the checkpoint with its document count next to the count now, and the collections that will be dropped. It asks before touching anything. Without a terminal (a script, CI) it refuses unless you pass `--yes`.

## What is stored, and where

A checkpoint is a folder in `.calm/checkpoints/<id>/`, which new projects keep out of git:

- `meta.json`: the id, name, note, when, the database name, the CalmAPI version, who took it (you, devtools, or an agent by name), and each collection with its document count.
- One `<collection>.ejson` file per collection: one document per line, in canonical Extended JSON, so ObjectIds, dates, binary data and number types come back as they were.

The id is the time plus the name: `20261013-141500-before-migration`.

## What a restore does

Every collection in the checkpoint is emptied and filled again from its file. Collections that exist now but were not in the checkpoint are dropped. The indexes of your resources are created again right away; everything else gets its indexes when the app next starts.

## In devtools

The **Data** panel has a **Checkpoints** menu: take one with a name, and restore or delete the ones you have. Each asks for confirmation with a sentence that says what will be replaced. The **Activity** panel shows every checkpoint that is created, restored or deleted, and who did it, with a **Restore** button on each created one.

## With agents

When a coding agent connects over [`calm mcp`](/ai-agents) and the dev server is running, a checkpoint named `before <agent> session` is taken automatically, unless one is less than ten minutes old. The five newest automatic checkpoints are kept. Agents can also call `calm_checkpoint` and `calm_restore`; restoring needs the `full` [scope](/ai-agents#scopes-what-an-agent-may-do).

## In code

```js
const meta = await app.checkpoints.create({ name: 'before import' });
await app.checkpoints.restore(meta.id);
await app.checkpoints.list();
await app.checkpoints.delete(meta.id);
```

## Limits

- **Development only.** Creating and restoring refuse to run in production. This is not a backup tool.
- **One database.** Only the database in `MONGODB_URI` is stored. Other databases on the same server are never touched.
- **Documents, not indexes or options.** Collection options (capped, validators, time series) are not stored.
- **Size.** Everything is read and written through the app. Fine for development data; slow for many gigabytes.
- GridFS buckets are two ordinary collections, so they are stored like any other.
