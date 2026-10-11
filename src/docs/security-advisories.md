# Security advisories

CalmAPI copies its code into your project, so `npm audit` cannot see problems in it. Advisories for that code are published here and in the CLI, and `calm doctor` checks your project against every published advisory.

## Current advisories

Advisories for CalmAPI 1.x will be published here together with their fixes. Until then, and after every release, check your 1.x project with the latest CLI:

```bash
npx calmapi@next doctor
```

Inside a CalmAPI 2 project, use `npx calm doctor`. Each finding names the advisory, the affected files and the fix.

## Staying informed

- Watch the [calmapi repository](https://github.com/sunilksamanta/calmapi) on GitHub for security advisories and releases.
- Run `npx calm doctor --ci` in your CI pipeline, so new advisories are reported on the next build.
- Apply fixes to framework files with [`calm upgrade`](/docs/upgrading).

To report a vulnerability, see [Security](/docs/security#reporting-a-vulnerability).
