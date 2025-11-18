# CalmAPI Quick Reference Guide

**Cheat sheet for common operations**

---

## Installation & Setup

```bash
# Install globally
npm install -g calmapi

# Create project
calmapi

# Navigate to project
cd my-project

# Install dependencies
npm install

# Start server
npm start
```

---

## Generate Modules

```bash
# Generate a new module
calmapi generate module product

# Force no pluralization
calmapi generate module test-series --force
```

---

## File Structure

```
module-name/
├── module-name.controller.js  # HTTP handling
├── module-name.service.js     # Business logic
├── module-name.model.js       # DB schema
├── module-name.route.js       # Endpoints
├── module-name.dto.js         # Validation
└── module-name.settings.js    # Config
```

---

## Model Schema

```javascript
const schema = new Schema({
    // Basic types
    name: String,
    age: Number,
    active: Boolean,
    date: Date,
    tags: [String],
    
    // Required
    email: { type: String, required: true },
    
    // Unique
    username: { type: String, unique: true },
    
    // Enum
    status: { 
        type: String, 
        enum: ['active', 'inactive'],
        default: 'active'
    },
    
    // Min/Max
    price: { type: Number, min: 0, max: 10000 },
    
    // Reference
    user: { type: Schema.Types.ObjectId, ref: 'user' },
    
    // Nested
    address: {
        street: String,
        city: String
    }
}, { timestamps: true });
```

---

## Controller Patterns

```javascript
class MyController extends CalmController {
    constructor(service) {
        super(service);
        this.dto = { ...this.dto, ...myDTO };
        autoBind(this);
    }

    // Use parent method as-is (no code needed)

    // Extend parent method
    async insert(req, res, next) {
        // Before logic
        return super.insert(req, res, next);
    }

    // Custom method
    async myMethod(req, res, next) {
        try {
            const data = await this.service.method();
            res.sendCalmResponse(data);
        } catch (e) {
            next(e);
        }
    }
}
```

---

## Service Patterns

```javascript
class MyService extends CalmService {
    // Global populate
    populateFields = [
        { path: 'user', select: 'name email' }
    ];

    constructor(model) {
        super(model);
    }

    // Custom method
    async customQuery(filters) {
        return await this.model.find(filters);
    }
}
```

---

## DTO Pattern

```javascript
class GetDTO {
    constructor({ ...props }) {
        this._id = props._id;
        this.field1 = props.field1;
        this.field2 = props.field2;
        // Don't include sensitive fields
        Object.freeze(this);
    }
}

class InsertDTO {
    constructor({ ...props }) {
        this.field1 = props.field1;
        this.field2 = props.field2 || defaultValue;
        Object.freeze(this);
    }
}

class UpdateDTO {
    constructor({ ...props }) {
        this.field1 = props.field1;
        this.field2 = props.field2;
        
        // Remove undefined
        Object.keys(this).forEach(key => {
            if (this[key] === undefined) delete this[key];
        });
        Object.freeze(this);
    }
}
```

---

## Routes

```javascript
const router = express.Router();

// Public routes
router.get('/', Controller.getAll);
router.get('/:id', Controller.get);

// Protected routes
router.use(AuthController.checkLogin);
router.post('/', Controller.insert);
router.put('/:id', Controller.update);
router.delete('/:id', Controller.delete);

module.exports = router;
```

---

## Custom Route Path

```javascript
// module.settings.js
module.exports = {
    moduleRoute: 'custom-path'
};
```

---

## Query Filters

```bash
# Pagination
?skip=0&limit=10

# Sorting
?sortBy[field]=1    # Ascending
?sortBy[field]=-1   # Descending

# Filter exact
?status=active

# Greater than
?price[$gt]=100

# Less than
?price[$lt]=1000

# In array
?category[$in]=electronics,books
```

---

## Auth Endpoints

```bash
# Register
POST /api/auth/register
Body: { name, email, password }

# Login
POST /api/auth/login
Body: { email, password }

# Get Profile
GET /api/auth/profile
Header: Authorization: Bearer TOKEN

# Update Profile
PUT /api/auth/profile
Header: Authorization: Bearer TOKEN

# Change Password
POST /api/auth/change-password
Header: Authorization: Bearer TOKEN

# Logout
DELETE /api/auth/logout
Header: Authorization: Bearer TOKEN
```

---

## Common Commands

```bash
# Check version
calmapi --version

# Start with nodemon
nodemon index.js

# Run linter
npm run lint

# Check MongoDB connection
# In project: check system/configs/database.js
```

---

## Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=27017
DB_NAME=mydb
# OR
DB_CONNECTION_STRING=mongodb+srv://...

# JWT
JWT_SECRET=your-secret-key

# AWS S3
AWS_ACCESS_KEY_ID=key
AWS_SECRET_ACCESS_KEY=secret
AWS_S3_BUCKET=bucket
AWS_REGION=us-east-1
```

---

## Response Format

```json
{
  "status": true,
  "data": { ... },
  "totalCount": 100
}
```

---

## Error Response

```json
{
  "status": false,
  "message": "Error message",
  "statusCode": 400,
  "errors": { ... }
}
```

---

## Testing with curl

```bash
# GET
curl http://localhost:3000/api/products

# GET with auth
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer TOKEN"

# POST
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name": "Product", "price": 99}'

# PUT
curl -X PUT http://localhost:3000/api/products/ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"price": 89}'

# DELETE
curl -X DELETE http://localhost:3000/api/products/ID \
  -H "Authorization: Bearer TOKEN"
```

---

## Common Patterns

### Populate in Service
```javascript
populateFields = [{ path: 'field', select: 'prop1 prop2' }];
```

### Populate in Controller
```javascript
const response = await this.service.getAll(req.query, {
    populateFields: [{ path: 'field' }]
});
```

### Access Logged-in User
```javascript
const userId = req.user._id;
const userName = req.user.name;
```

### Custom Error
```javascript
const error = new Error('Message');
error.statusCode = 400;
throw error;
```

---

## Tips

✅ Always use `autoBind(this)` in controllers  
✅ Merge DTOs: `this.dto = { ...this.dto, ...customDTO }`  
✅ Use try-catch and `next(e)` for errors  
✅ Add indexes to frequently queried fields  
✅ Use `.lean()` for better performance  
✅ Always paginate large datasets  
✅ Never expose sensitive data in GetDTO  
✅ Set defaults in InsertDTO  
✅ Remove undefined in UpdateDTO  

---

## Need Help?

- 🌐 [https://calmapi.dev](https://calmapi.dev)
- 📦 [GitHub](https://github.com/sunilksamanta/calmapi)
- 📚 [Docs](https://docs.calmapi.dev)

---

**Happy Coding! 🚀**
