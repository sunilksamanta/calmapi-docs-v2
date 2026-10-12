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
