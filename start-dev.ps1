$backend = "apps/backend"
$frontend = "apps/frontend"

Write-Host "Starting Pharmacy backend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; mvn spring-boot:run"

Write-Host "Starting Pharmacy frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontend'; npm install --no-fund --no-audit; npm run dev"

Write-Host "Open http://localhost:5173"
