# RBAC Documentation

## Roles

| Role | Default Route | Description |
|------|---------------|-------------|
| Owner | `/dashboard` | Full unrestricted access |
| Manager | `/dashboard` | Operations, inventory, expenses (no settings/staff mgmt) |
| Chef | `/kitchen` | Kitchen queue, recipes, ingredients, AI prep alerts |
| Waiter | `/dashboard` | Tables, orders, menu (no inventory/finance) |
| Cashier | `/dashboard` | Billing, payments, daily sales |

## Security Layers

1. **JWT** — Access token includes `userId` and `role`
2. **Permission middleware** — `authorize('permission.name')` on every API route
3. **Role middleware** — `authorizeRoles('Owner', 'Manager')` for role-specific endpoints
4. **Owner bypass** — Owner passes all permission checks automatically
5. **Frontend guards** — Route-level access via `canAccessRoute()` in layout
6. **Sidebar filtering** — Navigation items filtered by role + permissions
7. **403 page** — Unauthorized access redirects to `/403`

## Re-seed Permissions

After updating permissions config:

```bash
cd backend
npm run db:seed
```

Users must **log out and log back in** to refresh JWT with updated role/permissions.

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@restaurantos.com | Password@123 |
| Manager | manager@restaurantos.com | Password@123 |
| Chef | chef@restaurantos.com | Password@123 |
| Waiter | waiter@restaurantos.com | Password@123 |
| Cashier | cashier@restaurantos.com | Password@123 |
