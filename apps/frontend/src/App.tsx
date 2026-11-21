import { Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import { SummaryProvider } from './components/SummaryContext';
import { ToastProvider } from './components/Toast';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import PurchasesPage from './pages/PurchasesPage';
import BillingPage from './pages/BillingPage';
import SecurityPage from './pages/SecurityPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  const isAuthenticated = Boolean(localStorage.getItem('pharmacy_token'));

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <ToastProvider>
      <SummaryProvider>
        <Layout>
          <ErrorBoundary>
            <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="*" element={<DashboardPage />} />
            </Routes>
          </ErrorBoundary>
        </Layout>
      </SummaryProvider>
    </ToastProvider>
  );
}
