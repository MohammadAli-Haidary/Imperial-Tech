import { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { authService } from './services/authService';
import { seedDatabase } from './db/database';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import PurchasesPage from './pages/PurchasesPage';
import PartiesPage from './pages/PartiesPage';
import InventoryPage from './pages/InventoryPage';
import PaymentsPage from './pages/PaymentsPage';
import ReportsPage from './pages/ReportsPage';
import WarrantyPage from './pages/WarrantyPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const { isAuthenticated, needsSetup, setNeedsSetup, currentPage, darkMode } = useAppStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await seedDatabase();
        const hasAdmin = await authService.hasAdmin();
        if (!hasAdmin) {
          setNeedsSetup(true);
        }
      } catch (err) {
        console.error('Init error:', err);
      }
      setInitialized(true);
    }
    init();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !needsSetup) {
    return <AuthPage />;
  }

  if (needsSetup) {
    return <AuthPage />;
  }

  function renderPage() {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'products': return <ProductsPage />;
      case 'sales': return <SalesPage />;
      case 'purchases': return <PurchasesPage />;
      case 'parties': return <PartiesPage />;
      case 'inventory': return <InventoryPage />;
      case 'payments': return <PaymentsPage />;
      case 'expenses': return <PaymentsPage />;
      case 'reports': return <ReportsPage />;
      case 'warranty': return <WarrantyPage />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  }

  return (
    <Layout>
      {renderPage()}
    </Layout>
  );
}

export default App;
