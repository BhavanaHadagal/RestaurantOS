# RestaurantOS API Documentation

## Overview

RestaurantOS provides a RESTful API built with Express.js. All endpoints (except auth login/refresh/forgot/reset) require JWT authentication via `Authorization: Bearer <token>` header.

## Response Format

```json
{
  "success": true,
  "data": {},
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Error Format

```json
{
  "success": false,
  "message": "Error description"
}
```

## Pagination & Filtering

All list endpoints support:
- `page` (default: 1)
- `limit` (default: 10, max: 100)
- `search` (text search)
- `sortBy` (field name)
- `sortOrder` (asc/desc)

## Roles & Permissions

| Role | Key Permissions |
|------|----------------|
| Owner | Full access |
| Manager | All except user deletion |
| Chef | Kitchen, orders, menu view, AI |
| Waiter | Tables, orders, customers, reservations |
| Cashier | Bills, payments, orders view |
| Store Manager | Inventory, suppliers, expenses, invoices, reports, AI |

## Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| join-kitchen | Client → Server | Join kitchen room |
| join-dashboard | Client → Server | Join dashboard room |
| new-order | Server → Client | New order created |
| order-update | Server → Client | Order status changed |
| kitchen-update | Server → Client | Kitchen item updated |
| low-stock-alert | Server → Client | Low stock detected |

## AI Service Endpoints

Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /ocr/invoice | Process invoice OCR |
| POST | /predict/shortage | Predict ingredient shortages |
| POST | /predict/reorder | Stock reorder recommendations |
| POST | /predict/pricing | Menu price recommendations |
| POST | /predict/prep-time | Prep time prediction |
| POST | /analyze/waste | Waste analysis |
| POST | /analyze/insights | Business insights |
