# Creating Your First Module

**Build a complete CRUD API in under 5 minutes!**

---

## The Magic Command

Creating a module in CalmAPI is ridiculously easy:

```bash
calmapi generate module product
```

That's it! You now have a fully functional API with:
- ✅ Create product
- ✅ Read all products (with pagination, filters, sorting)
- ✅ Read single product
- ✅ Update product
- ✅ Delete product

---

## Module Generation Syntax

CalmAPI is smart about naming. All these commands create the same module:

```bash
calmapi generate module product        # Recommended
calmapi generate module products       # Pluralized
calmapi generate module Product        # Capitalized
calmapi generate module ProductMeta    # PascalCase
calmapi generate module product-meta   # kebab-case
```

**Result:** Module named `product`, route at `/api/products`

---

## Disable Auto-Pluralization

If you want exact control over the name:

```bash
calmapi generate module test-series --force
```

**Result:** Route at `/api/test-series` (not pluralized)

---

## What Gets Created?

After running the command, check `src/modules/product/`:

```
src/modules/product/
├── product.controller.js   # HTTP request handling
├── product.service.js      # Business logic
├── product.model.js        # MongoDB schema
├── product.route.js        # API endpoints
├── product.dto.js          # Data validation
└── product.settings.js     # Configuration
```

---

## Step-by-Step: Create a Product API

Let's build a complete e-commerce product API from scratch!

### Step 1: Generate the Module

```bash
cd my-awesome-api
calmapi generate module product
```

**Output:**

```
✔ Module 'product' created successfully!
✔ Location: src/modules/product
✔ Routes: /api/products

Available endpoints:
  GET    /api/products       - Get all products
  GET    /api/products/:id   - Get single product
  POST   /api/products       - Create product
  PUT    /api/products/:id   - Update product
  DELETE /api/products/:id   - Delete product
```

### Step 2: Customize the Model

Open `src/modules/product/product.model.js` and modify the schema:

```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;
const uniqueValidator = require('mongoose-unique-validator');

class Product {
    initSchema() {
        const schema = new Schema({
            name: {
                type: String,
                required: true,
            },
            sku: {
                type: String,
                unique: true,
                required: true,
            },
            description: String,
            price: {
                type: Number,
                required: true,
                min: 0
            },
            stock: {
                type: Number,
                default: 0,
                min: 0
            },
            category: {
                type: String,
                enum: ['electronics', 'clothing', 'food', 'books', 'other'],
                default: 'other'
            },
            images: [String],
            featured: {
                type: Boolean,
                default: false
            },
            createdBy: {
                type: Schema.Types.ObjectId,
                ref: 'user'
            },
            updatedBy: {
                type: Schema.Types.ObjectId,
                ref: 'user'
            }
        }, { timestamps: true });

        // Add indexes for better performance
        schema.index({ name: 'text', description: 'text' });
        schema.index({ category: 1 });
        schema.index({ price: 1 });

        schema.plugin(uniqueValidator);

        try {
            mongoose.model('product', schema);
        } catch (e) {
            // Model already exists
        }
    }

    getInstance() {
        this.initSchema();
        return mongoose.model('product');
    }
}

module.exports = { Product };
```

### Step 3: Update DTOs

Open `src/modules/product/product.dto.js`:

```javascript
class GetDTO {
    constructor({ ...props }) {
        this._id = props._id;
        this.name = props.name;
        this.sku = props.sku;
        this.description = props.description;
        this.price = props.price;
        this.stock = props.stock;
        this.category = props.category;
        this.images = props.images;
        this.featured = props.featured;
        this.createdBy = props.createdBy;
        this.updatedBy = props.updatedBy;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
        Object.freeze(this);
    }
}

class InsertDTO {
    constructor({ ...props }) {
        this.name = props.name;
        this.sku = props.sku;
        this.description = props.description;
        this.price = props.price;
        this.stock = props.stock;
        this.category = props.category;
        this.images = props.images;
        this.featured = props.featured || false;
        this.createdBy = props.createdBy;
        Object.freeze(this);
    }
}

class UpdateDTO {
    constructor({ ...props }) {
        this.name = props.name;
        this.sku = props.sku;
        this.description = props.description;
        this.price = props.price;
        this.stock = props.stock;
        this.category = props.category;
        this.images = props.images;
        this.featured = props.featured;
        this.updatedBy = props.updatedBy;

        // Remove undefined fields
        Object.keys(this).forEach(key => {
            if (this[key] === undefined) {
                delete this[key];
            }
        });
        Object.freeze(this);
    }
}

module.exports = { GetDTO, InsertDTO, UpdateDTO };
```

### Step 4: Add Authentication to Routes

Open `src/modules/product/product.route.js`:

```javascript
const express = require('express');
const router = express.Router();
const ProductController = require('./product.controller');
const AuthController = require('../auth/auth.controller');

// Public routes - anyone can view
router.get('/', ProductController.getAll);
router.get('/:id', ProductController.get);

// Protected routes - requires authentication
router.use(AuthController.checkLogin);

router.post('/', ProductController.insert);
router.put('/:id', ProductController.update);
router.delete('/:id', ProductController.delete);

module.exports = router;
```

### Step 5: Restart Your Server

```bash
npm start
```

**You should see:**

```
┌──────────┬──────────────────┬────────┬──────────────┐
│ Module   │ Route            │ Mapped │ API Exposed  │
├──────────┼──────────────────┼────────┼──────────────┤
│ product  │ /products        │ ✔      │ ✔            │
└──────────┴──────────────────┴────────┴──────────────┘
```

---

## Testing Your API

### 1. Create a Product (Requires Auth)

First, login and get your token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepass123"
  }'
```

Now create a product:

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "iPhone 15 Pro",
    "sku": "IPHONE-15-PRO-256",
    "description": "Latest iPhone with A17 chip",
    "price": 999,
    "stock": 50,
    "category": "electronics",
    "featured": true,
    "images": [
      "https://example.com/iphone-1.jpg",
      "https://example.com/iphone-2.jpg"
    ]
  }'
```

**Response:**

```json
{
  "status": true,
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f3a",
    "name": "iPhone 15 Pro",
    "sku": "IPHONE-15-PRO-256",
    "description": "Latest iPhone with A17 chip",
    "price": 999,
    "stock": 50,
    "category": "electronics",
    "featured": true,
    "images": [
      "https://example.com/iphone-1.jpg",
      "https://example.com/iphone-2.jpg"
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get All Products

```bash
curl http://localhost:3000/api/products
```

### 3. Get Products with Filters

```bash
# Get products in electronics category
curl "http://localhost:3000/api/products?category=electronics"

# Get products under $100
curl "http://localhost:3000/api/products?price[$lt]=100"

# Get featured products only
curl "http://localhost:3000/api/products?featured=true"
```

### 4. Pagination & Sorting

```bash
# Get first 10 products
curl "http://localhost:3000/api/products?limit=10&skip=0"

# Sort by price (ascending)
curl "http://localhost:3000/api/products?sortBy[price]=1"

# Sort by price (descending)
curl "http://localhost:3000/api/products?sortBy[price]=-1"
```

### 5. Get Single Product

```bash
curl http://localhost:3000/api/products/60d5ec49f1b2c72b8c8e4f3a
```

### 6. Update Product

```bash
curl -X PUT http://localhost:3000/api/products/60d5ec49f1b2c72b8c8e4f3a \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "price": 899,
    "stock": 45
  }'
```

### 7. Delete Product

```bash
curl -X DELETE http://localhost:3000/api/products/60d5ec49f1b2c72b8c8e4f3a \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Adding Custom Features

### Example 1: Get Featured Products

Add a method to `product.controller.js`:

```javascript
class ProductController extends CalmController {
    constructor(service) {
        super(service);
        this.dto = { ...this.dto, ...productDTO };
        autoBind(this);
    }

    // Custom method for featured products
    async getFeatured(req, res, next) {
        try {
            const products = await this.service.model.find({ 
                featured: true 
            }).limit(10);
            
            res.sendCalmResponse(
                products.map(p => new this.dto.GetDTO(p))
            );
        } catch (e) {
            next(e);
        }
    }
}
```

Add the route in `product.route.js`:

```javascript
router.get('/featured', ProductController.getFeatured);
router.get('/', ProductController.getAll);  // Keep this after
```

**Test it:**

```bash
curl http://localhost:3000/api/products/featured
```

### Example 2: Search Products

Add to `product.service.js`:

```javascript
class ProductService extends CalmService {
    constructor(model) {
        super(model);
    }

    async search(searchTerm) {
        return await this.model.find({
            $text: { $search: searchTerm }
        });
    }
}
```

Add to `product.controller.js`:

```javascript
async search(req, res, next) {
    try {
        const { q } = req.query;
        const products = await this.service.search(q);
        res.sendCalmResponse(
            products.map(p => new this.dto.GetDTO(p))
        );
    } catch (e) {
        next(e);
    }
}
```

Add route:

```javascript
router.get('/search', ProductController.search);
```

**Test it:**

```bash
curl "http://localhost:3000/api/products/search?q=iPhone"
```

---

## Multiple Modules Together

Let's create a complete e-commerce system!

### Generate Multiple Modules

```bash
calmapi generate module product
calmapi generate module category
calmapi generate module order
calmapi generate module review
```

Your structure:

```
src/modules/
├── auth/
├── user/
├── media/
├── post/
├── product/     ← New
├── category/    ← New
├── order/       ← New
└── review/      ← New
```

### Link Modules with References

In `product.model.js`:

```javascript
category: {
    type: Schema.Types.ObjectId,
    ref: 'category',
    required: true
}
```

In `order.model.js`:

```javascript
items: [{
    product: {
        type: Schema.Types.ObjectId,
        ref: 'product'
    },
    quantity: Number,
    price: Number
}],
user: {
    type: Schema.Types.ObjectId,
    ref: 'user'
}
```

---

## Module Generation Checklist

When creating a new module:

- [ ] Run `calmapi generate module <name>`
- [ ] Customize `model.js` (schema fields)
- [ ] Update `dto.js` (validation rules)
- [ ] Modify `route.js` (add auth if needed)
- [ ] Add custom methods to `controller.js` (optional)
- [ ] Add business logic to `service.js` (optional)
- [ ] Configure `settings.js` (custom route path, optional)
- [ ] Restart server (`npm start`)
- [ ] Test endpoints

---

## Common Patterns

### Pattern 1: Minimal Module (Use Defaults)

Just generate and use as-is:

```bash
calmapi generate module task
# Done! Basic CRUD works immediately
```

### Pattern 2: Custom Model Only

Generate, modify model, use default controller/service:

```bash
calmapi generate module event
# Edit event.model.js only
```

### Pattern 3: Full Customization

Generate and customize everything:

```bash
calmapi generate module payment
# Edit all files for specific business logic
```

---

## Tips & Best Practices

### 1. Start Simple
Don't over-engineer. Start with the generated code and add features as needed.

### 2. Use Meaningful Names
```bash
# Good
calmapi generate module blog-post
calmapi generate module user-profile
calmapi generate module payment-method

# Avoid
calmapi generate module data
calmapi generate module stuff
```

### 3. Keep DTOs Strict
Only include fields that should be exposed or saved.

### 4. Add Validation in Models
Use Mongoose validation:

```javascript
price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative'],
    max: [1000000, 'Price too high']
}
```

### 5. Use Indexes
Add indexes for fields you'll query often:

```javascript
schema.index({ email: 1 });
schema.index({ createdAt: -1 });
```

---

## Troubleshooting

### Issue: Module Not Showing in Route Table

**Solution:** Check `module.route.js` exports:

```javascript
module.exports = router;  // Must export router!
```

### Issue: "Cannot GET /api/products"

**Cause:** Route not properly defined

**Solution:** Check route file:

```javascript
router.get('/', ProductController.getAll);  // Must have this
```

### Issue: Fields Not Saving

**Cause:** Missing in DTO

**Solution:** Add field to `InsertDTO` and `UpdateDTO`

---

## What's Next?

You can now generate modules! Let's dive deeper into models.

**Next:** [Working with Models →](04-models.md)

---

[← Previous: Architecture](02-architecture.md) | [Back to Index](README.md) | [Next: Models →](04-models.md)
