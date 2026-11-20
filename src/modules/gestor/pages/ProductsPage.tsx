import ProductsCatalog from '@/components/products/ProductsCatalog';
import { useGestorAccess } from '../hooks/useGestorAccess';

export default function ProductsPage() {
  const { can } = useGestorAccess();
  return (
    <ProductsCatalog
      mode="gestor"
      perms={{
        create: can('produtos', 'criar'),
        edit: can('produtos', 'editar'),
        remove: can('produtos', 'excluir'),
        stock: can('estoque', 'editar'),
        importar: can('produtos', 'criar'),
      }}
    />
  );
}