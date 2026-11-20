import { DashboardLayout } from '../components/layout/DashboardLayout';
import ProductsTabs from '@/components/products/ProductsTabs';
import ProductsCatalog from '@/components/products/ProductsCatalog';

export default function Products() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ProductsTabs />
        <ProductsCatalog mode="hub" />
      </div>
    </DashboardLayout>
  );
}