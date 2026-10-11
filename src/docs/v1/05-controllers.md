# Controllers Made Easy

**Master request handling with CalmController's super methods.**

---

## What is a Controller?

A **Controller** handles HTTP requests and responses. It's the "waiter" that:
- Receives requests from routes
- Validates input using DTOs
- Calls service methods for business logic
- Sends formatted responses back to the client

---

## The Power of CalmController

CalmAPI provides `CalmController` - a base class with all CRUD operations built-in!

### Built-in Methods

```javascript
class CalmController {
    async getAll(req, res, next)    // GET all items
    async get(req, res, next)       // GET single item
    async insert(req, res, next)    // CREATE item
    async update(req, res, next)    // UPDATE item
    async delete(req, res, next)    // DELETE item
}
```

**You get all these for FREE!**

---

## Basic Controller Structure

```javascript
const { CalmController } = require('../../../system/core/CalmController');
const { ProductService } = require('./product.service');
const { Product } = require('./product.model');
const productDTO = require('./product.dto');
const autoBind = require('auto-bind');

const productService = new ProductService(new Product().getInstance());

class ProductController extends CalmController {
    constructor(service) {
        super(service);  // Call parent constructor
        this.dto = { ...this.dto, ...productDTO };  // Merge DTOs
        autoBind(this);  // Bind 'this' context
    }
}

module.exports = new ProductController(productService);
```

---

## Using super() to Call Parent Methods

### Pattern 1: Use Parent Method As-Is

Don't write anything! The parent method works automatically:

```javascript
class ProductController extends CalmController {
    // No code needed!
    // getAll, get, insert, update, delete work automatically
}
```

### Pattern 2: Add Logic Before Parent Method

```javascript
class ProductController extends CalmController {
    async insert(req, res, next) {
        // Add custom logic
        console.log('Creating product...', req.body);
        
        // Validation
        if (req.body.price < 0) {
            return next(new Error('Price cannot be negative'));
        }
        
        // Call parent method to do the actual work
        return super.insert(req, res, next);
    }
}
```

### Pattern 3: Add Logic After Parent Method

```javascript
class ProductController extends CalmController {
    async insert(req, res, next) {
        try {
            // Call parent method first
            await super.insert(req, res, next);
            
            // Add custom logic after
            console.log('Product created successfully!');
            
            // Maybe send email notification
            await emailService.sendNewProductAlert(req.body);
            
        } catch (e) {
            next(e);
        }
    }
}
```

### Pattern 4: Wrap Parent Method

```javascript
class ProductController extends CalmController {
    async getAll(req, res, next) {
        try {
            console.log('Fetching products...');
            
            // Add default filters
            if (!req.query.status) {
                req.query.status = 'active';
            }
            
            // Call parent
            const result = await super.getAll(req, res, next);
            
            console.log(`Returned ${result.length} products`);
            return result;
            
        } catch (e) {
            next(e);
        }
    }
}
```

---

## Custom Methods

Add your own methods for specific needs:

```javascript
class ProductController extends CalmController {
    constructor(service) {
        super(service);
        this.dto = { ...this.dto, ...productDTO };
        autoBind(this);
    }
    
    // Custom method: Get featured products
    async getFeatured(req, res, next) {
        try {
            const products = await this.service.model.find({ 
                featured: true,
                status: 'active'
            }).limit(10);
            
            res.sendCalmResponse(
                products.map(p => new this.dto.GetDTO(p))
            );
        } catch (e) {
            next(e);
        }
    }
    
    // Custom method: Get by category
    async getByCategory(req, res, next) {
        try {
            const { categoryId } = req.params;
            
            const products = await this.service.model
                .find({ category: categoryId, status: 'active' })
                .populate('category');
            
            res.sendCalmResponse(
                products.map(p => new this.dto.GetDTO(p))
            );
        } catch (e) {
            next(e);
        }
    }
    
    // Custom method: Search
    async search(req, res, next) {
        try {
            const { q } = req.query;
            
            const products = await this.service.model.find({
                $text: { $search: q },
                status: 'active'
            });
            
            res.sendCalmResponse(
                products.map(p => new this.dto.GetDTO(p))
            );
        } catch (e) {
            next(e);
        }
    }
}
```

Add custom routes:

```javascript
// product.route.js
router.get('/featured', ProductController.getFeatured);
router.get('/search', ProductController.search);
router.get('/category/:categoryId', ProductController.getByCategory);
router.get('/', ProductController.getAll);
```

---

## Request & Response Objects

### Request (req)

```javascript
async insert(req, res, next) {
    // URL params
    const { id } = req.params;  // /api/products/:id
    
    // Query params
    const { limit, skip } = req.query;  // /api/products?limit=10&skip=0
    
    // Body data
    const data = req.body;  // POST/PUT data
    
    // User (if authenticated)
    const userId = req.user._id;  // Set by AuthController.checkLogin
    
    // Headers
    const contentType = req.headers['content-type'];
}
```

### Response (res)

CalmAPI provides `sendCalmResponse`:

```javascript
// Success with data
res.sendCalmResponse(data);

// Success with data and metadata
res.sendCalmResponse(data, { totalCount: 100 });

// Success with null data
res.sendCalmResponse(null, { deleted: true });
```

**Response format:**

```json
{
  "status": true,
  "data": { ... },
  "totalCount": 100
}
```

---

## Error Handling

Always use try-catch and pass errors to `next()`:

```javascript
async insert(req, res, next) {
    try {
        // Your code
        const result = await this.service.insert(data);
        res.sendCalmResponse(result);
    } catch (e) {
        next(e);  // Pass to error handler
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
        res.sendCalmResponse(item);
        
    } catch (e) {
        next(e);
    }
}
```

---

## Working with DTOs in Controllers

### Applying DTOs

```javascript
async insert(req, res, next) {
    try {
        // Auto-add createdBy if user is logged in
        if (req.user) {
            req.body.createdBy = req.user._id;
        }
        
        // Validate with InsertDTO
        const insertData = new this.dto.InsertDTO(req.body);
        
        // Save
        const response = await this.service.insert(insertData);
        
        // Format with GetDTO
        res.sendCalmResponse(new this.dto.GetDTO(response.data));
        
    } catch (e) {
        next(e);
    }
}
```

---

## Advanced Patterns

### Pattern 1: Batch Operations

```javascript
async bulkInsert(req, res, next) {
    try {
        const items = req.body.items;  // Array of items
        
        const insertedItems = await Promise.all(
            items.map(item => 
                this.service.insert(new this.dto.InsertDTO(item))
            )
        );
        
        res.sendCalmResponse(
            insertedItems.map(item => new this.dto.GetDTO(item.data))
        );
    } catch (e) {
        next(e);
    }
}
```

### Pattern 2: Pagination with Metadata

```javascript
async getAll(req, res, next) {
    try {
        const response = await this.service.getAll(req.query);
        
        const { skip = 0, limit = 10 } = req.query;
        const totalPages = Math.ceil(response.total / limit);
        const currentPage = Math.floor(skip / limit) + 1;
        
        res.sendCalmResponse(
            response.data.map(x => new this.dto.GetDTO(x)),
            {
                totalCount: response.total,
                totalPages,
                currentPage,
                hasMore: currentPage < totalPages
            }
        );
    } catch (e) {
        next(e);
    }
}
```

### Pattern 3: File Upload Handling

```javascript
async uploadImage(req, res, next) {
    try {
        const { id } = req.params;
        const file = req.file;  // From multer middleware
        
        if (!file) {
            throw new Error('No file uploaded');
        }
        
        // Upload to S3 or save locally
        const imageUrl = await fileService.upload(file);
        
        // Update product
        await this.service.update(id, { images: [imageUrl] });
        
        res.sendCalmResponse({ imageUrl });
        
    } catch (e) {
        next(e);
    }
}
```

---

## Complete Example: Order Controller

```javascript
const { CalmController } = require('../../../system/core/CalmController');
const { OrderService } = require('./order.service');
const { Order } = require('./order.model');
const orderDTO = require('./order.dto');
const autoBind = require('auto-bind');

const orderService = new OrderService(new Order().getInstance());

class OrderController extends CalmController {
    constructor(service) {
        super(service);
        this.dto = { ...this.dto, ...orderDTO };
        autoBind(this);
    }

    // Override insert to add user and calculate total
    async insert(req, res, next) {
        try {
            // Add user ID
            req.body.user = req.user._id;
            
            // Calculate total
            req.body.total = req.body.items.reduce((sum, item) => {
                return sum + (item.price * item.quantity);
            }, 0);
            
            // Call parent method
            return super.insert(req, res, next);
            
        } catch (e) {
            next(e);
        }
    }

    // Get orders for current user
    async getMyOrders(req, res, next) {
        try {
            const orders = await this.service.model
                .find({ user: req.user._id })
                .populate('items.product')
                .sort({ createdAt: -1 });
            
            res.sendCalmResponse(
                orders.map(o => new this.dto.GetDTO(o))
            );
        } catch (e) {
            next(e);
        }
    }

    // Update order status
    async updateStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            
            const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
            
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }
            
            const order = await this.service.update(id, { 
                status,
                updatedBy: req.user._id 
            });
            
            res.sendCalmResponse(new this.dto.GetDTO(order.data));
            
        } catch (e) {
            next(e);
        }
    }

    // Cancel order
    async cancel(req, res, next) {
        try {
            const { id } = req.params;
            
            const order = await this.service.get(id);
            
            // Check if can be cancelled
            if (order.data.status !== 'pending') {
                throw new Error('Order cannot be cancelled');
            }
            
            // Update status
            await this.service.update(id, { 
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelledBy: req.user._id
            });
            
            res.sendCalmResponse(null, { cancelled: true });
            
        } catch (e) {
            next(e);
        }
    }
}

module.exports = new OrderController(orderService);
```

---

## Tips & Best Practices

### 1. Always Use autoBind

```javascript
const autoBind = require('auto-bind');

constructor(service) {
    super(service);
    autoBind(this);  // Essential!
}
```

### 2. Merge DTOs Properly

```javascript
this.dto = { ...this.dto, ...customDTO };
```

### 3. Use Try-Catch Everywhere

```javascript
async myMethod(req, res, next) {
    try {
        // Your code
    } catch (e) {
        next(e);  // Pass to error handler
    }
}
```

### 4. Validate Early

```javascript
if (!req.body.requiredField) {
    const error = new Error('Required field missing');
    error.statusCode = 400;
    return next(error);
}
```

### 5. Use Descriptive Method Names

```javascript
// Good
async getFeaturedProducts(req, res, next)
async getOrdersByStatus(req, res, next)
async cancelSubscription(req, res, next)

// Bad
async get2(req, res, next)
async doStuff(req, res, next)
```

---

## What's Next?

You now understand Controllers! Let's dive into the Service layer where business logic lives.

**Next:** [Services Layer →](/v1/services)
