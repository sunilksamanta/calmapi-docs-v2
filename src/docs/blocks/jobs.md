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
