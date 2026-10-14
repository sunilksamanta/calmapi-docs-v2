# Local file storage (storage-local)

File uploads to the server's disk, with a `file` resource for the metadata. Uploads are checked against a type and size allowlist, the first bytes must match the declared type, stored names are random, and downloads are private to their owner.

```bash
npx calm add storage-local
```

| Adds | |
|---|---|
| Files | `app/blocks/storage-local/index.js`, `storage.js`; the `file` resource in `app/resources/file/` (resource, service and routes) |
| Dependency | `multer` |
| Environment | `UPLOAD_DIR=./uploads`, `UPLOAD_MAX_MB=10`, `UPLOAD_ALLOWED_TYPES=image/png,image/jpeg,image/gif,image/webp,application/pdf` |
| Conflicts with | `storage-s3` (both provide the `file` resource) |

Add `uploads/` to `.gitignore`.

## Routes

| Route | Policy | Does |
|---|---|---|
| `POST /api/files/upload` | authenticated | Upload one file as `multipart/form-data`, field `file`. `201 { data: file }` |
| `GET /api/files` | owner, admin | Your files (admins: all), with the usual filters: `?mimeType=image/png&sort=-size` |
| `GET /api/files/:id` | owner, admin | One file's metadata |
| `GET /api/files/:id/download` | owner, admin | The file itself |
| `DELETE /api/files/:id` | owner, admin | Deletes the record and the file on disk. `204` |

```bash
curl -H "Authorization: Bearer $TOKEN" -F file=@photo.png http://localhost:5001/api/files/upload
```

```json
{
  "data": {
    "id": "6acb4f0e7e4a738ebdd998c2",
    "originalName": "photo.png",
    "mimeType": "image/png",
    "size": 48213,
    "owner": "6acb46a57e4a738ebdd998b1",
    "createdAt": "2026-10-11T08:40:12.511Z",
    "updatedAt": "2026-10-11T08:40:12.511Z"
  }
}
```

From a browser:

```js
const form = new FormData();
form.append('file', input.files[0]);
const res = await fetch('/api/files/upload', { method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` } });
```

## What is checked

- **Signed in first.** The upload parser does not even run for signed-out requests.
- **Type allowlist.** The declared type must be in `UPLOAD_ALLOWED_TYPES`, otherwise `400`.
- **Size.** Larger than `UPLOAD_MAX_MB` is a `400`. One file per request.
- **Content.** For PNG, JPEG, GIF, WebP and PDF, the first bytes must match the declared type. An HTML file renamed `photo.png` is rejected and deleted.
- **Names.** Files are stored as `<uuid>.<ext>` in `UPLOAD_DIR`; the original name is only kept as metadata. The storage key is a `hidden()` field and never leaves the server.
- **Downloads.** Images are served inline; everything else as an attachment. Responses carry `X-Content-Type-Options: nosniff` and a sandboxing Content-Security-Policy, so an uploaded file cannot run scripts on your domain.

## Changing the rules

The code is in your project. Common changes:

- **Who sees what:** edit the policies in `app/resources/file/file.resource.js` (for example `read: 'authenticated'` for files any user may download).
- **More types:** add them to `UPLOAD_ALLOWED_TYPES`. Types without a known signature are accepted on the declared type alone; prefer types you can verify.
- **Linking files to records:** add `f.ref('file')` fields to your resources, and `?include=avatar` returns the file metadata.

Local disk does not work with several instances or ephemeral containers; `calm doctor --prod` points this out. Use [storage-s3](/blocks/storage-s3) there.

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/storage-local/AGENTS.md` and in the devtools Blocks panel.

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Multer (GitHub)](https://github.com/expressjs/multer)
- [Express API reference (res.sendFile)](https://expressjs.com/en/api.html)
- [MDN: Content-Disposition](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition)
- [MDN: X-Content-Type-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options)

## For AI agents

Coding agents read these notes in `app/blocks/storage-local/AGENTS.md`:

- Read first: `app/blocks/storage-local/storage.js` (Multer setup, type allowlist, magic bytes, `pathOf`, `remove`), `app/resources/file/` (`file.resource.js`, `file.routes.js`, `file.service.js`) and `index.js` (doctor, devtools).
- Configuration: env `UPLOAD_DIR` (`./uploads`), `UPLOAD_MAX_MB` (10), `UPLOAD_ALLOWED_TYPES` (PNG, JPEG, GIF, WebP, PDF). No `calm.config.js` options. Keep `uploads/` in `.gitignore`.
- Routes: `POST /api/files/upload` (multipart, field `file`, authenticated), `GET /api/files`, `GET /api/files/:id`, `GET /api/files/:id/download` and `DELETE /api/files/:id` (owner or admin).
- Invariant: files are stored under random UUID names with an extension from `EXT`; the uploaded name is metadata only, never part of a path. `pathOf` strips everything but `[\w.-]` from keys.
- Invariant: `key` is `.hidden()`; never expose it or accept it from a client.
- Invariant: the declared type must be on the allowlist, and `verifySignature` checks magic bytes for PNG, JPEG, GIF, WebP and PDF (and deletes the file on mismatch). Types without an entry in `SIGNATURES` are trusted on the declared type.
- Invariant: only `INLINE` image types are served inline; everything else downloads as `application/octet-stream` attachment, with `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'none'; sandbox`. Never add `image/svg+xml` or `text/html` to `INLINE` (stored XSS).
- Task, allow a new type: add it to `UPLOAD_ALLOWED_TYPES`, give it an extension in `EXT`, and a `SIGNATURES` check if the format has magic bytes.
- Task, change who can see files (public avatars, shared documents): edit the policies in `file.resource.js` and the download route policy in `file.routes.js` together.
- Deleting a file record removes the bytes in `FileService.afterDelete`; the privacy block calls it when an account is deleted.
- Pitfall: Multer limits are 1 file, 10 fields and `UPLOAD_MAX_MB`; errors become 400.
- Pitfall: local disk does not work with several instances or ephemeral containers; use storage-s3 instead (the two blocks conflict, install one).

<!-- block-guide:end -->
