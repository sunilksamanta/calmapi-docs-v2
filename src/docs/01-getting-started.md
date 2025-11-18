# Getting Started with CalmAPI

**Learn how to install CalmAPI and create your first project in minutes.**

---

## Prerequisites

Before you begin, make sure you have:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** - [Download here](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free cloud database)
- Basic JavaScript knowledge
- A code editor (VS Code recommended)

---

## Installation

### Step 1: Install CalmAPI CLI Globally

Open your terminal and run:

```bash
npm install -g calmapi
```

This installs the CalmAPI command-line tool globally on your system.

### Step 2: Verify Installation

Check if it's installed correctly:

```bash
calmapi --version
```

You should see the version number (e.g., `0.2.5`).

---

## Creating Your First Project

### Step 1: Run CalmAPI Generator

Navigate to your workspace directory and run:

```bash
cd ~/projects
calmapi
```

### Step 2: Follow the Setup Wizard

The interactive wizard will ask you:

```
? Project name: my-awesome-api
? Description: My first REST API with CalmAPI
? Author: Your Name
? Database name: my_awesome_api
? Port (default 3000): 3000
```

**Pro Tip:** Use kebab-case for project names (e.g., `my-awesome-api`)

### Step 3: Navigate to Your Project

```bash
cd my-awesome-api
```

### Step 4: Install Dependencies

```bash
npm install
```

---

## Configuration

### Environment Variables

CalmAPI uses a `.env` file for configuration. Open it and configure:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=27017
DB_NAME=my_awesome_api

# If using MongoDB Atlas:
# DB_CONNECTION_STRING=mongodb+srv://username:password@cluster.mongodb.net/

# JWT Secret (Change this!)
JWT_SECRET=your-super-secret-key-change-this-in-production

# AWS S3 (Optional - for file uploads)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
```

**🔒 Security Note:** Never commit `.env` to version control! It's already in `.gitignore`.

---

## Project Structure

After setup, your project looks like this:

```
my-awesome-api/
├── node_modules/          # Dependencies
├── src/                   # Your application code
│   ├── configs/           # App configurations
│   ├── helpers/           # Helper functions
│   ├── modules/           # API modules (this is where you work!)
│   │   ├── auth/          # Authentication module
│   │   ├── user/          # User module
│   │   ├── media/         # File upload module
│   │   └── post/          # Sample CRUD module
│   ├── plugins/           # Custom plugins
│   └── utils/             # Utility functions
├── system/                # CalmAPI core (don't edit)
│   ├── configs/           # Server, database, routing
│   ├── core/              # Base classes
│   └── helpers/           # System helpers
├── .env                   # Environment variables
├── .gitignore             # Git ignore rules
├── calmapi.json           # CalmAPI metadata
├── index.js               # Application entry point
├── package.json           # Project dependencies
└── eslintrc.json          # ESLint configuration
```

### Key Directories

- **`src/modules/`** - This is where YOU create APIs. Each folder is a module.
- **`system/`** - CalmAPI's core code. You can read it, but usually don't need to modify it.
- **`.env`** - Your configuration. Keep it secret!

---

## Running Your Application

### Start the Server

```bash
npm start
```

You should see:

```
⬤  CALMAPI - Keep Calm and REST

✔ Project: my-awesome-api v1.0.0
✔ CalmAPI Version: 0.2.5
✔ Application Started
✔ Connected to Database: my_awesome_api
✔ Listening on port 3000
✔ Endpoint Base URL: http://127.0.0.1:3000

┌─────────┬─────────────────┬────────┬──────────────┐
│ Module  │ Route           │ Mapped │ API Exposed  │
├─────────┼─────────────────┼────────┼──────────────┤
│ auth    │ /auth           │ ✔      │ ✔            │
│ user    │ /users          │ -      │ ✘            │
│ media   │ /media          │ ✔      │ ✔            │
│ post    │ /posts          │ ✔      │ ✔            │
└─────────┴─────────────────┴────────┴──────────────┘

✔ API Modules Loaded
```

**🎉 Congratulations!** Your API is running!

---

## Testing Your API

### Method 1: Browser

Open your browser and visit:

```
http://localhost:3000
```

You should see:

```json
{
  "status": true,
  "message": "Welcome to the my-awesome-api"
}
```

### Method 2: Using curl

In your terminal:

```bash
curl http://localhost:3000/api
```

Response:

```json
{
  "status": true,
  "data": {
    "message": "API Running"
  }
}
```

### Method 3: Using Postman or Insomnia

1. Download [Postman](https://www.postman.com/) or [Insomnia](https://insomnia.rest/)
2. Create a new request
3. Set URL to `http://localhost:3000/api/posts`
4. Click Send

---

## Understanding Built-in Modules

CalmAPI comes with 4 pre-built modules:

### 1. Auth Module (`/api/auth`)
Handles user authentication:
- Register new users
- Login/logout
- Password reset
- JWT token management

### 2. User Module (`/api/users`)
User data model (not exposed by default)

### 3. Media Module (`/api/media`)
File uploads to AWS S3

### 4. Post Module (`/api/posts`)
A complete example CRUD module showing best practices

---

## Your First API Test

Let's test the Post module that comes with CalmAPI:

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepass123"
  }'
```

Response:

```json
{
  "status": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "60d5ec49f1b2c72b8c8e4f3a",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

**Save the token!** You'll need it for authenticated requests.

### 2. Create a Post (Authenticated)

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "My First Post",
    "content": "Hello CalmAPI!"
  }'
```

### 3. Get All Posts

```bash
curl http://localhost:3000/api/posts
```

---

## Common Issues & Solutions

### Issue: "Cannot connect to database"

**Solution:** Make sure MongoDB is running:

```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB (if installed locally)
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Linux
```

Or use MongoDB Atlas cloud database.

### Issue: "Port 3000 is already in use"

**Solution:** Either:
1. Stop the process using port 3000
2. Change `PORT` in `.env` to another port (e.g., 3001)

### Issue: "Module not found"

**Solution:** Make sure you ran `npm install` in your project directory.

---

## Development Tips

### 1. Hot Reload (Optional)

Install `nodemon` for automatic restarts:

```bash
npm install -g nodemon
```

Then run:

```bash
nodemon index.js
```

### 2. ESLint

Check your code quality:

```bash
npm run lint
```

### 3. Keep Your Token Safe

When testing, save your auth token in a variable:

```bash
# In your terminal
export TOKEN="your-jwt-token-here"

# Then use it
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/posts
```

---

## What's Next?

Now that your project is running, let's understand how it works!

**Next:** [Understanding the Architecture →](02-architecture.md)

---

## Quick Reference

```bash
# Install CalmAPI
npm install -g calmapi

# Create new project
calmapi

# Generate a module
calmapi generate module product

# Start server
npm start

# Run linter
npm run lint
```

---

[← Back to Index](README.md) | [Next: Architecture →](02-architecture.md)
