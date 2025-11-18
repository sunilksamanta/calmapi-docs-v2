# Routing & Configuration

**Configure custom paths, nested routes, and module settings.**

---

## Automatic Routing

CalmAPI automatically creates routes for your modules!

**Module name:** `product`  
**Auto-generated route:** `/api/products` (pluralized)

---

## Custom Route Paths

Override the automatic route using `settings.js`:

```javascript
// product.settings.js
module.exports = {
    moduleRoute: 'shop-items'
};
```

**Result:** Your API is now at `/api/shop-items` instead of `/api/products`

---

## Route File Structure

```javascript
// product.route.js
const express = require('express');
const router = express.Router();
const ProductController = require('./product.controller');
const AuthController = require('../auth/auth.controller');

// Public routes
router.get('/', ProductController.getAll);
router.get('/:id', ProductController.get);

// Protected routes (require authentication)
router.use(AuthController.checkLogin);

router.post('/', ProductController.insert);
router.put('/:id', ProductController.update);
router.delete('/:id', ProductController.delete);

module.exports = router;
```

---

## Common Route Patterns

### Standard CRUD Routes

```javascript
router.get('/', Controller.getAll);           // GET all
router.get('/:id', Controller.get);           // GET one
router.post('/', Controller.insert);          // CREATE
router.put('/:id', Controller.update);        // UPDATE
router.delete('/:id', Controller.delete);     // DELETE
```

### Custom Routes

```javascript
// Must come BEFORE /:id routes
router.get('/featured', ProductController.getFeatured);
router.get('/search', ProductController.search);
router.get('/low-stock', ProductController.getLowStock);

// Then standard routes
router.get('/:id', ProductController.get);
```

### Nested Routes

```javascript
// Get reviews for a product
router.get('/:id/reviews', ProductController.getReviews);

// Add review to a product
router.post('/:id/reviews', ReviewController.insert);

// Get product images
router.get('/:id/images', ProductController.getImages);
```

---

## Authentication & Middleware

### Protect All Routes

```javascript
// All routes require authentication
router.use(AuthController.checkLogin);

router.get('/', ProductController.getAll);
router.post('/', ProductController.insert);
// ... all routes are protected
```

### Mix Public and Protected

```javascript
// Public routes
router.get('/', ProductController.getAll);
router.get('/:id', ProductController.get);

// From here on, require authentication
router.use(AuthController.checkLogin);

// Protected routes
router.post('/', ProductController.insert);
router.put('/:id', ProductController.update);
router.delete('/:id', ProductController.delete);
```

### Optional Authentication

```javascript
// Check if user is logged in, but don't require it
router.use(AuthController.optionalCheckLogin);

router.get('/', ProductController.getAll);  
// Will have req.user if logged in, undefined if not
```

---

## Complete Routing Example

```javascript
const express = require('express');
const router = express.Router();
const ProductController = require('./product.controller');
const AuthController = require('../auth/auth.controller');

// Public routes - anyone can access
router.get('/', ProductController.getAll);
router.get('/featured', ProductController.getFeatured);
router.get('/search', ProductController.search);
router.get('/category/:categoryId', ProductController.getByCategory);
router.get('/:id', ProductController.get);

// Admin-only routes
router.use(AuthController.checkLogin);
router.use(AuthController.checkAdmin);

router.post('/', ProductController.insert);
router.put('/:id', ProductController.update);
router.delete('/:id', ProductController.delete);
router.post('/:id/feature', ProductController.toggleFeatured);

module.exports = router;
```

---

## Settings File

The `*.settings.js` file configures your module:

```javascript
// product.settings.js
module.exports = {
    // Custom route path
    moduleRoute: 'products',
    
    // Can add other module-specific settings here
    cacheTimeout: 300,
    maxPageSize: 100
};
```

---

## Nested Modules

Create sub-modules with nested routes:

```
src/modules/
├── shop/
│   ├── product/
│   │   ├── product.controller.js
│   │   ├── product.route.js
│   │   └── ...
│   └── category/
│       ├── category.controller.js
│       ├── category.route.js
│       └── ...
```

**Result:**
- `/api/shop/products`
- `/api/shop/categories`

---

## Tips & Best Practices

### 1. Order Matters!
```javascript
// Good ✅
router.get('/featured', ProductController.getFeatured);
router.get('/:id', ProductController.get);

// Bad ❌
router.get('/:id', ProductController.get);
router.get('/featured', ProductController.getFeatured);  
// 'featured' will be treated as an ID!
```

### 2. Use Descriptive Route Names
```javascript
// Good
moduleRoute: 'blog-posts'
moduleRoute: 'user-profiles'

// Avoid
moduleRoute: 'bp'
moduleRoute: 'data'
```

### 3. Group Related Routes
```javascript
// Product routes
router.get('/', ...);
router.get('/:id', ...);

// Product reviews (nested)
router.get('/:id/reviews', ...);
router.post('/:id/reviews', ...);

// Product images (nested)
router.get('/:id/images', ...);
```

---

[← Previous: DTOs](07-dtos.md) | [Back to Index](README.md) | [Next: Built-in Modules →](09-built-in-modules.md)
