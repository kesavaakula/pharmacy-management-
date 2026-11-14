# Render + Vercel deployment guide

This project is configured for the free-tier Option 1 deployment flow:

- Frontend: Vercel
- Backend: Render
- Database: Supabase or Render Postgres

## 1) Backend on Render

1. Push the backend project to GitHub.
2. In Render, create a new Web Service.
3. Select the backend repository and set:
   - Build Command: `./mvnw clean package`
   - Start Command: `java -jar target/pharmacy-backend-1.0.0.jar`
4. Add environment variables:
   - `SERVER_PORT=8081`
   - `SPRING_DATASOURCE_URL=jdbc:postgresql://<host>:5432/<db>`
   - `SPRING_DATASOURCE_USERNAME=<db-user>`
   - `SPRING_DATASOURCE_PASSWORD=<db-password>`
   - `SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver`
   - `HIBERNATE_DIALECT=org.hibernate.dialect.PostgreSQLDialect`
   - `JWT_SECRET=<strong-secret>`
   - `CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173`
5. Save and deploy.

## 2) Database setup

Use Supabase Postgres or Render Postgres. Once created, copy the connection string into the backend env variables.

## 3) Frontend on Vercel

1. Push the frontend project to GitHub.
2. Import the frontend repository into Vercel.
3. Set environment variable:
   - `VITE_API_BASE_URL=https://your-render-backend-url.onrender.com`
4. Deploy.

## 4) CORS and app behavior

The backend allows requests from the frontend origin configured in `CORS_ALLOWED_ORIGINS`.

The frontend uses `VITE_API_BASE_URL` instead of assuming the API is on the same domain.

## 5) Admin login

Default admin account seeded by the app:

- Email: `admin@pharmacy.local`
- Password: `Admin@123`

## 6) Production notes

- Use a strong secret for `JWT_SECRET`.
- Do not commit real `.env` files.
- Keep Vercel and Render secrets in their respective dashboards.
