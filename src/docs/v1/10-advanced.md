# Advanced Techniques

**Master advanced patterns, optimization, and best practices.**

---

## Populate Nested Relations

### Single Level Populate

```javascript
// product.service.js
class ProductService extends CalmService {
    populateFields = [
        { path: 'category' },
        { path: 'createdBy', select: 'name email' }
    ];
}
```

### Multi-Level Populate

```javascript
populateFields = [
    {
        path: 'category',
        populate: { 
            path: 'parent',  // Category has parent category
            select: 'name'
        }
    },
    {
        path: 'reviews',
        populate: {
            path: 'user',
            select: 'name avatar'
        }
    }
];
```

### Dynamic Populate in Controller

```javascript
async getAll(req, res, next) {
    try {
        const response = await this.service.getAll(req.query, {
            populateFields: [
                { path: 'category', select: 'name slug' },
                { path: 'createdBy', select: 'name email' },
                { path: 'updatedBy', select: 'name' }
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

---

## Advanced Querying

### Complex Filters

```javascript
// In service
async getProducts(filters) {
    const query = {};
    
    // Price range
    if (filters.minPrice || filters.maxPrice) {
        query.price = {};
        if (filters.minPrice) query.price.$gte = filters.minPrice;
        if (filters.maxPrice) query.price.$lte = filters.maxPrice;
    }
    
    // Category
    if (filters.category) {
        query.category = filters.category;
    }
    
    // Status
    if (filters.status) {
        query.status = filters.status;
    }
    
    // Date range
    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }
    
    // Search in multiple fields
    if (filters.search) {
        query.$or = [
            { name: new RegExp(filters.search, 'i') },
            { description: new RegExp(filters.search, 'i') },
            { sku: new RegExp(filters.search, 'i') }
        ];
    }
    
    return await this.model.find(query);
}
```

### Aggregation Pipeline

```javascript
async getStatistics() {
    return await this.model.aggregate([
        {
            $group: {
                _id: '$category',
                totalProducts: { $sum: 1 },
                avgPrice: { $avg: '$price' },
                totalStock: { $sum: '$stock' }
            }
        },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'categoryInfo'
            }
        },
        {
            $unwind: '$categoryInfo'
        },
        {
            $project: {
                category: '$categoryInfo.name',
                totalProducts: 1,
                avgPrice: { $round: ['$avgPrice', 2] },
                totalStock: 1
            }
        }
    ]);
}
```

---

## File Upload Patterns

### Upload and Link to Document

```javascript
// Upload product image
async uploadImage(req, res, next) {
    try {
        const { productId } = req.params;
        const file = req.file;
        
        // Upload to S3 (using media service)
        const media = await MediaService.upload(file);
        
        // Link to product
        await this.service.model.findByIdAndUpdate(productId, {
            $push: { images: media._id }
        });
        
        res.sendCalmResponse(media);
    } catch (e) {
        next(e);
    }
}
```

### Multiple File Upload

```javascript
// Use multer for multiple files
const multer = require('multer');
const upload = multer({ dest: 'temp/' });

router.post('/upload-multiple', 
    upload.array('files', 10),
    ProductController.uploadMultiple
);

// Controller
async uploadMultiple(req, res, next) {
    try {
        const files = req.files;
        
        const uploadedFiles = await Promise.all(
            files.map(file => MediaService.upload(file))
        );
        
        res.sendCalmResponse(uploadedFiles);
    } catch (e) {
        next(e);
    }
}
```

---

## Transaction Support

For operations that must succeed or fail together:

```javascript
async createOrder(req, res, next) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { items, userId } = req.body;
        
        // 1. Create order
        const order = await Order.create([{
            user: userId,
            items,
            total: calculateTotal(items)
        }], { session });
        
        // 2. Reduce stock for each product
        for (const item of items) {
            const product = await Product.findById(item.productId).session(session);
            
            if (product.stock < item.quantity) {
                throw new Error(`Insufficient stock for ${product.name}`);
            }
            
            product.stock -= item.quantity;
            await product.save({ session });
        }
        
        // 3. Commit transaction
        await session.commitTransaction();
        
        res.sendCalmResponse(order[0]);
        
    } catch (e) {
        // Rollback on error
        await session.abortTransaction();
        next(e);
    } finally {
        session.endSession();
    }
}
```

---

## Caching Strategies

### Simple In-Memory Cache

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async getAll(req, res, next) {
    try {
        const cacheKey = JSON.stringify(req.query);
        
        // Check cache
        if (cache.has(cacheKey)) {
            const cached = cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CACHE_TTL) {
                return res.sendCalmResponse(cached.data, cached.meta);
            }
            cache.delete(cacheKey);
        }
        
        // Fetch from database
        const response = await this.service.getAll(req.query);
        
        // Cache result
        cache.set(cacheKey, {
            data: response.data.map(x => new this.dto.GetDTO(x)),
            meta: { totalCount: response.total },
            timestamp: Date.now()
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

---

## Role-Based Access Control

### Add Roles to User Model

```javascript
// user.model.js
role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
}
```

### Create Middleware

```javascript
// auth.controller.js
checkAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        const error = new Error('Admin access required');
        error.statusCode = 403;
        return next(error);
    }
    next();
}

checkRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            const error = new Error('Access denied');
            error.statusCode = 403;
            return next(error);
        }
        next();
    };
}
```

### Use in Routes

```javascript
// product.route.js
const AuthController = require('../auth/auth.controller');

// Public
router.get('/', ProductController.getAll);
router.get('/:id', ProductController.get);

// Admin only
router.use(AuthController.checkLogin);
router.use(AuthController.checkAdmin);

router.post('/', ProductController.insert);
router.put('/:id', ProductController.update);
router.delete('/:id', ProductController.delete);

// Or specific roles
router.post('/publish/:id', 
    AuthController.checkLogin,
    AuthController.checkRole('admin', 'moderator'),
    ProductController.publish
);
```

---

## Soft Delete Pattern

### Add to Model

```javascript
deletedAt: Date,
deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'user'
}
```

### Override Delete Method

```javascript
// In service
async delete(id) {
    try {
        const item = await this.model.findByIdAndUpdate(
            id,
            {
                deletedAt: new Date(),
                deletedBy: this.currentUser?._id
            },
            { new: true }
        );
        
        if (!item) {
            throw new Error('NOT_FOUND_ERROR');
        }
        
        return { data: this.parseObj(item), deleted: true };
    } catch (error) {
        throw error;
    }
}

// Query only non-deleted
async getAll(query, ops = {}) {
    query.deletedAt = null; // Add this filter
    return super.getAll(query, ops);
}
```

---

## API Versioning

### URL-Based Versioning

```
src/modules/
├── v1/
│   ├── product/
│   └── user/
└── v2/
    ├── product/
    └── user/
```

**Routes:**
- `/api/v1/products`
- `/api/v2/products`

---

## Performance Tips

### 1. Use Lean Queries

```javascript
const products = await Product.find().lean();
// Returns plain JavaScript objects (faster)
```

### 2. Select Only Needed Fields

```javascript
const users = await User.find().select('name email');
// Don't fetch unnecessary fields
```

### 3. Add Indexes

```javascript
schema.index({ category: 1, status: 1 });
schema.index({ createdAt: -1 });
schema.index({ name: 'text', description: 'text' });
```

### 4. Use Pagination

```javascript
// Always use skip & limit
const { skip = 0, limit = 10 } = req.query;
```

### 5. Avoid N+1 Queries

```javascript
// Bad: N+1 queries
const orders = await Order.find();
for (const order of orders) {
    order.user = await User.findById(order.userId);
}

// Good: Single query with populate
const orders = await Order.find().populate('user');
```

---

## Testing Your APIs

### Using curl

```bash
# GET
curl http://localhost:3000/api/products

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

## Deployment Checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Use strong JWT_SECRET
- [ ] Enable MongoDB authentication
- [ ] Set up proper CORS
- [ ] Add rate limiting
- [ ] Enable HTTPS
- [ ] Set up logging
- [ ] Configure error monitoring
- [ ] Use process manager (PM2)
- [ ] Set up automated backups

---

## Common Patterns Summary

### Pattern 1: Extend Parent Method

```javascript
async insert(req, res, next) {
    // Custom logic before
    console.log('Creating...');
    
    // Call parent
    return super.insert(req, res, next);
}
```

### Pattern 2: Custom Method

```javascript
async myCustomMethod(req, res, next) {
    try {
        const data = await this.service.customLogic();
        res.sendCalmResponse(data);
    } catch (e) {
        next(e);
    }
}
```

### Pattern 3: Populate Relations

```javascript
populateFields = [
    { path: 'field1' },
    { path: 'field2', select: 'name' }
];
```

---

## What's Next?

You've learned everything about CalmAPI! Now go build amazing APIs! 🚀

**Resources:**
- 🌐 Website: [https://calmapi.dev](https://calmapi.dev)
- 📦 GitHub: [https://github.com/sunilksamanta/calmapi](https://github.com/sunilksamanta/calmapi)
- 📚 Docs: [https://docs.calmapi.dev](https://docs.calmapi.dev)

**Happy coding! 🎉**
