# CalmAPI Documentation

A modern React-based documentation website for CalmAPI - a production-ready modular REST API framework.

## Features

- 📖 Complete documentation with 10 guide sections
- 🎨 Clean and responsive design
- 🌙 Dark mode support
- 📱 Mobile-friendly navigation
- 🔍 Easy-to-navigate sidebar
- 💻 Syntax-highlighted code blocks

## Quick Start

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Documentation Structure

- **Introduction** - Overview and key features
- **Guide** (10 chapters)
  1. Getting Started
  2. Architecture
  3. Creating Modules
  4. Models
  5. Controllers
  6. Services
  7. DTOs
  8. Routing
  9. Built-in Modules
  10. Advanced Techniques
- **Resources**
  - Quick Reference
  - Example Project

## Tech Stack

- React 18
- React Router 6
- React Markdown
- Vite
- CSS3 with modern features

## Project Structure

```
calmapi-docs/
├── src/
│   ├── components/       # Reusable components
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   └── Layout.jsx
│   ├── pages/            # Page components
│   │   └── DocsPage.jsx
│   ├── docs/             # Markdown documentation files
│   ├── App.jsx           # Main app component
│   └── main.jsx          # Entry point
├── index.html
├── package.json
└── vite.config.js
```

## License

This documentation website is part of the CalmAPI project.

## Links

- [CalmAPI Website](https://calmapi.dev)
- [GitHub Repository](https://github.com/sunilksamanta/calmapi)
- [API Documentation](https://docs.calmapi.dev)
