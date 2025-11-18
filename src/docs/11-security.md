# Security

CalmAPI comes with built-in security features and follows industry best practices to help you build secure applications. This guide covers the default security mechanisms and additional measures you should implement for production environments.

## Built-in Security Features

### Data Sanitization Middleware (✅ Enabled by default)

CalmAPI includes a built-in data sanitizer that protects against MongoDB injection attacks by removing malicious operators from incoming requests.

**Location:** `system/helpers/sanitizer-middleware.js`

The sanitizer automatically cleans:
- Request body (`req.body`)
- Query parameters (`req.query`)
- URL parameters (`req.params`)

**How it works:**

The middleware recursively scans all incoming data and removes any keys that start with `$`, which are MongoDB operators commonly used in injection attacks (e.g., `$where`, `$ne`, `$gt`).

```javascript
// Example of what gets sanitized
// Before sanitization:
{
  username: "admin",
  password: { $ne: null }  // Injection attempt
}

// After sanitization:
{
  username: "admin"
  // $ne operator removed
}
```

**Usage:**

The sanitizer is typically applied globally as middleware:

```javascript
const { sanitizerMiddleware } = require('./system/helpers/sanitizer-middleware');

// Apply globally to all routes
app.use(sanitizerMiddleware);
```

You can also apply it to specific routes:

```javascript
router.post('/login', sanitizerMiddleware, authController.login);
```

### CORS Configuration

Cross-Origin Resource Sharing (CORS) is configurable to control which domains can access your API.

**Location:** `system/configs/server.js`

Configure CORS settings to restrict or allow specific origins:

```javascript
// Example CORS configuration in server.js
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

**Best practices:**
- Never use `origin: '*'` in production
- Specify exact domains that should access your API
- Use environment variables to manage different origins per environment
- Enable credentials only when necessary

**Example .env configuration:**

```env
# Single origin
ALLOWED_ORIGINS=https://myapp.com

# Multiple origins (comma-separated)
ALLOWED_ORIGINS=https://myapp.com,https://admin.myapp.com
```

### Helmet Security Headers (✅ Enabled by default)

CalmAPI has [Helmet](https://helmetjs.github.io/) enabled by default, which sets various HTTP headers to protect your application from common web vulnerabilities.

Helmet helps protect against:
- Cross-Site Scripting (XSS) attacks
- Clickjacking
- MIME type sniffing
- DNS prefetch control
- And other common vulnerabilities

The default Helmet configuration provides sensible defaults for most applications.

## Production Security Best Practices

### 1. Environment Variables

Never hardcode sensitive information. Use environment variables for:

```env
# Database credentials
MONGODB_URI=your-mongodb-url

# JWT secrets
JWT_SECRET=your-very-long-random-secret-key
JWT_REFRESH_SECRET=another-very-long-random-secret-key

# API keys
API_KEY=your-api-key
STRIPE_SECRET_KEY=your-stripe-secret
```

**Tips:**
- Use strong, randomly generated secrets (at least 32 characters)
- Use different secrets for different environments
- Never commit `.env` files to version control
- Rotate secrets regularly

### 2. Input Validation

Always validate and sanitize user input:

```javascript
// Use DTOs for validation
class CreateUserDto {
  static validate(data) {
    const errors = [];
    
    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push('Invalid email address');
    }
    
    if (!data.password || data.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    return errors;
  }
  
  static isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```

### 3. Authentication & Authorization

Implement proper authentication and authorization:

```javascript
// JWT-based authentication example
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based authorization
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

### 4. Rate Limiting

Protect your API from abuse and DDoS attacks:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

// Apply to all routes
app.use('/api/', limiter);

// Stricter limit for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts'
});

app.use('/api/auth/login', authLimiter);
```

### 5. Password Security

Use strong hashing algorithms for passwords:

```javascript
const bcrypt = require('bcrypt');

// Hashing password
const hashPassword = async (password) => {
  const saltRounds = 12; // Increase for more security
  return await bcrypt.hash(password, saltRounds);
};

// Comparing password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
```

**Best practices:**
- Use bcrypt or argon2 for password hashing
- Never store passwords in plain text
- Enforce strong password policies (length, complexity)
- Implement password reset with time-limited tokens

### 6. Reverse Proxy & HTTPS/SSL

Always use HTTPS in production. The recommended approach is to use a reverse proxy like Nginx or Apache to handle SSL/TLS termination.

**Using Nginx as a reverse proxy:**

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL certificate files
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Proxy to your Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Using Apache as a reverse proxy:**

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    
    SSLEngine on
    SSLCertificateFile /path/to/ssl/certificate.crt
    SSLCertificateKeyFile /path/to/ssl/private.key
    
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
</VirtualHost>
```

**Benefits of using a reverse proxy:**
- Offloads SSL/TLS processing from your Node.js application
- Better performance and resource utilization
- Centralized SSL certificate management
- Easy to configure load balancing
- Additional security features (rate limiting, IP filtering)
- Static file serving without hitting your application

**Getting SSL certificates:**
- Use [Let's Encrypt](https://letsencrypt.org/) for free SSL certificates
- Use [Certbot](https://certbot.eff.org/) to automate certificate installation and renewal
- For Nginx with Let's Encrypt: `sudo certbot --nginx -d yourdomain.com`
- For Apache with Let's Encrypt: `sudo certbot --apache -d yourdomain.com`

### 7. Database Security

Protect your database:

```javascript
// Use connection pooling
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

// Create indexes for performance and security
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
```

**Best practices:**
- Use least privilege principle for database users
- Enable authentication on your database
- Use network isolation (firewall rules, VPC)
- Regular backups and disaster recovery plan
- Keep MongoDB updated to latest stable version

### 8. Error Handling

Never expose sensitive information in errors:

```javascript
// Bad - exposes internal details
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.stack });
});

// Good - generic error message
app.use((err, req, res, next) => {
  console.error(err); // Log for debugging
  
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
    
  res.status(err.status || 500).json({ 
    error: message 
  });
});
```

### 9. Logging & Monitoring

Implement comprehensive logging:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log security events
logger.info('User login', { userId: user.id, ip: req.ip });
logger.warn('Failed login attempt', { email: req.body.email, ip: req.ip });
logger.error('Authorization failed', { userId: user.id, resource: req.path });
```

### 10. Dependency Management

Keep dependencies secure and updated:

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

**Best practices:**
- Regularly update dependencies
- Review security advisories
- Use `npm ci` in production for reproducible builds
- Minimize the number of dependencies
- Use tools like Snyk or Dependabot

### 11. Additional Security Headers

Configure additional security headers:

```javascript
// Custom security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

## Security Checklist

Before deploying to production, ensure:

- [ ] All environment variables are properly configured
- [ ] CORS is restricted to specific domains
- [ ] HTTPS/SSL is enabled
- [ ] Rate limiting is implemented
- [ ] Input validation is in place for all endpoints
- [ ] Authentication and authorization are properly implemented
- [ ] Passwords are hashed with bcrypt or argon2
- [ ] Error messages don't expose sensitive information
- [ ] Logging and monitoring are configured
- [ ] Database has authentication enabled
- [ ] Dependencies are updated and audited
- [ ] Security headers are configured
- [ ] File upload restrictions are in place (if applicable)
- [ ] API keys and secrets are rotated regularly

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Helmet.js Documentation](https://helmetjs.github.io/)

## Next Steps

Now that you understand CalmAPI's security features, explore:
- [Advanced Topics](advanced) - Learn about middleware, error handling, and more
- [Built-in Modules](built-in-modules) - Discover ready-to-use modules
