# Data Transfer Objects (DTOs)

**Control exactly what data goes in and out of your API.**

---

## What is a DTO?

A **DTO (Data Transfer Object)** is a pattern that:
- ✅ Validates input data
- ✅ Filters sensitive fields
- ✅ Ensures data consistency
- ✅ Formats output

Think of DTOs as "quality control" for your data.

---

## Three Types of DTOs

Every module has 3 DTOs:

1. **GetDTO** - Format data when reading
2. **InsertDTO** - Validate data when creating
3. **UpdateDTO** - Validate data when updating

---

## Basic DTO Structure

```javascript
class GetDTO {
    constructor({ ...props }) {
        // List ONLY fields to expose
        this._id = props._id;
        this.name = props.name;
        this.email = props.email;
        // password is NOT included (security!)
        
        Object.freeze(this);  // Make immutable
    }
}

class InsertDTO {
    constructor({ ...props }) {
        // List ONLY fields allowed when creating
        this.name = props.name;
        this.email = props.email;
        this.password = props.password;
        
        Object.freeze(this);
    }
}

class UpdateDTO {
    constructor({ ...props }) {
        // List ONLY fields allowed when updating
        this.name = props.name;
        this.email = props.email;
        
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

---

## Why DTOs Matter

### Without DTOs (Dangerous!)

```javascript
// User sends malicious data
POST /api/users
{
  "name": "Hacker",
  "email": "hacker@evil.com",
  "isAdmin": true,        // ⚠️ Trying to make themselves admin!
  "balance": 1000000      // ⚠️ Trying to give themselves money!
}

// Without DTOs, this might work! 😱
```

### With DTOs (Safe!)

```javascript
class InsertDTO {
    constructor({ ...props }) {
        this.name = props.name;
        this.email = props.email;
        // isAdmin and balance are ignored!
    }
}

// Only name and email are saved ✅
```

---

## Complete DTO Examples

### Product DTOs

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
        this.status = props.status;
        
        // Timestamps
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
        
        // User tracking
        this.createdBy = props.createdBy;
        this.updatedBy = props.updatedBy;
        
        Object.freeze(this);
    }
}

class InsertDTO {
    constructor({ ...props }) {
        this.name = props.name;
        this.sku = props.sku;
        this.description = props.description;
        this.price = props.price;
        this.stock = props.stock || 0;
        this.category = props.category;
        this.images = props.images || [];
        this.featured = props.featured || false;
        this.status = props.status || 'draft';
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
        this.status = props.status;
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

---

## Using DTOs in Controllers

```javascript
// In controller
async insert(req, res, next) {
    try {
        // Add user ID
        req.body.createdBy = req.user._id;
        
        // Validate with InsertDTO (filters bad fields)
        const insertData = new this.dto.InsertDTO(req.body);
        
        // Save
        const response = await this.service.insert(insertData);
        
        // Format response with GetDTO (filters sensitive fields)
        res.sendCalmResponse(new this.dto.GetDTO(response.data));
        
    } catch (e) {
        next(e);
    }
}
```

---

## Advanced DTO Techniques

### Add Validation Logic

```javascript
class InsertDTO {
    constructor({ ...props }) {
        // Validate email
        if (!props.email || !props.email.includes('@')) {
            throw new Error('Invalid email format');
        }
        
        // Validate price
        if (props.price < 0) {
            throw new Error('Price cannot be negative');
        }
        
        this.name = props.name;
        this.email = props.email;
        this.price = props.price;
        
        Object.freeze(this);
    }
}
```

### Transform Data

```javascript
class InsertDTO {
    constructor({ ...props }) {
        // Trim and lowercase email
        this.email = props.email?.trim().toLowerCase();
        
        // Ensure SKU is uppercase
        this.sku = props.sku?.toUpperCase();
        
        // Parse price as number
        this.price = parseFloat(props.price);
        
        Object.freeze(this);
    }
}
```

### Nested DTOs

```javascript
class AddressDTO {
    constructor({ ...props }) {
        this.street = props.street;
        this.city = props.city;
        this.zipCode = props.zipCode;
        Object.freeze(this);
    }
}

class UserDTO {
    constructor({ ...props }) {
        this.name = props.name;
        this.email = props.email;
        
        // Nested DTO
        this.address = props.address 
            ? new AddressDTO(props.address) 
            : null;
        
        Object.freeze(this);
    }
}
```

---

## Best Practices

### 1. Always Freeze DTOs
```javascript
Object.freeze(this);  // Makes DTO immutable
```

### 2. Remove Undefined in UpdateDTO
```javascript
Object.keys(this).forEach(key => {
    if (this[key] === undefined) {
        delete this[key];
    }
});
```

### 3. Never Expose Sensitive Data
```javascript
// Good - GetDTO doesn't include password
this.name = props.name;
this.email = props.email;

// Bad - Exposing password
this.password = props.password;  // ❌ Never do this!
```

### 4. Set Defaults in InsertDTO
```javascript
this.status = props.status || 'active';
this.role = props.role || 'user';
this.featured = props.featured || false;
```
