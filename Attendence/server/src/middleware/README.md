# Middleware

- `error.js` ✅ - ApiError, 404 handler, global error handler
- `auth.js` (Phase 3) - verifies JWT, attaches `req.user`
- `role.js` (Phase 3) - role-based access control (`requireRole('admin')`)
- `validate.js` (Phase 3) - express-validator result checker
