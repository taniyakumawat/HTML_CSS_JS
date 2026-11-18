# Route files

Each sub-resource gets its own router file, mounted in `src/routes/index.js`:

```js
import authRoutes from './auth.routes.js';
router.use('/auth', authRoutes);   // -> /api/auth/login
```

Planned files: `auth.routes.js`, `student.routes.js`, `teacher.routes.js`,
`attendance.routes.js`, `report.routes.js`, `timetable.routes.js`, etc.
