# API Key Management Portal

A secure settings panel where developers can generate, rotate, and revoke API keys used for authenticating CI/CD pipeline scans.

## Features

### 🔐 Security Features
- **Role-Based Access Control (RBAC)**: Only Admin and Developer users can view or manage API keys
- **Secure Key Generation**: API keys are generated using cryptographically secure random strings
- **Key Hashing**: All API keys are hashed using bcrypt before storage
- **Session-based Authentication**: All API calls require fresh session tokens
- **Key Masking**: Existing keys are masked in the UI (e.g., `sk_live_••••••••8a9b`)

### 🎯 Core Functionality
- **Generate New Keys**: Create API keys with custom names, descriptions, and expiration dates
- **Rotate Keys**: Securely rotate existing keys while maintaining the same metadata
- **Revoke Keys**: Immediately revoke access with secondary confirmation
- **Usage Tracking**: Monitor key usage counts and last-used timestamps
- **Permission Management**: Assign granular permissions to API keys

### 🎨 User Interface
- **Modern Design**: Clean, responsive interface built with React and Tailwind CSS
- **Toast Notifications**: Real-time feedback for all user actions
- **Confirmation Modals**: Secondary confirmation for destructive actions
- **Copy to Clipboard**: Easy copying of API keys and key IDs
- **Status Indicators**: Visual indicators for key status (active, revoked, expired)

## Architecture

### Backend (NestJS)
```
backend/src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── jwt.strategy.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   └── decorators/
│       └── roles.decorator.ts
├── user/
│   ├── entities/user.entity.ts
│   ├── user.controller.ts
│   ├── user.service.ts
│   └── dto/
├── api-key/
│   ├── entities/api-key.entity.ts
│   ├── api-key.controller.ts
│   ├── api-key.service.ts
│   └── dto/
└── app.module.ts
```

### Frontend (Next.js)
```
frontend/
├── components/
│   ├── ApiKeyManagement.tsx
│   └── Toaster.tsx
├── services/
│   └── api.ts
└── app/
    └── api-keys/
        └── page.tsx
```

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `GET /auth/profile` - Get user profile

### API Keys
- `GET /api-keys` - Get all API keys for current user
- `GET /api-keys/admin` - Get all API keys (Admin only)
- `GET /api-keys/:id` - Get specific API key
- `POST /api-keys` - Generate new API key
- `POST /api-keys/:id/rotate` - Rotate existing API key
- `POST /api-keys/:id/revoke` - Revoke API key
- `PATCH /api-keys/:id` - Update API key details

## User Roles

### Admin
- Full access to all API keys
- Can view and manage keys from all users
- Can create, rotate, and revoke any key

### Developer
- Can manage their own API keys
- Can create, rotate, and revoke their keys
- Cannot view keys from other users

### Viewer
- Read-only access
- Cannot manage API keys

## Security Implementation

### API Key Format
```
sk_live_<32-character-hex-string>
```

### Key Storage
- Plain text keys are shown only once during generation
- Keys are hashed using bcrypt (12 rounds) before database storage
- Key IDs are stored separately for identification

### Authentication Flow
1. User logs in with email/password
2. JWT token is issued with user role and permissions
3. All subsequent API calls include the JWT token
4. Role-based guards enforce access control

### Rate Limiting
- 100 requests per minute per IP address
- Additional throttling on sensitive endpoints

## Installation & Setup

### Backend Setup
```bash
cd backend
npm install
# Set up environment variables
cp .env.example .env
# Run database migrations
npm run migration:run
# Start development server
npm run start:dev
```

### Frontend Setup
```bash
cd frontend
npm install
# Set up environment variables
cp .env.example .env.local
# Start development server
npm run dev
```

### Environment Variables

#### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/soroban_scanner
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
```

#### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Testing

### Backend Tests
```bash
cd backend
npm run test
npm run test:watch
npm run test:cov
```

### Frontend Tests
```bash
cd frontend
npm run test
npm run test:watch
npm run test:cov
```

## CI/CD Integration

The API key management system is designed to integrate seamlessly with CI/CD pipelines:

### Example GitHub Actions Usage
```yaml
- name: Security Scan with API Key
  run: |
    curl -X POST "https://api.soroban-scanner.com/scan" \
      -H "Authorization: Bearer ${{ secrets.API_KEY }}" \
      -H "Content-Type: application/json" \
      -d '{"contract_address": "0x..."}'
```

### Pipeline Authentication
1. Generate API key in the management portal
2. Store the key as a secret in your CI/CD system
3. Use the key to authenticate pipeline scans
4. Monitor usage and rotate keys regularly

## Monitoring & Auditing

### Key Usage Metrics
- Creation date and time
- Last used timestamp
- Total usage count
- Current status (active, revoked, expired)

### Security Events
- Key generation events
- Key rotation events
- Key revocation events
- Failed authentication attempts

## Best Practices

### Key Management
- Rotate API keys regularly (recommended every 90 days)
- Use descriptive names for easy identification
- Set appropriate expiration dates
- Revoke unused keys immediately
- Monitor usage patterns for anomalies

### Security
- Never share API keys in public repositories
- Use environment variables for key storage
- Implement principle of least privilege
- Regular security audits of key usage
- Enable logging and monitoring

## Troubleshooting

### Common Issues

#### API Key Not Working
1. Check if the key is active and not expired
2. Verify the key has the required permissions
3. Ensure the key is being sent correctly in the Authorization header
4. Check for IP restrictions or rate limiting

#### Access Denied Errors
1. Verify user role and permissions
2. Check if the JWT token is valid and not expired
3. Ensure proper authentication headers are set
4. Review RBAC configuration

#### Key Generation Issues
1. Check database connectivity
2. Verify user permissions
3. Review error logs for specific issues
4. Ensure sufficient system resources

## Support

For support and questions:
- Check the documentation in `/docs`
- Review GitHub Issues
- Contact the development team
- Check system status and logs

---

**Security Notice**: This system handles sensitive authentication credentials. Ensure proper security measures are in place when deploying to production environments.
