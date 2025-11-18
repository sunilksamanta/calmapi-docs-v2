# Working with Models

**Master MongoDB schemas, validation, hooks, and relationships in CalmAPI.**

---

## What is a Model?

A **Model** defines your database schema - the structure of your data in MongoDB.

Think of it as a blueprint:
- 📝 What fields exist (name, email, price, etc.)
- 🔍 What type each field is (String, Number, Boolean, etc.)
- ✅ What validation rules apply (required, unique, min/max, etc.)
- 🔗 How documents relate to each other (references)

---

## Model File Structure

Every model file follows this pattern:

```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

class ModelName {
    initSchema() {
        const schema = new Schema({
            // Define your fields here
        }, {
            timestamps: true  // Adds createdAt & updatedAt
        });

        // Add hooks, methods, indexes here
        try{
            mongoose.model('modelname', schema);
        } catch(e) {
            
        }
        
    }

    getInstance() {
        this.initSchema();
        return mongoose.model('modelname');
    }
}

module.exports = { ModelName };
```

---

## Field Types

### Basic Types

```javascript
const schema = new Schema({
    // String
    name: String,
    email: { type: String },
    
    // Number
    age: Number,
    price: { type: Number },
    
    // Boolean
    isActive: Boolean,
    featured: { type: Boolean, default: false },
    
    // Date
    birthDate: Date,
    publishedAt: { type: Date, default: Date.now },
    
    // Array
    tags: [String],
    scores: [Number],
    
    // Mixed (any type)
    metadata: Schema.Types.Mixed,
    
    // ObjectId (for references)
    userId: Schema.Types.ObjectId,
    
    // Buffer (for binary data)
    data: Buffer
});
```

### Nested Objects

```javascript
const schema = new Schema({
    address: {
        street: String,
        city: String,
        zipCode: String,
        country: { type: String, default: 'USA' }
    },
    
    // Or as a sub-schema
    profile: {
        type: new Schema({
            bio: String,
            avatar: String,
            social: {
                twitter: String,
                linkedin: String
            }
        }),
        default: {}
    }
});
```

---

## Validation

### Required Fields

```javascript
name: {
    type: String,
    required: true
}

// With custom error message
email: {
    type: String,
    required: [true, 'Email is required']
}
```

### Unique Fields

```javascript
email: {
    type: String,
    unique: true,
    required: true
}

// For unique validation to work, install plugin:
const uniqueValidator = require('mongoose-unique-validator');
schema.plugin(uniqueValidator);
```

### String Validation

```javascript
username: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 20,
    trim: true,        // Remove whitespace
    lowercase: true    // Convert to lowercase
}

email: {
    type: String,
    match: [/^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/, 'Invalid email']
}

status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
}
```

### Number Validation

```javascript
age: {
    type: Number,
    min: [0, 'Age cannot be negative'],
    max: [120, 'Invalid age']
}

price: {
    type: Number,
    required: true,
    min: 0,
    validate: {
        validator: function(value) {
            return value % 1 === 0 || value % 1 === 0.99;
        },
        message: 'Price must end in .00 or .99'
    }
}
```

### Custom Validators

```javascript
password: {
    type: String,
    required: true,
    validate: {
        validator: function(value) {
            // Must be at least 8 characters with 1 number
            return /^(?=.*\d).{8,}$/.test(value);
        },
        message: 'Password must be at least 8 characters with 1 number'
    }
}
```

---

## Complete Model Example: Product

```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;
const uniqueValidator = require('mongoose-unique-validator');

class Product {
    initSchema() {
        const schema = new Schema({
            // Basic Info
            name: {
                type: String,
                required: [true, 'Product name is required'],
                trim: true,
                minlength: 3,
                maxlength: 100
            },
            
            slug: {
                type: String,
                unique: true,
                lowercase: true
            },
            
            sku: {
                type: String,
                required: true,
                unique: true,
                uppercase: true
            },
            
            description: {
                type: String,
                maxlength: 2000
            },
            
            // Pricing
            price: {
                type: Number,
                required: true,
                min: [0, 'Price cannot be negative']
            },
            
            comparePrice: {
                type: Number,
                min: 0,
                validate: {
                    validator: function(value) {
                        return value > this.price;
                    },
                    message: 'Compare price must be higher than price'
                }
            },
            
            // Inventory
            stock: {
                type: Number,
                default: 0,
                min: [0, 'Stock cannot be negative']
            },
            
            lowStockThreshold: {
                type: Number,
                default: 10
            },
            
            // Categorization
            category: {
                type: Schema.Types.ObjectId,
                ref: 'category',
                required: true
            },
            
            tags: [String],
            
            // Media
            images: [{
                url: String,
                alt: String,
                order: Number
            }],
            
            // Status
            status: {
                type: String,
                enum: ['draft', 'active', 'archived'],
                default: 'draft'
            },
            
            featured: {
                type: Boolean,
                default: false
            },
            
            // SEO
            seo: {
                title: String,
                description: String,
                keywords: [String]
            },
            
            // Tracking
            views: {
                type: Number,
                default: 0
            },
            
            sales: {
                type: Number,
                default: 0
            },
            
            // User tracking
            createdBy: {
                type: Schema.Types.ObjectId,
                ref: 'user'
            },
            
            updatedBy: {
                type: Schema.Types.ObjectId,
                ref: 'user'
            }
            
        }, { 
            timestamps: true  // Adds createdAt, updatedAt
        });

        // Indexes for performance
        schema.index({ name: 'text', description: 'text' });
        schema.index({ category: 1, status: 1 });
        schema.index({ price: 1 });
        schema.index({ createdAt: -1 });

        // Virtual field: isLowStock
        schema.virtual('isLowStock').get(function() {
            return this.stock <= this.lowStockThreshold;
        });

        // Virtual field: discount percentage
        schema.virtual('discountPercent').get(function() {
            if (!this.comparePrice) return 0;
            return Math.round(
                ((this.comparePrice - this.price) / this.comparePrice) * 100
            );
        });

        // Pre-save hook: Generate slug
        schema.pre('save', function(next) {
            if (this.isModified('name') && !this.slug) {
                this.slug = this.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');
            }
            next();
        });

        // Method: Check if available
        schema.methods.isAvailable = function() {
            return this.status === 'active' && this.stock > 0;
        };

        // Static: Find low stock products
        schema.statics.findLowStock = function() {
            return this.find({
                $expr: { $lte: ['$stock', '$lowStockThreshold'] }
            });
        };

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

---

## Relationships (References)

### One-to-Many

```javascript
// Post belongs to one User
const postSchema = new Schema({
    title: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    }
});
```

### Many-to-Many

```javascript
// Post has many Tags, Tag has many Posts
const postSchema = new Schema({
    title: String,
    tags: [{
        type: Schema.Types.ObjectId,
        ref: 'tag'
    }]
});
```

### Nested Documents

```javascript
// Order has Items (embedded)
const orderSchema = new Schema({
    items: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'product'
        },
        quantity: Number,
        price: Number
    }],
    total: Number
});
```

---

## Schema Hooks (Middleware)

### Pre-Save Hook

Runs **before** saving:

```javascript
schema.pre('save', function(next) {
    // 'this' refers to the document
    
    // Only run if password was modified
    if (this.isModified('password')) {
        // Hash password
        this.password = bcrypt.hashSync(this.password, 10);
    }
    
    next();
});
```

### Post-Save Hook

Runs **after** saving:

```javascript
schema.post('save', function(doc) {
    console.log(`${doc.name} has been saved`);
});
```

### Pre-Remove Hook

```javascript
schema.pre('remove', async function(next) {
    // Delete related documents
    await mongoose.model('Comment').deleteMany({ 
        post: this._id 
    });
    next();
});
```

### Real Example: Slug Generation

```javascript
schema.pre('save', function(next) {
    if (!this.isModified('title')) return next();
    
    this.slug = this.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
    
    next();
});
```

---

## Virtual Fields

**Virtuals** are computed fields that don't get saved to the database.

```javascript
schema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

schema.virtual('fullName').set(function(value) {
    const parts = value.split(' ');
    this.firstName = parts[0];
    this.lastName = parts[1];
});

// Use in toJSON
schema.set('toJSON', { virtuals: true });
schema.set('toObject', { virtuals: true });
```

**Example:**

```javascript
const user = await User.findById(id);
console.log(user.fullName);  // "John Doe" (not in DB!)
```

---

## Instance Methods

Add methods to **individual documents**:

```javascript
schema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

schema.methods.generateToken = function() {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET);
};

// Usage
const user = await User.findOne({ email });
const isMatch = await user.comparePassword(password);
```

---

## Static Methods

Add methods to the **Model itself**:

```javascript
schema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

schema.statics.findActive = function() {
    return this.find({ status: 'active' });
};

// Usage
const user = await User.findByEmail('john@example.com');
const activeUsers = await User.findActive();
```

---

## Indexes

Indexes improve query performance.

```javascript
// Single field index
schema.index({ email: 1 });

// Compound index
schema.index({ lastName: 1, firstName: 1 });

// Text index for search
schema.index({ name: 'text', description: 'text' });

// Unique index
schema.index({ email: 1 }, { unique: true });

// Sparse index (only index documents that have the field)
schema.index({ phone: 1 }, { sparse: true });
```

---

## Complete Example: User Model

```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcrypt');
const uniqueValidator = require('mongoose-unique-validator');

class User {
    initSchema() {
        const schema = new Schema({
            firstName: {
                type: String,
                required: true,
                trim: true
            },
            lastName: {
                type: String,
                required: true,
                trim: true
            },
            email: {
                type: String,
                required: true,
                unique: true,
                lowercase: true,
                trim: true,
                match: [/^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,}$/, 'Invalid email']
            },
            password: {
                type: String,
                required: true,
                select: false  // Don't return in queries
            },
            role: {
                type: String,
                enum: ['user', 'admin'],
                default: 'user'
            },
            status: {
                type: Boolean,
                default: true
            },
            avatar: String,
            lastLogin: Date
        }, { timestamps: true });

        // Virtual: Full Name
        schema.virtual('fullName').get(function() {
            return `${this.firstName} ${this.lastName}`;
        });

        // Pre-save: Hash password
        schema.pre('save', async function(next) {
            if (!this.isModified('password')) return next();
            this.password = await bcrypt.hash(this.password, 10);
            next();
        });

        // Method: Compare password
        schema.methods.comparePassword = async function(candidatePassword) {
            return await bcrypt.compare(candidatePassword, this.password);
        };

        // Static: Find by email
        schema.statics.findByEmail = function(email) {
            return this.findOne({ email }).select('+password');
        };

        schema.plugin(uniqueValidator);

        try {
            mongoose.model('user', schema);
        } catch (e) {}
    }

    getInstance() {
        this.initSchema();
        return mongoose.model('user');
    }
}

module.exports = { User };
```

---

## Tips & Best Practices

### 1. Use Timestamps
Always enable timestamps:

```javascript
new Schema({ ... }, { timestamps: true });
```

### 2. Select: false for Sensitive Data

```javascript
password: {
    type: String,
    required: true,
    select: false  // Won't be returned in queries
}
```

To explicitly include it:

```javascript
const user = await User.findById(id).select('+password');
```

### 3. Default Values

```javascript
status: { type: String, default: 'pending' }
role: { type: String, default: 'user' }
createdAt: { type: Date, default: Date.now }
```

### 4. Enum for Fixed Options

```javascript
status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
}
```

### 5. Trim Strings

```javascript
name: { type: String, trim: true }
email: { type: String, trim: true, lowercase: true }
```

---

## Common Patterns

### Pattern 1: Soft Delete

```javascript
deletedAt: Date

// Instead of deleting
user.deletedAt = new Date();
await user.save();

// Query non-deleted only
schema.methods.findActive = function() {
    return this.find({ deletedAt: null });
};
```

### Pattern 2: Audit Fields

```javascript
createdBy: { type: Schema.Types.ObjectId, ref: 'user' }
updatedBy: { type: Schema.Types.ObjectId, ref: 'user' }
deletedBy: { type: Schema.Types.ObjectId, ref: 'user' }
```

### Pattern 3: Versioning

```javascript
version: { type: Number, default: 1 }

schema.pre('save', function(next) {
    if (!this.isNew) this.version += 1;
    next();
});
```

---

## What's Next?

Now you can create powerful database schemas! Let's learn how Controllers use these models.

**Next:** [Controllers Made Easy →](controllers)

---

[← Previous: Creating Modules](creating-modules) | [Back to Index](/) | [Next: Controllers →](controllers)
