# Pharmacy Management Architecture

## End-to-end workflow

```mermaid
flowchart LR
    A[Customer Order / Prescription] --> B[Billing Module]
    B --> C[Sales Invoice]
    C --> D[Inventory Validation]
    D --> E[Medicine Stock Update]
    F[Supplier Purchase Request] --> G[Purchase Order]
    G --> H[Receive Goods]
    H --> I[Inventory Ledger]
    I --> J[Dashboard & Alerts]
    J --> K[Reorder Recommendations]
```

## System components

- React frontend for operations, dashboard, and workflows
- Spring Boot backend for business logic and API layers
- PostgreSQL for transactional inventory and billing history
- JWT security for protected admin and pharmacy staff workflows
- Docker compose for local infrastructure setup

## Core data model

```mermaid
erDiagram
    USER ||--o{ ROLE : has
    CUSTOMER ||--o{ SALES_INVOICE : places
    SALES_INVOICE ||--o{ SALES_ITEM : contains
    MEDICINE ||--o{ SALES_ITEM : sold
    SUPPLIER ||--o{ PURCHASE_ORDER : supplies
    PURCHASE_ORDER ||--o{ PURCHASE_ORDER_ITEM : has
    MEDICINE ||--o{ PURCHASE_ORDER_ITEM : purchased
    MEDICINE ||--o{ INVENTORY_LOG : tracked_by
```

## Security model

- Role-based access for pharmacists, admins, and staff
- JWT bearer tokens for all secured API calls
- Password hashing with BCrypt
- HTTPS and environment variables for secrets
- Audit-friendly transaction tracking in the database
