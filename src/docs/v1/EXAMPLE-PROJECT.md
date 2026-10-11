# Complete Example: E-Commerce API

**Build a full e-commerce API step-by-step**

---

## Project Overview

We'll build:
- Products with categories
- Shopping cart
- Orders
- User reviews
- Admin dashboard

---

## Step 1: Generate Modules

```bash
calmapi generate module category
calmapi generate module product
calmapi generate module cart
calmapi generate module order
calmapi generate module review
```

---

## Step 2: Category Module

### category.model.js

```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

class Category {
    initSchema() {
        const schema = new Schema({
            name: { type: String, required: true },
            slug: { type: String, unique: true },
            description: String,
            image: String,
            parent: { type: Schema.Types.ObjectId, ref: 'category' },
            isActive: { type: Boolean, default: true }
        }, { timestamps: true });

        schema.pre('save', function(next) {
            if (this.isModified('name')) {
                this.slug = this.name.toLowerCase().replace(/\s+/g, '-');
            }
            next();
        });

        try {
            mongoose.model('category', schema);
        } catch(e) {

        }

        
    }

    getInstance() {
        this.initSchema();
        return mongoose.model('category');
    }
}

module.exports = { Category };
```

---

## Step 3: Product Module

### product.model.js

```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

class Product {
    initSchema() {
        const schema = new Schema({
            name: { type: String, required: true },
            slug: String,
            sku: { type: String, unique: true, required: true },
            description: String,
            price: { type: Number, required: true, min: 0 },
            comparePrice: Number,
            cost: Number,
            stock: { type: Number, default: 0 },
            category: { 
                type: Schema.Types.ObjectId, 
                ref: 'category',
                required: true
            },
            images: [String],
            tags: [String],
            status: {
                type: String,
                enum: ['draft', 'active', 'archived'],
                default: 'draft'
            },
            featured: { type: Boolean, default: false },
            rating: { type: Number, default: 0 },
            reviewCount: { type: Number, default: 0 },
            createdBy: { type: Schema.Types.ObjectId, ref: 'user' },
            updatedBy: { type: Schema.Types.ObjectId, ref: 'user' }
        }, { timestamps: true });

        schema.index({ name: 'text', description: 'text' });
        schema.index({ category: 1, status: 1 });

        try {
            mongoose.model('product', schema);
        } catch(e) {

        }
        
    }

    getInstance() {
        this.initSchema();
        return mongoose.model('product');
    }
}

module.exports = { Product };
```

### product.service.js

```javascript
const { CalmService } = require('../../../system/core/CalmService');

class ProductService extends CalmService {
    populateFields = [
        { path: 'category', select: 'name slug' },
        { path: 'createdBy', select: 'name email' }
    ];

    constructor(model) {
        super(model);
    }

    async getFeatured(limit = 10) {
        return await this.model
            .find({ featured: true, status: 'active' })
            .populate(this.populateFields)
            .limit(limit)
            .sort({ createdAt: -1 });
    }

    async getByCategory(categoryId) {
        return await this.model
            .find({ category: categoryId, status: 'active' })
            .populate(this.populateFields);
    }

    async updateStock(productId, quantity) {
        const product = await this.model.findById(productId);
        if (!product) throw new Error('Product not found');
        if (product.stock < quantity) throw new Error('Insufficient stock');
        
        product.stock -= quantity;
        await product.save();
        return product;
    }
}

module.exports = { ProductService };
```

### product.controller.js

```javascript
const { CalmController } = require('../../../system/core/CalmController');
const { ProductService } = require('./product.service');
const { Product } = require('./product.model');
const productDTO = require('./product.dto');
const autoBind = require('auto-bind');

const productService = new ProductService(new Product().getInstance());

class ProductController extends CalmController {
    constructor(service) {
        super(service);
        this.dto = { ...this.dto, ...productDTO };
        autoBind(this);
    }

    async getFeatured(req, res, next) {
        try {
            const products = await this.service.getFeatured(10);
            res.sendCalmResponse(
                products.map(p => new this.dto.GetDTO(p))
            );
        } catch (e) {
            next(e);
        }
    }

    async getByCategory(req, res, next) {
        try {
            const { categoryId } = req.params;
            const products = await this.service.getByCategory(categoryId);
            res.sendCalmResponse(
                products.map(p => new this.dto.GetDTO(p))
            );
        } catch (e) {
            next(e);
        }
    }
}

module.exports = new ProductController(productService);
```

### product.route.js

```javascript
const express = require('express');
const router = express.Router();
const ProductController = require('./product.controller');
const AuthController = require('../auth/auth.controller');

// Public routes
router.get('/', ProductController.getAll);
router.get('/featured', ProductController.getFeatured);
router.get('/category/:categoryId', ProductController.getByCategory);
router.get('/:id', ProductController.get);

// Admin routes
router.use(AuthController.checkLogin);
router.use(AuthController.checkAdmin);

router.post('/', ProductController.insert);
router.put('/:id', ProductController.update);
router.delete('/:id', ProductController.delete);

module.exports = router;
```

---

## Step 4: Cart Module

### cart.model.js

```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

class Cart {
    initSchema() {
        const schema = new Schema({
            user: { 
                type: Schema.Types.ObjectId, 
                ref: 'user',
                required: true
            },
            items: [{
                product: { 
                    type: Schema.Types.ObjectId, 
                    ref: 'product'
                },
                quantity: { type: Number, default: 1 },
                price: Number
            }],
            total: { type: Number, default: 0 }
        }, { timestamps: true });

        try {
            mongoose.model('cart', schema);
        } catch(e) {

        }
        
    }

    getInstance() {
        this.initSchema();
        return mongoose.model('cart');
    }
}

module.exports = { Cart };
```

### cart.controller.js

```javascript
const { CalmController } = require('../../../system/core/CalmController');
const { CartService } = require('./cart.service');
const { Cart } = require('./cart.model');
const cartDTO = require('./cart.dto');
const autoBind = require('auto-bind');

const cartService = new CartService(new Cart().getInstance());

class CartController extends CalmController {
    constructor(service) {
        super(service);
        this.dto = { ...this.dto, ...cartDTO };
        autoBind(this);
    }

    async getMyCart(req, res, next) {
        try {
            let cart = await this.service.model
                .findOne({ user: req.user._id })
                .populate('items.product');
            
            if (!cart) {
                cart = await this.service.model.create({ 
                    user: req.user._id,
                    items: []
                });
            }
            
            res.sendCalmResponse(new this.dto.GetDTO(cart));
        } catch (e) {
            next(e);
        }
    }

    async addItem(req, res, next) {
        try {
            const { productId, quantity } = req.body;
            
            let cart = await this.service.model.findOne({ 
                user: req.user._id 
            });
            
            if (!cart) {
                cart = await this.service.model.create({
                    user: req.user._id,
                    items: []
                });
            }
            
            const itemIndex = cart.items.findIndex(
                item => item.product.toString() === productId
            );
            
            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += quantity;
            } else {
                cart.items.push({ product: productId, quantity });
            }
            
            await cart.save();
            await cart.populate('items.product');
            
            res.sendCalmResponse(new this.dto.GetDTO(cart));
        } catch (e) {
            next(e);
        }
    }

    async removeItem(req, res, next) {
        try {
            const { productId } = req.params;
            
            const cart = await this.service.model.findOne({ 
                user: req.user._id 
            });
            
            if (!cart) {
                throw new Error('Cart not found');
            }
            
            cart.items = cart.items.filter(
                item => item.product.toString() !== productId
            );
            
            await cart.save();
            await cart.populate('items.product');
            
            res.sendCalmResponse(new this.dto.GetDTO(cart));
        } catch (e) {
            next(e);
        }
    }
}

module.exports = new CartController(cartService);
```

---

## Step 5: Order Module

### order.model.js

```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

class Order {
    initSchema() {
        const schema = new Schema({
            user: { type: Schema.Types.ObjectId, ref: 'user', required: true },
            items: [{
                product: { type: Schema.Types.ObjectId, ref: 'product' },
                name: String,
                quantity: Number,
                price: Number
            }],
            subtotal: Number,
            tax: Number,
            shipping: Number,
            total: Number,
            status: {
                type: String,
                enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
                default: 'pending'
            },
            shippingAddress: {
                name: String,
                phone: String,
                street: String,
                city: String,
                state: String,
                zipCode: String,
                country: String
            },
            paymentMethod: String,
            paymentStatus: {
                type: String,
                enum: ['pending', 'paid', 'failed'],
                default: 'pending'
            }
        }, { timestamps: true });

        try {
            mongoose.model('order', schema);
        } catch(e) {

        }
        
    }

    getInstance() {
        this.initSchema();
        return mongoose.model('order');
    }
}

module.exports = { Order };
```

---

## Step 6: Review Module

### review.model.js

```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

class Review {
    initSchema() {
        const schema = new Schema({
            product: { 
                type: Schema.Types.ObjectId, 
                ref: 'product',
                required: true
            },
            user: { 
                type: Schema.Types.ObjectId, 
                ref: 'user',
                required: true
            },
            rating: { 
                type: Number, 
                required: true, 
                min: 1, 
                max: 5 
            },
            title: String,
            comment: String,
            verified: { type: Boolean, default: false }
        }, { timestamps: true });

        schema.index({ product: 1, user: 1 }, { unique: true });
        try {
            mongoose.model('review', schema);
        } catch(e) {
            
        }
        
    }

    getInstance() {
        this.initSchema();
        return mongoose.model('review');
    }
}

module.exports = { Review };
```

---

## API Endpoints Summary

### Products
```
GET    /api/products              - List all
GET    /api/products/featured     - Featured products
GET    /api/products/category/:id - By category
GET    /api/products/:id          - Single product
POST   /api/products              - Create (Admin)
PUT    /api/products/:id          - Update (Admin)
DELETE /api/products/:id          - Delete (Admin)
```

### Cart
```
GET    /api/cart                  - My cart
POST   /api/cart/items            - Add item
DELETE /api/cart/items/:productId - Remove item
```

### Orders
```
GET    /api/orders                - My orders
POST   /api/orders                - Create order
GET    /api/orders/:id            - Single order
PUT    /api/orders/:id/cancel     - Cancel order
```

### Reviews
```
GET    /api/reviews/product/:id   - Product reviews
POST   /api/reviews               - Add review
PUT    /api/reviews/:id           - Update review
DELETE /api/reviews/:id           - Delete review
```

---

**That's it! You now have a complete e-commerce API! 🎉**
