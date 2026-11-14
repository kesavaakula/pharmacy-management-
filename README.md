# Pharmacy Management Platform

A secure, modern pharmacy inventory and sales management application designed for UK healthcare operations.

## Business scope

- Billing to customer
- Ordering medicines from vendors
- Inventory tracking and reorder alerts
- Purchase management
- Stock maintenance and expiry monitoring
- Secure role-based access for staff and admins
- Dashboard for sales, inventory, and revenue insights

## Recommended architecture

- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Java 21 + Spring Boot 3 + Spring Security + JWT
- Database: PostgreSQL
- Cache/queue: Redis (optional for future scaling)
- Containerization: Docker + Docker Compose

## Project structure

- apps/backend — Java Spring Boot REST API
- apps/frontend — React dashboard for pharmacists and admins
- docker-compose.yml — PostgreSQL + app services

## End-to-end workflow

1. Supplier orders are created and tracked.
2. Medicines are received into stock with expiry and batch data.
3. Inventory levels are monitored against reorder thresholds.
4. Customer sales and billing are processed with invoice generation.
5. Dashboard exposes live stock, revenue, and low-stock status.

## Security design

- JWT authentication
- Role-based access control
- BCrypt password hashing
- HTTPS-ready configuration
- Input validation and audit-friendly records

## Quick start

```bash
docker compose up --build
```

Then access:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8081
- PostgreSQL: localhost:5432

## Tech choices

- PostgreSQL is chosen for transactional inventory and billing data integrity.
- React with Tailwind ensures a modern and attractive user experience.
- Spring Boot provides a secure, scalable backend for inventory workflows.
