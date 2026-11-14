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
   - or `DATABASE_URL=jdbc:postgresql://<host>:5432/<db>` if your host/provider uses the common cloud naming convention
   - `SPRING_DATASOURCE_USERNAME=<db-user>`
   - `SPRING_DATASOURCE_PASSWORD=<db-password>`
   - `SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver`
   - `HIBERNATE_DIALECT=org.hibernate.dialect.PostgreSQLDialect`
   - `JWT_SECRET=<strong-secret>`
   - `CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173`
5. Save and deploy.

## 2) Database setup

Use Supabase Postgres or Render Postgres. For Supabase, use the direct database host from the project settings and append `?sslmode=require`.

Important:
- The host must be the direct Postgres host, not a localhost value.
- Use the port shown in Supabase Database > Connection info (usually 5432 for direct connections).
- Add Render's outbound IP to Supabase's allowed IP list or enable public access for the database if you are using a small free setup.
- If the app logs show `java.net.SocketException: Network is unreachable`, the issue is environmental connectivity to the database host, not a Java compile error.

Example:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=<supabase-password>
```

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
