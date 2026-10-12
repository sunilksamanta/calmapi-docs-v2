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
