# S3 file storage (storage-s3)

Uploads that go straight from the browser to S3 (or Cloudflare R2, MinIO, any S3-compatible store) with presigned URLs, so file bytes never pass through your API servers. Objects stay private; downloads use short-lived signed URLs.

```bash
npx calm add storage-s3
```

| Adds | |
|---|---|
| Files | `app/blocks/storage-s3/index.js`, `s3.js`; the `file` resource in `app/resources/file/` |
| Dependencies | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| Environment | `S3_BUCKET`, `S3_REGION=us-east-1`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `UPLOAD_MAX_MB=10`, `UPLOAD_ALLOWED_TYPES` |
| Conflicts with | `storage-local` |

Without `S3_ACCESS_KEY_ID`, the AWS default credential chain is used (IAM role, profile, `AWS_*` variables). For R2 or MinIO, set `S3_ENDPOINT`. `calm doctor` reports a missing `S3_BUCKET`.

## The upload flow

**1. Ask for an upload URL.** The API checks type and size and creates a `pending` file record.

```bash
curl -X POST http://localhost:5001/api/files/presign -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"fileName":"cat.png","contentType":"image/png","size":48213}'
```

```json
{
  "data": {
    "file": { "id": "6acb51d27e4a738ebdd998d0", "originalName": "cat.png", "mimeType": "image/png", "size": 48213, "status": "pending", "owner": "6acb46a57e4a738ebdd998b1", "createdAt": "...", "updatedAt": "..." },
    "upload": { "url": "https://my-bucket.s3.us-east-1.amazonaws.com/uploads/...&X-Amz-Signature=...", "method": "PUT", "headers": { "Content-Type": "image/png" }, "expiresIn": 600 }
  }
}
```

**2. Upload the bytes** directly to S3, from the browser:

```js
await fetch(upload.url, { method: upload.method, headers: upload.headers, body: fileInput.files[0] });
```

The signature covers the content type and length, so the client cannot upload something else.

**3. Confirm.** The API checks that the object exists with the declared size and type, then marks the file `ready`:

```bash
curl -X POST http://localhost:5001/api/files/6acb51d27e4a738ebdd998d0/complete -H "Authorization: Bearer $TOKEN"
```

## Routes

| Route | Policy | Does |
|---|---|---|
| `POST /api/files/presign` | authenticated | Start an upload: `{ fileName, contentType, size }`. `201 { data: { file, upload } }` |
| `POST /api/files/:id/complete` | owner | Verify the object and mark the file `ready` |
| `GET /api/files/:id/download` | owner, admin | `302` redirect to a signed URL valid for 5 minutes |
| `GET /api/files`, `GET /api/files/:id` | owner, admin | Metadata, with `status` filterable |
| `DELETE /api/files/:id` | owner, admin | Deletes the record and the S3 object |

Upload URLs expire after 10 minutes. Object keys look like `uploads/<userId>/<yyyy>/<mm>/<uuid>.<ext>` and are stored in a `hidden()` field.

## Bucket CORS

The browser uploads to the bucket directly, so the bucket must allow `PUT` from your frontend. For AWS S3:

```json
[
  {
    "AllowedOrigins": ["https://app.example.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Keep the bucket private (no public access); every download goes through the API and a signed URL. Pending files whose upload never completed stay `pending`; clean them up with a scheduled [job](/blocks/jobs) if you need to.

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/storage-s3/AGENTS.md` and in the devtools Blocks panel.

- [Amazon S3: Working with presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [Amazon S3: Uploading objects with presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [Amazon S3: CORS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [Cloudflare R2: Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [MinIO documentation](https://docs.min.io/)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

## For AI agents

Coding agents read these notes in `app/blocks/storage-s3/AGENTS.md`:

- Read first: `app/blocks/storage-s3/s3.js` (client, `newKey`, `presignUpload`, `head`, `presignDownload`, `remove`), `app/resources/file/` (resource, routes, service) and `index.js` (doctor, devtools).
- Configuration: env `S3_BUCKET`, `S3_REGION` (us-east-1), `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` (secret; without the key id the AWS default credential chain is used), `S3_ENDPOINT` (R2, MinIO; turns on path style), `UPLOAD_MAX_MB`, `UPLOAD_ALLOWED_TYPES`. URL lifetimes are in `settings()`: `uploadTtl` 600 s, `downloadTtl` 300 s. No `calm.config.js` options.
- Flow: `POST /api/files/presign { fileName, contentType, size }` creates a `pending` file and a presigned PUT; the client PUTs the bytes with the returned headers; `POST /api/files/:id/complete` HEADs the object and marks it `ready` only if `ContentLength` and `ContentType` match; `GET /api/files/:id/download` redirects (302) to a short lived signed GET.
- Invariant: the bucket stays private (no public ACL or bucket policy). Every read goes through `presignDownload` after the `owner | admin` policy.
- Invariant: `content-type` and `content-length` are signed into the PUT URL (`signableHeaders`), so a client cannot upload another type or size. Keep both when changing `presignUpload`.
- Invariant: keys are generated by the server (`uploads/<ownerId>/<yyyy>/<mm>/<uuid>.<ext>`) and `key` is `.hidden()`. Never accept a key or path from a client.
- Invariant: only image types in `INLINE` get an inline `ResponseContentDisposition`; never add SVG or HTML.
- Never log presigned URLs or S3 credentials: a presigned URL works for anyone holding it until it expires.
- Bucket CORS must allow `PUT` with the `Content-Type` header from your frontend origin, otherwise browser uploads fail before reaching S3.
- Task, allow a new type: add it to `UPLOAD_ALLOWED_TYPES` and give it an extension in `EXT` in `s3.js`.
- Pitfall: there is no magic byte check (the bytes never pass through the API). If content must be validated, scan the object in a job before marking it `ready`.
- Pitfall: uploads that never complete leave `pending` records (and maybe objects); add a job that deletes stale pending files.
- Deleting a record removes the object in `FileService.afterDelete` (errors are logged, not thrown). storage-s3 conflicts with storage-local.

<!-- block-guide:end -->
