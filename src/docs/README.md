# CalmAPI Documentation

**Production-Ready Modular REST API Framework using NodeJS & MongoDB**

> Keep Calm and REST

---

## 📚 Table of Contents

1. [Getting Started](getting-started) - Installation and project setup
2. [Understanding the Architecture](architecture) - Core concepts and structure
3. [Creating Your First Module](creating-modules) - Quick start guide to building APIs
4. [Working with Models](models) - Database schema and validation
5. [Controllers Made Easy](controllers) - Request handling and super methods
6. [Services Layer](services) - Business logic and database operations
7. [Data Transfer Objects (DTOs)](dtos) - Input validation and response formatting
8. [Routing & Configuration](routing) - Custom paths and nested routes
9. [Built-in Modules](built-in-modules) - Auth, User, Media & Post
10. [Advanced Techniques](advanced) - Tips, tricks, and best practices
11. [Built in Security & Best Practices](security) - Securing your API
12. [Deployment Guide](deployment) - From local to production

---

## 🎯 What is CalmAPI?

CalmAPI is a **zero-hidden-magic** REST API framework that generates production-ready, modular APIs in seconds. Unlike other frameworks that hide complexity in node_modules, CalmAPI puts everything in your project where you can see it, customize it, and own it.

### Key Features

✅ **Production Ready** - Controller, Model & Service oriented architecture  
✅ **Lightning Fast** - Generate complete CRUD modules with one command  
✅ **Built-in Auth** - JWT authentication with database token store  
✅ **No Hidden Magic** - All code is visible and customizable  
✅ **Smart Routing** - Automatic route generation with nesting support  
✅ **DTO Support** - Clean data validation and transformation  
✅ **File Uploads** - AWS S3 integration out of the box  
✅ **ESLint Ready** - Code quality baked in  

---

## ⚡ Quick Example

Create a complete CRUD API in seconds:

```bash
# Generate a module
calmapi generate module product

# That's it! Your API is ready at:
# GET    /api/products
# GET    /api/products/:id
# POST   /api/products
# PUT    /api/products/:id
# DELETE /api/products/:id
```

---

## 🏗️ What Gets Generated?

Every module includes:

```
src/modules/product/
├── product.controller.js  # Request handling
├── product.service.js     # Business logic
├── product.model.js       # Database schema
├── product.route.js       # Route definitions
├── product.dto.js         # Data validation
└── product.settings.js    # Module configuration
```

---

## 🎓 Who Is This For?

- **Beginners** who want to learn backend development with a clear structure
- **Teams** who need a consistent, maintainable codebase
- **Developers** who value transparency over "magic"
- **Startups** who need to move fast without sacrificing quality

---

## 🚀 Ready to Build?

Start with [Getting Started](getting-started) to install CalmAPI and create your first project!

---

## 📖 Documentation Philosophy

This documentation is written for **complete beginners**. We explain:
- **WHY** - Why things work the way they do
- **HOW** - Step-by-step instructions
- **WHEN** - When to use different features
- **EXAMPLES** - Real-world code you can copy and modify

Every concept builds on the previous one. Start from page 1 and go in order for the best learning experience.

---

## 🤝 Need Help?

- 🌐 Website: [https://calmapi.dev](https://calmapi.dev)
- 📦 GitHub: [https://github.com/sunilksamanta/calmapi](https://github.com/sunilksamanta/calmapi)
- 📚 API Docs: [https://docs.calmapi.dev](https://docs.calmapi.dev)

---

**Let's build something amazing together! 🎉**
