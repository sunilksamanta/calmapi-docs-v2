# Services Layer

**Business logic and database operations made simple with CalmService.**

---

## What is a Service?

A **Service** contains your business logic and database operations. It's the "chef" that:
- Performs database queries
- Implements business rules
- Processes data
- Returns results to controllers

---

## The Power of CalmService

CalmAPI provides `CalmService` - a base class with all CRUD operations!

### Built-in Methods

```javascript
class CalmService {
    async getAll(query, options)     // Query with filters, pagination, sorting
    async get(id, options)           // Get single document by ID
    async insert(data)               // Create new document
    async update(id, data)           // Update document
    async delete(id)                 // Delete document
}
```

---

## Basic Service Structure

```javascript
const { CalmService } = require('../../../system/core/CalmService');

class ProductService extends CalmService {
    // Set fields to populate globally
    populateFields = [
        { path: 'category' },
        { path: 'createdBy', select: 'name email' }
    ];

    constructor(model) {
        super(model);  // Pass model to parent
    }

    // Add custom methods here
}

module.exports = { ProductService };
```

---

## Using Built-in Methods

### getAll() - Query Documents

```javascript
// Basic usage (in controller)
const response = await service.getAll(req.query);

// Returns: { data: [...], total: 100 }
```

**Query parameters:**

```javascript
// Pagination
?skip=0&limit=10

// Sorting
?sortBy[price]=1       // Ascending
?sortBy[price]=-1      // Descending
?sortBy[createdAt]=-1  // Newest first

// Filters
?status=active
?price[$gt]=100        // Greater than
?price[$lt]=1000       // Less than
?category=electronics
```

**With populate:**

```javascript
const response = await service.getAll(req.query, {
    populateFields: [
        { path: 'category', select: 'name' },
        { path: 'createdBy', select: 'name email' }
    ]
});
```

### get() - Get Single Document

```javascript
const response = await service.get(productId);

// Returns: { data: {...} }
```

**With populate:**

```javascript
const response = await service.get(productId, {
    populateFields: [
        { path: 'category' },
        { path: 'reviews', populate: { path: 'user' } }
    ]
});
```

### insert() - Create Document

```javascript
const data = {
    name: 'iPhone 15',
    price: 999,
    category: categoryId
};

const response = await service.insert(data);

// Returns: { data: {...} }
```

### update() - Update Document

```javascript
const updates = {
    price: 899,
    stock: 50
};

const response = await service.update(productId, updates);

// Returns: { data: {...} }
```

### delete() - Delete Document

```javascript
const response = await service.delete(productId);

// Returns: { data: {...}, deleted: true }
```

---

## Global Populate

Set `populateFields` to automatically load related data in `getAll()` and `get()`:

```javascript
class ProductService extends CalmService {
    populateFields = [
        { path: 'category' },
        { path: 'createdBy', select: 'name email' },
        { path: 'updatedBy', select: 'name email' }
    ];

    constructor(model) {
        super(model);
    }
}
```

Now all queries will populate these fields automatically!

---

## Custom Business Logic

Add your own methods for specific operations:

```javascript
class ProductService extends CalmService {
    populateFields = [{ path: 'category' }];

    constructor(model) {
        super(model);
    }

    // Get featured products
    async getFeatured(limit = 10) {
        return await this.model
            .find({ featured: true, status: 'active' })
            .limit(limit)
            .sort({ createdAt: -1 });
    }

    // Get products by category
    async getByCategory(categoryId) {
        return await this.model
            .find({ category: categoryId, status: 'active' })
            .populate('category');
    }

    // Search products
    async search(searchTerm) {
        return await this.model.find({
            $text: { $search: searchTerm }
        });
    }

    // Get low stock products
    async getLowStock() {
        return await this.model.find({
            $expr: { $lte: ['$stock', '$lowStockThreshold'] }
        });
    }

    // Update stock
    async updateStock(productId, quantity) {
        const product = await this.model.findById(productId);
        
        if (!product) {
            throw new Error('Product not found');
        }

        if (product.stock < quantity) {
            throw new Error('Insufficient stock');
        }

        product.stock -= quantity;
        await product.save();

        return product;
    }
}
```

---

## Tips & Best Practices

### 1. Use Services for All Database Operations
Don't query the database directly in controllers!

```javascript
// Good ✅
const products = await this.service.getFeatured();

// Bad ❌
const products = await Product.find({ featured: true });
```

### 2. Keep Business Logic in Services

```javascript
// Calculate order total in service
async calculateTotal(items) {
    return items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
    }, 0);
}
```

### 3. Throw Descriptive Errors

```javascript
if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
}
```

---

[← Previous: Controllers](controllers) | [Back to Index](/) | [Next: DTOs →](dtos)
