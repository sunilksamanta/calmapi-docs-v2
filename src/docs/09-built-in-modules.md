# Built-in Modules

**Learn about Auth, User, Media, and Post modules that come with CalmAPI.**

---

## Overview

CalmAPI ships with 4 pre-built modules:

1. **Auth** - Authentication & authorization
2. **User** - User data model
3. **Media** - File uploads (AWS S3)
4. **Post** - Sample CRUD module

---

## Auth Module

Located at `/api/auth`

### Features

- ✅ User registration
- ✅ Login/logout
- ✅ JWT token management
- ✅ Password hashing (bcrypt)
- ✅ Password reset with OTP
- ✅ Profile management
- ✅ Bearer token middleware

### Register

**Endpoint:** `POST /api/auth/register`

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepass123"
  }'
```

**Response:**

```json
{
  "status": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "60d5ec49f1b2c72b8c8e4f3a",
      "name": "John Doe",
      "email": "john@example.com",
      "status": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Login

**Endpoint:** `POST /api/auth/login`

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepass123"
  }'
```

### Get Profile

**Endpoint:** `GET /api/auth/profile` (Requires auth)

```bash
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Profile

**Endpoint:** `PUT /api/auth/profile` (Requires auth)

```bash
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Updated"
  }'
```

### Change Password

**Endpoint:** `POST /api/auth/change-password` (Requires auth)

```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "newpassword123"
  }'
```

### Request Password Reset

**Endpoint:** `POST /api/auth/request-password-reset`

```bash
curl -X POST http://localhost:3000/api/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

Generates OTP and prints to console (implement email sending).

### Reset Password

**Endpoint:** `POST /api/auth/password-reset`

```bash
curl -X POST http://localhost:3000/api/auth/password-reset \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "otp": "123456",
    "password": "newpassword123"
  }'
```

### Logout

**Endpoint:** `DELETE /api/auth/logout` (Requires auth)

```bash
curl -X DELETE http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Using Auth in Your Modules

### Protect Routes

```javascript
// product.route.js
const AuthController = require('../auth/auth.controller');

// Public route
router.get('/', ProductController.getAll);

// Protected routes
router.use(AuthController.checkLogin);
router.post('/', ProductController.insert);
```

### Access User Data

```javascript
// In controller
async insert(req, res, next) {
    // req.user is available after checkLogin middleware
    req.body.createdBy = req.user._id;
    
    console.log('User:', req.user.name, req.user.email);
    
    return super.insert(req, res, next);
}
```

---

## User Module

Located in `src/modules/user/`

The User model that Auth module uses. Not exposed as API by default.

**User Schema:**

```javascript
{
    name: String (required),
    email: String (unique, required),
    password: String (hashed, select: false),
    status: Boolean (default: true),
    otp: String,
    otpExpiry: Date
}
```

---

## Media Module

Located at `/api/media`

Upload files to AWS S3.

### Configure AWS S3

Set these in `.env`:

```bash
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
```

### Upload File

**Endpoint:** `POST /api/media/upload`

```bash
curl -X POST http://localhost:3000/api/media/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

**Response:**

```json
{
  "status": true,
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f3a",
    "path": "uploads/1624627337421-image.jpg",
    "originalName": "image.jpg",
    "mimeType": "image/jpeg",
    "size": 245678,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

Access file: `https://your-bucket.s3.amazonaws.com/uploads/1624627337421-image.jpg`

### Delete File

**Endpoint:** `DELETE /api/media/:id`

```bash
curl -X DELETE http://localhost:3000/api/media/60d5ec49f1b2c72b8c8e4f3a \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Post Module

Located at `/api/posts`

A complete example CRUD module showing best practices.

### Features

- Create, read, update, delete posts
- Pagination, filtering, sorting
- User tracking (createdBy, updatedBy)
- Auto-generated slug
- Population of related data

### Create Post

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "subtitle": "A great subtitle",
    "content": "This is the post content...",
    "description": "Short description"
  }'
```

### Get All Posts

```bash
# Basic
curl http://localhost:3000/api/posts

# With pagination
curl "http://localhost:3000/api/posts?limit=10&skip=0"

# With filter
curl "http://localhost:3000/api/posts?createdBy=USER_ID"

# With sorting
curl "http://localhost:3000/api/posts?sortBy[createdAt]=-1"
```

### Get Single Post

```bash
curl http://localhost:3000/api/posts/POST_ID
```

### Update Post

```bash
curl -X PUT http://localhost:3000/api/posts/POST_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "content": "Updated content"
  }'
```

### Delete Post

```bash
curl -X DELETE http://localhost:3000/api/posts/POST_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

[← Previous: Routing](routing) | [Back to Index](/) | [Next: Advanced →](advanced)
