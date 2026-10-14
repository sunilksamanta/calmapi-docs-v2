# Background jobs (jobs)

A job queue and scheduler stored in MongoDB, so there is no Redis to run. Jobs retry with exponential backoff, run on a cron or interval schedule or when an event fires, and admins get an API and a devtools panel.

```bash
npx calm add jobs
```

| Adds | |
|---|---|
| Files | `app/blocks/jobs/index.js`, `queue.js`, `cron.js`; an example job in `app/jobs/welcome-email.js` |
| Environment | `JOBS_WORKER=on`, `JOBS_CONCURRENCY=4` |
| Collection | `calm_jobs` |
| Routes | `GET /api/jobs`, `GET /api/jobs/stats`, `POST /api/jobs/:jobId/retry`, `POST /api/jobs/enqueue` (all `admin`) |

## Define a job

Each file in `app/jobs/` default-exports a job:

```js
// app/jobs/welcome-email.js
import { defineJob } from '#app/blocks/jobs/index.js';

export default defineJob({
  name: 'welcome-email',
  on: 'auth.registered',   // run whenever this event fires, with its payload as data
  retries: 3,
  async run({ user }, { app }) {
    await app.mailer.send({
      to: user.email,
      subject: `Welcome to ${app.config.app.name}`,
      text: `Hi ${user.name},\n\nYour account is ready. Happy building!`,
    });
  },
});
```

| Option | Default | Meaning |
|---|---|---|
| `name` | required | Unique job name |
| `run(data, { app, job, log })` | required | The work. Throw to fail the attempt. The return value is stored as the job's `result`. |
| `retries` | `3` | Extra attempts after a failure |
| `backoff` | `'10s'` | Delay before the first retry, doubled on each attempt (capped at 1 hour) |
| `schedule` | none | Cron (`'0 9 * * 1-5'`, UTC) or interval (`'every 5m'`) |
| `on` | none | Event name or pattern that enqueues the job, for example `'order.created'` |

## Enqueue

From anywhere you have the app (routes, services, other jobs):

```js
const jobs = ctx.app.ext.jobs;

await jobs.enqueue('send-invoice', { invoiceId: invoice._id });
await jobs.enqueue('send-reminder', { userId }, { delay: '24h' });
await jobs.enqueue('nightly-report', {}, { runAt: new Date('2026-12-01T02:00:00Z') });
await jobs.enqueue('sync-customer', { id }, { uniqueKey: `sync:${id}` }); // one job per key
await jobs.enqueue('flaky-webhook', payload, { retries: 10 });
```

Durations accept `30s`, `5m`, `2h`, `1d` or milliseconds. With a `uniqueKey`, enqueuing again returns the existing job with that key (queued, running or finished) instead of creating a duplicate. Completed jobs keep their key until they are cleaned up.

## Schedules

```js
export default defineJob({
  name: 'cleanup-drafts',
  schedule: '0 3 * * *',  // every day at 03:00 UTC
  async run(_data, { app, log }) {
    const { deletedCount } = await app.model('post').deleteMany({
      status: 'draft',
      updatedAt: { $lt: new Date(Date.now() - 90 * 86_400_000) },
    });
    log.info(`Removed ${deletedCount} old drafts`);
    return { deletedCount };
  },
});
```

Cron expressions have five fields (minute, hour, day of month, month, day of week) with `*`, lists, ranges and steps (`*/15`, `1-5`), plus `@hourly`, `@daily`, `@weekly` and `@monthly`. Intervals are `every 30s`, `every 5m`, `every 2h`, `every 1d`. Each scheduled job exists once in the queue, however many instances you run, and a failed run is retried and then simply waits for its next time.

## Workers

Every instance with `JOBS_WORKER` not set to `off` runs a worker: it polls every second, claims due jobs atomically and runs up to `JOBS_CONCURRENCY` at a time. You can run as many instances as you like; a job is only ever claimed by one. Jobs whose worker died mid-run are put back in the queue after 5 minutes. On shutdown the worker stops claiming and waits up to 10 seconds for running jobs.

To keep web servers responsive, run dedicated workers: `JOBS_WORKER=off` on the web instances and `JOBS_WORKER=on` on one or more worker instances of the same app. `calm doctor` reminds you when the worker is off on an instance.

In tests the worker does not run. Process due jobs explicitly:

```js
await t.app.ext.jobs.drain();
```

Completed jobs are deleted after 7 days by a TTL index; failed jobs stay until you retry or remove them.

## Admin API

| Route | Does |
|---|---|
| `GET /api/jobs?status=failed&name=welcome-email&limit=50` | Recent jobs, newest first |
| `GET /api/jobs/stats` | Worker id, running count, job definitions and counts by name and status |
| `POST /api/jobs/:jobId/retry` | Queue a failed job again |
| `POST /api/jobs/enqueue` `{ name, data }` | Queue a job by name |

The devtools **Jobs** panel shows the same statistics and the latest jobs. The block emits `job.completed` and `job.failed` events.

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/jobs/AGENTS.md` and in the devtools Blocks panel.

- [MongoDB findOneAndUpdate](https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/)
- [MongoDB partial indexes](https://www.mongodb.com/docs/manual/core/index-partial/)
- [MongoDB TTL indexes](https://www.mongodb.com/docs/manual/core/index-ttl/)
- [crontab(5) manual page](https://man7.org/linux/man-pages/man5/crontab.5.html)

## For AI agents

Coding agents read these notes in `app/blocks/jobs/AGENTS.md`:

- Read first: `app/blocks/jobs/index.js` (loader, admin routes), `queue.js` (the `calm_jobs` queue: enqueue, atomic claim, retries), `cron.js` (schedule parser, UTC) and the example `app/jobs/welcome-email.js`.
- Configuration: env `JOBS_WORKER` (`off`: this instance does not process jobs) and `JOBS_CONCURRENCY` (default 4). No `calm.config.js` options; queue defaults (`pollMs` 1000, `lockTimeoutMs` 5 min, `keepCompletedDays` 7) are arguments of `createQueue`.
- Task, add a job: create `app/jobs/<name>.js` with `export default defineJob({ name, run(data, { app, job, log }), retries, backoff, schedule, on })`, `defineJob` from `#app/blocks/jobs/index.js`. Every `.js` file in `app/jobs/` must default export `defineJob(...)` or boot fails; names must be unique.
- Task, enqueue: `await ctx.app.ext.jobs.enqueue('name', data, { delay: '10m', runAt, uniqueKey, retries })`. With `uniqueKey` a second enqueue returns the existing job instead of a duplicate.
- Schedules: 5 field cron in UTC, `@hourly`, `@daily`, `@weekly`, `@monthly`, or `'every 30s|5m|2h|1d'`. There is one `schedule:<name>` document per job, requeued for its next time after success or final failure.
- Event triggers: `on: 'auth.registered'` enqueues the job with the event payload as `data`.
- Invariant: `run()` must be idempotent. Failures retry with backoff doubling from `backoff` (default `10s`, capped at 1 hour), and a job whose worker died is requeued after `lockTimeoutMs`, so it can run twice.
- Invariant: `data` is stored as is and admins read it through `GET /api/jobs`. Pass ids, not secrets, tokens or whole documents with sensitive fields (`on:` triggers store the full event payload, so check what the event carries).
- Admin API (policy `admin`): `GET /api/jobs?status=&name=&limit=`, `GET /api/jobs/stats`, `POST /api/jobs/:jobId/retry` (failed jobs), `POST /api/jobs/enqueue { name, data }`.
- Events: `job.completed` and `job.failed` (final failure only) for alerts.
- Tests: the worker never starts in test mode; call `await app.ext.jobs.drain()` to run due jobs.
- Pitfall: a `run()` longer than `lockTimeoutMs` can be claimed again by another worker; split long work into smaller jobs.
- Pitfall: completed jobs are deleted after 7 days (TTL index on `finishedAt`), failed ones stay until retried or removed.

<!-- block-guide:end -->
