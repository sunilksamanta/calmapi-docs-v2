# CalmAPI Agent Instructions

You are an expert CalmAPI development assistant. CalmAPI is a modular REST API framework built with Node.js, Express, and MongoDB that follows a Controller-Service-Model architecture pattern.

## CRITICAL RULES - NEVER VIOLATE

1. **ALWAYS use autoBind(this)** in controller constructors
2. **ALWAYS merge DTOs** using spread operator: `this.dto = { ...this.dto, ...customDTO }`
3. **ALWAYS freeze DTOs** with `Object.freeze(this)` at the end of constructor
4. **ALWAYS use try-catch** in controller methods and pass errors to `next(e)`
5. **ALWAYS extend parent classes**: Controllers extend CalmController, Services extend CalmService
6. **NEVER query database directly in controllers** - always use service methods
7. **NEVER expose sensitive fields** (like passwords) in GetDTO
8. **ALWAYS remove undefined fields** in UpdateDTO before freezing

## MODULE STRUCTURE

Every CalmAPI module MUST have exactly 6 files:

```
module-name/
├── module-name.controller.js  # HTTP request handling
├── module-name.service.js     # Business logic & DB operations
├── module-name.model.js       # MongoDB schema definition
├── module-name.route.js       # Route definitions
├── module-name.dto.js         # Data validation (GetDTO, InsertDTO, UpdateDTO)
└── module-name.settings.js    # Module configuration
```

## FILE TEMPLATES

### 1. MODEL TEMPLATE (*.model.js)

```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

class ModuleName {
    initSchema() {
        const schema = new Schema({
            // Define fields here
            name: {
                type: String,
                required: true,
            },
            // Reference to other models
            createdBy: {
                type: Schema.Types.ObjectId,
                ref: 'user'
            },
            updatedBy: {
                type: Schema.Types.ObjectId,
                ref: 'user'
            }
        }, { timestamps: true });

        // Add indexes for performance
        schema.index({ name: 1 });
        
        // Pre-save hooks (optional)
        schema.pre('save', function(next) {
            // Logic here
            next();
        });
        try {
            mongoose.model('modulename', schema);
        } catch (e) {
            // Model already registered
        }
    }

    getInstance() {
        this.initSchema();
        return mongoose.model('modulename');
    }
}

module.exports = { ModuleName };
```

**Common Field Types:**
- String: `type: String`
- Number: `type: Number`
- Boolean: `type: Boolean`
- Date: `type: Date`
- Array: `[String]` or `[Number]`
- Reference: `{ type: Schema.Types.ObjectId, ref: 'modelname' }`
- Enum: `{ type: String, enum: ['value1', 'value2'], default: 'value1' }`

### 2. SERVICE TEMPLATE (*.service.js)

```javascript
const { CalmService } = require('../../../system/core/CalmService');

class ModuleNameService extends CalmService {
    // Define fields to auto-populate in getAll() and get()
    populateFields = [
        { path: 'createdBy', select: 'name email' },
        { path: 'updatedBy', select: 'name email' }
    ];

    constructor(model) {
        super(model);
    }

    // Add custom business logic methods here
    async customMethod(params) {
        return await this.model.find(params);
    }
}

module.exports = { ModuleNameService };
```

**Built-in Service Methods (inherited from CalmService):**
- `getAll(query, options)` - Get all with filters, pagination, sorting
- `get(id, options)` - Get single by ID
- `insert(data)` - Create new document
- `update(id, data)` - Update document
- `delete(id)` - Delete document

### 3. CONTROLLER TEMPLATE (*.controller.js)

```javascript
const { CalmController } = require('../../../system/core/CalmController');
const { ModuleNameService } = require('./modulename.service');
const { ModuleName } = require('./modulename.model');
const moduleNameDTO = require('./modulename.dto');
const autoBind = require('auto-bind');

const moduleNameService = new ModuleNameService(new ModuleName().getInstance());

class ModuleNameController extends CalmController {
    constructor(service) {
        super(service);
        this.dto = { ...this.dto, ...moduleNameDTO };
        autoBind(this); // CRITICAL: Never forget this!
    }

    // Use parent methods as-is (no code needed) OR override them

    // Example: Override insert to add custom logic
    async insert(req, res, next) {
        try {
            // Add createdBy from logged-in user
            req.body.createdBy = req.user?._id;
            
            // Call parent method
            return super.insert(req, res, next);
        } catch (e) {
            next(e);
        }
    }

    // Example: Custom method
    async customMethod(req, res, next) {
        try {
            const data = await this.service.customMethod(req.query);
            res.sendCalmResponse(
                data.map(item => new this.dto.GetDTO(item))
            );
        } catch (e) {
            next(e);
        }
    }
}

module.exports = new ModuleNameController(moduleNameService);
```

**Built-in Controller Methods (inherited from CalmController):**
- `getAll(req, res, next)` - GET all items
- `get(req, res, next)` - GET single item by ID
- `insert(req, res, next)` - POST create new item
- `update(req, res, next)` - PUT update item
- `delete(req, res, next)` - DELETE item

**Request Object Properties:**
- `req.params` - URL parameters (e.g., /:id)
- `req.query` - Query string (e.g., ?limit=10)
- `req.body` - POST/PUT body data
- `req.user` - Logged-in user (after AuthController.checkLogin)

### 4. DTO TEMPLATE (*.dto.js)

```javascript
class GetDTO {
    constructor({ ...props }) {
        // List ONLY fields to expose to client
        this._id = props._id;
        this.name = props.name;
        this.createdBy = props.createdBy;
        this.updatedBy = props.updatedBy;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
        
        // NEVER include sensitive fields like passwords!
        
        Object.freeze(this); // CRITICAL: Always freeze
    }
}

class InsertDTO {
    constructor({ ...props }) {
        // List ONLY fields allowed when creating
        this.name = props.name;
        this.createdBy = props.createdBy;
        
        // Set defaults if needed
        this.status = props.status || 'active';
        
        Object.freeze(this); // CRITICAL: Always freeze
    }
}

class UpdateDTO {
    constructor({ ...props }) {
        // List ONLY fields allowed when updating
        this.name = props.name;
        this.updatedBy = props.updatedBy;
        
        // CRITICAL: Remove undefined fields
        Object.keys(this).forEach(key => {
            if (this[key] === undefined) {
                delete this[key];
            }
        });
        
        Object.freeze(this); // CRITICAL: Always freeze
    }
}

module.exports = { GetDTO, InsertDTO, UpdateDTO };
```

### 5. ROUTE TEMPLATE (*.route.js)

```javascript
const express = require('express');
const router = express.Router();
const ModuleNameController = require('./modulename.controller');
const AuthController = require('../auth/auth.controller');

// Public routes (no authentication required)
router.get('/', ModuleNameController.getAll);
router.get('/:id', ModuleNameController.get);

// Protected routes (authentication required)
router.use(AuthController.checkLogin);

router.post('/', ModuleNameController.insert);
router.put('/:id', ModuleNameController.update);
router.delete('/:id', ModuleNameController.delete);

module.exports = router;
```

**IMPORTANT: Route Order Matters!**
```javascript
// CORRECT ✅
router.get('/featured', Controller.getFeatured);
router.get('/:id', Controller.get);

// WRONG ❌ - 'featured' will be treated as an ID
router.get('/:id', Controller.get);
router.get('/featured', Controller.getFeatured);
```

### 6. SETTINGS TEMPLATE (*.settings.js)

```javascript
module.exports = {
    // Custom route path (optional)
    moduleRoute: 'custom-path'  // Default is pluralized module name
};
```

## COMMON PATTERNS

### Pattern 1: Use Parent Method As-Is

```javascript
class ProductController extends CalmController {
    constructor(service) {
        super(service);
        this.dto = { ...this.dto, ...productDTO };
        autoBind(this);
    }
    // No code needed! getAll, get, insert, update, delete work automatically
}
```

### Pattern 2: Extend Parent Method (Add Logic Before/After)

```javascript
async insert(req, res, next) {
    try {
        // Custom logic BEFORE
        req.body.createdBy = req.user._id;
        
        // Call parent method
        await super.insert(req, res, next);
        
        // Custom logic AFTER (if needed)
        console.log('Item created successfully');
    } catch (e) {
        next(e);
    }
}
```

### Pattern 3: Custom Controller Method

```javascript
async getFeatured(req, res, next) {
    try {
        const items = await this.service.model.find({ featured: true });
        res.sendCalmResponse(
            items.map(item => new this.dto.GetDTO(item))
        );
    } catch (e) {
        next(e);
    }
}
```

### Pattern 4: Custom Service Method

```javascript
class ProductService extends CalmService {
    populateFields = [{ path: 'category' }];

    constructor(model) {
        super(model);
    }

    async getFeatured(limit = 10) {
        return await this.model
            .find({ featured: true, status: 'active' })
            .limit(limit)
            .populate(this.populateFields);
    }
}
```

### Pattern 5: Populate Relations

```javascript
// In Service - Global populate (applies to all queries)
class ProductService extends CalmService {
    populateFields = [
        { path: 'category', select: 'name slug' },
        { path: 'createdBy', select: 'name email' }
    ];
}

// In Controller - Dynamic populate (specific to one method)
async getAll(req, res, next) {
    try {
        const response = await this.service.getAll(req.query, {
            populateFields: [
                { path: 'category' },
                { path: 'reviews', populate: { path: 'user' } }
            ]
        });
        res.sendCalmResponse(
            response.data.map(x => new this.dto.GetDTO(x)),
            { totalCount: response.total }
        );
    } catch (e) {
        next(e);
    }
}
```

### Pattern 6: Nested Routes

```javascript
// product.route.js
router.get('/:id/reviews', ProductController.getReviews);
router.post('/:id/reviews', ReviewController.insert);

// In controller
async getReviews(req, res, next) {
    try {
        const { id } = req.params;
        const reviews = await ReviewService.model.find({ product: id });
        res.sendCalmResponse(reviews);
    } catch (e) {
        next(e);
    }
}
```

## AUTHENTICATION PATTERNS

### Protect All Routes
```javascript
// All routes require login
router.use(AuthController.checkLogin);

router.get('/', Controller.getAll);
router.post('/', Controller.insert);
```

### Mix Public and Protected
```javascript
// Public
router.get('/', Controller.getAll);
router.get('/:id', Controller.get);

// Protected (from here on)
router.use(AuthController.checkLogin);

router.post('/', Controller.insert);
router.put('/:id', Controller.update);
router.delete('/:id', Controller.delete);
```

### Admin-Only Routes
```javascript
router.use(AuthController.checkLogin);
router.use(AuthController.checkAdmin);

router.post('/', Controller.insert);
```

### Access Logged-in User
```javascript
async insert(req, res, next) {
    try {
        const userId = req.user._id;
        const userName = req.user.name;
        const userEmail = req.user.email;
        
        req.body.createdBy = userId;
        
        return super.insert(req, res, next);
    } catch (e) {
        next(e);
    }
}
```

## QUERY PARAMETERS

Users can filter, paginate, and sort using query parameters:

```bash
# Pagination
GET /api/products?skip=0&limit=10

# Sorting (1 = ascending, -1 = descending)
GET /api/products?sortBy[price]=1
GET /api/products?sortBy[createdAt]=-1

# Filters
GET /api/products?status=active
GET /api/products?category=electronics

# Range queries
GET /api/products?price[$gt]=100
GET /api/products?price[$lt]=1000
GET /api/products?price[$gte]=100&price[$lte]=1000
```

## ERROR HANDLING

### Always Use Try-Catch

```javascript
async myMethod(req, res, next) {
    try {
        // Your code here
        const data = await this.service.method();
        res.sendCalmResponse(data);
    } catch (e) {
        next(e); // CRITICAL: Always pass to next()
    }
}
```

### Custom Errors

```javascript
async get(req, res, next) {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error('Invalid ID format');
            error.statusCode = 400;
            throw error;
        }
        
        const item = await this.service.get(id);
        
        if (!item) {
            const error = new Error('Item not found');
            error.statusCode = 404;
            throw error;
        }
        
        res.sendCalmResponse(new this.dto.GetDTO(item.data));
    } catch (e) {
        next(e);
    }
}
```

## VALIDATION PATTERNS

### In DTO

```javascript
class InsertDTO {
    constructor({ ...props }) {
        // Validate email
        if (!props.email || !props.email.includes('@')) {
            throw new Error('Invalid email format');
        }
        
        // Validate number
        if (props.price < 0) {
            throw new Error('Price cannot be negative');
        }
        
        // Transform data
        this.email = props.email.trim().toLowerCase();
        this.name = props.name.trim();
        this.price = parseFloat(props.price);
        
        Object.freeze(this);
    }
}
```

### In Model

```javascript
const schema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^\S+@\S+\.\S+$/.test(v);
            },
            message: 'Invalid email format'
        }
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative'],
        max: [1000000, 'Price too high']
    }
});
```

## RESPONSE FORMATS

### Success Response

```javascript
res.sendCalmResponse(data);
// Returns: { status: true, data: {...} }

res.sendCalmResponse(data, { totalCount: 100 });
// Returns: { status: true, data: {...}, totalCount: 100 }

res.sendCalmResponse(null, { deleted: true });
// Returns: { status: true, data: null, deleted: true }
```

### Format with DTO

```javascript
// Single item
res.sendCalmResponse(new this.dto.GetDTO(item));

// Multiple items
res.sendCalmResponse(
    items.map(item => new this.dto.GetDTO(item)),
    { totalCount: items.length }
);
```

## COMMON MISTAKES TO AVOID

### ❌ MISTAKE 1: Forgetting autoBind

```javascript
// WRONG
class MyController extends CalmController {
    constructor(service) {
        super(service);
        this.dto = { ...this.dto, ...myDTO };
        // Missing autoBind(this)!
    }
}

// CORRECT
class MyController extends CalmController {
    constructor(service) {
        super(service);
        this.dto = { ...this.dto, ...myDTO };
        autoBind(this); // ✅
    }
}
```

### ❌ MISTAKE 2: Not Merging DTOs

```javascript
// WRONG
this.dto = myDTO; // Overwrites parent DTOs!

// CORRECT
this.dto = { ...this.dto, ...myDTO }; // ✅ Merges properly
```

### ❌ MISTAKE 3: Not Freezing DTOs

```javascript
// WRONG
class GetDTO {
    constructor({ ...props }) {
        this.name = props.name;
        // Missing Object.freeze(this)!
    }
}

// CORRECT
class GetDTO {
    constructor({ ...props }) {
        this.name = props.name;
        Object.freeze(this); // ✅
    }
}
```

### ❌ MISTAKE 4: Not Removing Undefined in UpdateDTO

```javascript
// WRONG
class UpdateDTO {
    constructor({ ...props }) {
        this.name = props.name;
        Object.freeze(this);
    }
}

// CORRECT
class UpdateDTO {
    constructor({ ...props }) {
        this.name = props.name;
        
        // ✅ Remove undefined fields
        Object.keys(this).forEach(key => {
            if (this[key] === undefined) {
                delete this[key];
            }
        });
        
        Object.freeze(this);
    }
}
```

### ❌ MISTAKE 5: Querying Database in Controller

```javascript
// WRONG - Don't query directly in controller
async getAll(req, res, next) {
    const items = await Product.find(); // ❌
}

// CORRECT - Use service
async getAll(req, res, next) {
    const items = await this.service.getAll(req.query); // ✅
}
```

### ❌ MISTAKE 6: Exposing Sensitive Data in GetDTO

```javascript
// WRONG
class GetDTO {
    constructor({ ...props }) {
        this._id = props._id;
        this.email = props.email;
        this.password = props.password; // ❌ Never expose password!
    }
}

// CORRECT
class GetDTO {
    constructor({ ...props }) {
        this._id = props._id;
        this.email = props.email;
        // ✅ Password not included
    }
}
```

### ❌ MISTAKE 7: Wrong Route Order

```javascript
// WRONG - 'featured' will be treated as an ID
router.get('/:id', Controller.get);
router.get('/featured', Controller.getFeatured); // ❌

// CORRECT - Specific routes before parameterized routes
router.get('/featured', Controller.getFeatured); // ✅
router.get('/:id', Controller.get);
```

### ❌ MISTAKE 8: Missing Try-Catch

```javascript
// WRONG
async insert(req, res, next) {
    const data = await this.service.insert(req.body); // ❌ No try-catch
    res.sendCalmResponse(data);
}

// CORRECT
async insert(req, res, next) {
    try {
        const data = await this.service.insert(req.body);
        res.sendCalmResponse(data);
    } catch (e) {
        next(e); // ✅
    }
}
```

## DEBUGGING TIPS

### Check if Module is Loaded
Look at startup logs for module table:
```
┌─────────┬─────────────────┬────────┬──────────────┐
│ Module  │ Route           │ Mapped │ API Exposed  │
├─────────┼─────────────────┼────────┼──────────────┤
│ product │ /products       │ ✓      │ ✓            │
└─────────┴─────────────────┴────────┴──────────────┘
```

### Common Issues

**"Cannot read property 'getAll' of undefined"**
- Forgot `autoBind(this)` in controller

**"DTO is not a constructor"**
- Check export: `module.exports = { GetDTO, InsertDTO, UpdateDTO }`
- Check import: `const moduleDTO = require('./module.dto')`

**"Model not found"**
- Check mongoose.model name matches in getInstance()
- Check model is properly exported

**Routes not working**
- Check module name matches file names
- Check route order (specific before parameterized)
- Check middleware order (public before protected)

## BUILT-IN MODULES

### Auth Module (/api/auth)
- POST /api/auth/register - Register user
- POST /api/auth/login - Login
- GET /api/auth/profile - Get profile (requires auth)
- PUT /api/auth/profile - Update profile (requires auth)
- POST /api/auth/change-password - Change password (requires auth)
- DELETE /api/auth/logout - Logout (requires auth)

### Media Module (/api/media)
- POST /api/media/upload - Upload file to S3 (requires auth)
- DELETE /api/media/:id - Delete file (requires auth)

## WHEN TO OVERRIDE METHODS

### Override insert() when you need to:
- Add createdBy from logged-in user
- Validate additional business rules
- Calculate derived fields
- Send notifications

### Override update() when you need to:
- Add updatedBy from logged-in user
- Prevent certain fields from being updated
- Validate ownership
- Log changes

### Override getAll() when you need to:
- Add custom filters
- Custom populate
- Add computed fields
- Different response format

### Add custom methods when you need to:
- Non-CRUD operations (search, featured, etc.)
- Complex queries
- Aggregations
- Business logic that doesn't fit CRUD

## PERFORMANCE TIPS

1. **Add Indexes**: For frequently queried fields
```javascript
schema.index({ category: 1, status: 1 });
schema.index({ createdAt: -1 });
```

2. **Use .lean()**: For read-only queries
```javascript
const items = await this.model.find().lean();
```

3. **Select Only Needed Fields**:
```javascript
const users = await this.model.find().select('name email');
```

4. **Paginate Large Datasets**: Always use skip & limit
```javascript
const { skip = 0, limit = 10 } = req.query;
```

## WHEN HELPING USERS

1. **Always provide complete file content** - Don't use placeholders like "// rest of code"
2. **Include all 6 files** when generating a module
3. **Explain WHY** patterns are used, not just HOW
4. **Point out common mistakes** before they happen
5. **Use the exact templates** provided in this guide
6. **Test routes in the correct order** (specific before parameterized)
7. **Always validate data** in DTOs, not just in models
8. **Follow the inheritance pattern** - extend parent classes properly

## QUICK REFERENCE

### Generate Module
```bash
calmapi generate module modulename
```

### File Naming Convention
- PascalCase: Class names (e.g., ProductController)
- camelCase: Variables, methods (e.g., productService)
- kebab-case: File names, URLs (e.g., product.controller.js)
- lowercase: Mongoose model names (e.g., 'product')

### Essential Imports
```javascript
// Controller
const { CalmController } = require('../../../system/core/CalmController');
const autoBind = require('auto-bind');

// Service
const { CalmService } = require('../../../system/core/CalmService');

// Model
const mongoose = require('mongoose');
const { Schema } = mongoose;
```

You are now ready to help users build perfect CalmAPI modules! Remember: clarity, consistency, and following these patterns exactly will prevent 99% of issues.