# Review and sign

An agent can write a lot of code in an afternoon. Somebody still has to say "yes, this is what the API should do". `calm review` is that moment: it shows what changed since the last time a person signed, in behavior terms, and `calm review --sign` records that a person read it and accepted it. The signature is a small file you commit with the change, and CI can fail when access widens beyond it.

```bash
npx calm review              # read what changed since the last signature
npx calm review --sign       # accept it: writes .calm/reviews/ (commit it)
npx calm review --list       # only the files agents changed that nobody signed
npx calm review --ci         # exit 1 when access widened since the last signature
```

## What a review shows

```text
  CalmAPI review · since Ada Lovelace signed 2026-10-13 08:41

  Behavior (7)
    ~  GET    /api/products      policy: authenticated -> public          looser  app/resources/product/product.resource.js
    ~  GET    /api/products/:id  policy: authenticated -> public          looser  app/resources/product/product.resource.js
    ~  product.name              visible to: signed-in users -> everyone  looser  app/resources/product/product.resource.js
    ~  product.price             visible to: signed-in users -> everyone  looser  app/resources/product/product.resource.js
    ~  product.status            visible to: signed-in users -> everyone  looser  app/resources/product/product.resource.js
    ~  product.tags              visible to: signed-in users -> everyone  looser  app/resources/product/product.resource.js
    ~  product.owner             visible to: signed-in users -> everyone  looser  app/resources/product/product.resource.js
    7 widen access.

  Written by agents, not signed (2)
    app/resources/product/product.resource.js  claude-code  2026-10-13 09:24                      access rules
    test/products.test.js                      claude-code  2026-10-13 09:22, then edited by you

  Declared by agents (1 declaration, 3 changes)
    claude-code Show products to visitors of the storefront
    ! declared, not made  route GET /api/products/featured
    ✖ different  route GET /api/products/:id: declared policy authenticated, shipped policy public

  Tests ✔ 6 passed (claude-code, 09:26)

  Sign it with calm review --sign, or in devtools: Review.
```

Four parts, each only when it has something to say:

- **Behavior**: the [behavior diff](/behavior-diff) between the last signed baseline and the code as it is now: routes added or removed, who may call them, fields more people can see, environment variables, hosts, events, blocks and [invariants](/invariants). Changes that widen access are marked `looser` and counted.
- **Written by agents, not signed**: every file an AI agent changed since the last signature, from the [Activity log](/ai-agents#watching-an-agent-work), with the agent's name and when. Edits to [protected paths or access rules](/ai-agents#scopes-what-an-agent-may-do) carry their reason. An agent's edit stays unsigned until a person signs, even if you edited the file afterwards (shown as `then edited by you`): touching a file is not reviewing it. Files that were deleted again are left out.
- **Declared by agents**: what agents said they would change with [`calm_declare`](#for-agents-calm_declare-and-calm_review), next to what they did.
- **Tests**: the last test run an agent made with `calm_test` since the signature.

The first time, nothing is signed yet, so there is nothing to compare with:

```text
  CalmAPI review · nothing signed yet

  There is no signed baseline. Signing accepts the current behavior; later reviews show what changed from it.

  Sign it with calm review --sign, or in devtools: Review.
```

## Signing

```bash
npx calm review --sign --note "Products are public for the storefront launch"
```

It prints the review, then asks before it writes anything: `Sign 7 changes, 7 widening access as Ada Lovelace <ada@example.com>?` (the default answer is no). The first signature accepts the current behavior as the baseline. When nothing changed since the last signature it says `Nothing to sign: nothing changed since the last signature.` and writes nothing.

```text
✔ Signed 2026-10-13-4f9c2a as Ada Lovelace at 7d630d3+changes
  Commit .calm/reviews/ with your change, so the next review and CI start from here.
```

| Option | Meaning |
|---|---|
| `--sign` | Accept what changed and write the signature |
| `--note <text>` | Why these changes are fine, stored with the signature |
| `--as "Name <email>"` | Sign as this person instead of your git user |
| `-y`, `--yes` | Do not ask. Required without an interactive terminal (a script, `CI` set). |
| `--list` | Print only the files agents changed that nobody signed |
| `--ci` | Exit with code 1 when access widened since the last signature |
| `--json` | The whole review as JSON: `baseline`, `changes`, `summary`, `unreviewed`, `declarations`, `declared`, `tests`, `needsSignature` |

### Who signs

The signer is whoever is at the keyboard, the way git would put it in a commit: `GIT_AUTHOR_NAME` and `GIT_AUTHOR_EMAIL` when they are set, otherwise `git config user.name` and `user.email`. `--as "Ada Lovelace <ada@example.com>"` names someone else (the email is optional). Without a name the command stops and asks you to set `git config user.name` or pass `--as`.

The commit is recorded too: the short `HEAD`, plus `+changes` when the working tree has uncommitted changes, as in `7d630d3+changes`.

### Signing is for a person

`calm review --sign` refuses to run in an AI agent's shell. Claude Code sets `CLAUDECODE=1` for the commands it runs, and the CLI checks it:

```text
✖ Signing is for a person, and this shell belongs to an AI agent (claude-code). Sign in your own terminal, or in devtools: Review.
```

Agents can read the review (`calm_review`) but there is no tool to sign it.

## What is written

Signing writes two files in `.calm/reviews/`:

| File | Holds |
|---|---|
| `baseline.json` | The behavior snapshot that was accepted, with `reviewId`, `signedAt`, `signer` and `commit`. The next review compares against it. |
| `<date>-<id>.json` | The signature: `id`, `signedAt`, `signer` (`name`, `email`), `via` (`cli` or `devtools`), `commit`, `note`, `previous` (the review before), `accepted` (the changes, the agent files, the declaration check and the tests that were accepted) and `snapshotHash` |

Commit `.calm/reviews/` with the change it accepts. The rest of `.calm/` (activity, checkpoints, traffic) stays local: new projects have this in `.gitignore`:

```text
.calm/*
!.calm/reviews/
```

Projects created before reviews ignore all of `.calm/`. The review says so (`.gitignore hides .calm/reviews/`), and the first signature rewrites the line to the two above.

## In devtools

The **Review** panel shows the same review: the behavior changes with links to their files, the agent files nobody signed, the declarations and the last test run. At the bottom, a **Sign** form with your name and email (filled in from `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL` or your git config, and editable) and an optional note. Signing there writes the same files, with `via: "devtools"`. Once something has been signed, the panel's badge counts the changes and unsigned agent files, in red when one widens access or an agent's changes do not match what it declared.

Two other panels point at it: in **Routes** and **Resources**, a route or resource whose file an agent changed and nobody signed has an **unsigned** badge that opens Review.

## For agents: calm_declare and calm_review

Before an agent changes behavior, it can declare what it is about to do with the `calm_declare` [MCP tool](/ai-agents#calm-mcp-tools-for-coding-agents), in the words the review uses:

```json
{
  "intent": "Show products to visitors of the storefront",
  "changes": [
    { "kind": "route", "key": "GET /api/products", "policy": "public" },
    { "kind": "route", "key": "GET /api/products/:id", "policy": "authenticated" },
    "route GET /api/products/featured"
  ]
}
```

A change is a string that starts with its kind (`route`, `field`, `resource`, `env`, `host`, `event`, `block` or `invariant`) followed by its key: `"route POST /api/refunds"`, `"field order.total"`, `"env STRIPE_SECRET_KEY"`, `"host api.stripe.com"`. An object `{ kind, key, policy }` also promises the policy of a route, and `change` (`added`, `removed` or `changed`) what happens to it. At most 100 changes per declaration. The declaration is saved in `.calm/declarations/<id>.json` and the agent is told to call `calm_review` when it is done.

The review then compares the declarations made since the last signature with the behavior diff:

| Mark | Means |
|---|---|
| `✖ not declared` | The code changed something no declaration mentioned |
| `! declared, not made` | A declared change is not in the code |
| `✖ different` | The change was made, but not as declared: a different policy, or `added` where `removed` was promised |
| `✔ What changed matches what was declared.` | Everything lines up |

Fields whose visibility changed only because a declared route of their resource changed policy count as part of that route change, which is why the example above lists no field as undeclared.

`calm_review` gives the agent the same review in compact JSON (without the full snapshots), with a note that a person signs it. Its description asks the agent to call it before it says it is done and to show the developer anything that widens access. Both tools are available in every [scope](/ai-agents#scopes-what-an-agent-may-do), `read` included.

## In CI

```bash
npx calm review --ci
```

It compares the code in the pipeline with the committed `.calm/reviews/baseline.json` and exits with code 1 when at least one change widens access:

```text
  ✖ Access widened in 7 places since the last signature. A person signs it (calm review --sign) and commits .calm/reviews/.
```

Without a baseline it passes, with `No signed baseline yet: --ci passes.` Changes that do not widen access and unsigned agent files are shown but do not fail the build. To make a wider API pass on purpose, a person signs the review and commits `.calm/reviews/` with the change.

`calm review --ci` and [`calm diff --ci`](/behavior-diff) look at the same changes: the review compares with what a person last signed, the diff with a git ref. The [exposure budget](/exposure-budget) holds the API to a committed list of who may do what.
