import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import {
  ArrowRight,
  BellDot,
  Building2,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package2,
  ShieldCheck,
  Truck,
  Users,
  CircleAlert,
} from 'lucide-react';

const queryClient = new QueryClient();
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/suppliers', label: 'Suppliers', icon: Building2 },
  { to: '/products', label: 'Products', icon: Package2 },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
  { to: '/deliveries', label: 'Deliveries', icon: Truck },
  { to: '/supplier-performance', label: 'Supplier Performance', icon: ShieldCheck },
];

type Supplier = {
  id: string;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  reorder_level?: number | null;
  is_active: boolean;
};

type PurchaseOrder = {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier_name?: string;
  order_date: string;
  expected_delivery_date?: string | null;
  status: string;
  order_total: number;
  notes?: string | null;
  line_items: Array<{
    id: string;
    product_id: string;
    product_name?: string;
    product_sku?: string;
    quantity_ordered: number;
    unit_price: number;
  }>;
};

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contact_person: z.string().optional(),
  email: z.string().email('Use a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  reorder_level: z.coerce.number().min(0).optional(),
  is_active: z.boolean().default(true),
});

const orderSchema = z.object({
  supplier_id: z.string().min(1, 'Select a supplier'),
  order_date: z.string().min(1, 'Order date is required'),
  expected_delivery_date: z.string().optional(),
  notes: z.string().optional(),
  line_items: z.array(
    z.object({
      product_id: z.string().min(1, 'Select a product'),
      quantity_ordered: z.coerce.number().positive('Quantity must be greater than zero'),
      unit_price: z.coerce.number().min(0, 'Price cannot be negative'),
    }),
  ).min(1, 'Add at least one line item'),
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col bg-slate-900 p-5 text-slate-100 md:flex">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold">S</div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Operations</div>
              <div className="text-xl font-semibold">Supplier Manager</div>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl bg-slate-800 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Quick status</div>
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 size={16} />
              System online
            </div>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-7">
          <header className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Supplier & Purchase Order Control</div>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Operations</h1>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" className="rounded-full border border-slate-200 p-2 text-slate-600">
                <BellDot size={18} />
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}

function StatCard({ title, value, accent, icon: Icon }: { title: string; value: string; accent: string; icon: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    ORDERED: 'bg-blue-100 text-blue-700',
    PARTIALLY_RECEIVED: 'bg-amber-100 text-amber-700',
    RECEIVED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-rose-100 text-rose-700',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${palette[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: { email: string; password: string }) => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const response = await api.post('/auth/login', values);
      localStorage.setItem('token', response.data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail ?? 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">S</div>
          <h1 className="text-3xl font-bold text-slate-900">Supplier Portal</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to manage suppliers and purchase orders</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              {...register('email')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none"
              placeholder="admin@supplier.local"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{String(errors.email.message)}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              {...register('password')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none"
              placeholder="••••••••"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{String(errors.password.message)}</p>}
          </div>

          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          Demo access: admin@supplier.local / admin123
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get('/dashboard/summary')).data,
  });
  const { data: overdue = [] } = useQuery({
    queryKey: ['dashboard-overdue'],
    queryFn: async () => (await api.get('/dashboard/overdue')).data,
  });
  const { data: upcoming = [] } = useQuery({
    queryKey: ['dashboard-upcoming'],
    queryFn: async () => (await api.get('/dashboard/upcoming')).data,
  });
  const { data: recentOrders = [] } = useQuery({
    queryKey: ['dashboard-recent'],
    queryFn: async () => (await api.get('/dashboard/recent-orders')).data,
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Active suppliers" value={String(summary?.active_suppliers ?? 0)} accent="bg-sky-600" icon={Users} />
        <StatCard title="Active products" value={String(summary?.active_products ?? 0)} accent="bg-indigo-600" icon={Package2} />
        <StatCard title="Open purchase orders" value={String(summary?.open_purchase_orders ?? 0)} accent="bg-violet-600" icon={ClipboardList} />
        <StatCard title="Overdue orders" value={String(summary?.overdue_orders ?? 0)} accent="bg-rose-600" icon={CircleAlert} />
        <StatCard title="Due in 7 days" value={String(summary?.deliveries_due_in_7_days ?? 0)} accent="bg-amber-500" icon={BellDot} />
        <StatCard title="Partially received" value={String(summary?.partially_received_orders ?? 0)} accent="bg-emerald-600" icon={CheckCircle2} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Overdue deliveries</h2>
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">{overdue.length} orders</span>
          </div>
          <div className="space-y-3">
            {overdue.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No overdue orders at the moment.</div>
            ) : (
              overdue.slice(0, 5).map((order: any) => (
                <div key={order.order_number} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <div>
                    <div className="font-semibold text-slate-900">{order.order_number}</div>
                    <div className="text-sm text-slate-500">{order.supplier}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold text-rose-600">{order.days_overdue} days late</div>
                    <div className="text-slate-500">Due {order.expected_delivery_date}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Upcoming deliveries</h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{upcoming.length} due</span>
          </div>
          <div className="space-y-3">
            {upcoming.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No upcoming deliveries in the next 7 days.</div>
            ) : (
              upcoming.slice(0, 5).map((order: any) => (
                <div key={order.order_number} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <div>
                    <div className="font-semibold text-slate-900">{order.order_number}</div>
                    <div className="text-sm text-slate-500">{order.supplier}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold text-amber-700">{order.expected_delivery_date}</div>
                    <div className="text-slate-500">{order.remaining_quantity} units left</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Recent purchase orders</h2>
          <Link to="/purchase-orders" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600">
            View all <ArrowRight size={16} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-3 pr-4">Order</th>
                <th className="py-3 pr-4">Supplier</th>
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order: any) => (
                <tr key={order.order_number} className="border-t border-slate-200">
                  <td className="py-3 pr-4 font-medium text-slate-900">{order.order_number}</td>
                  <td className="py-3 pr-4">{order.supplier}</td>
                  <td className="py-3 pr-4">{order.order_date}</td>
                  <td className="py-3 pr-4"><StatusBadge status={order.status} /></td>
                  <td className="py-3 pr-4 text-right font-medium">${Number(order.order_total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SuppliersPage() {
  const queryClient = useQueryClient();
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/suppliers')).data,
  });
  const supplierForm = useForm({ resolver: zodResolver(supplierSchema), defaultValues: { is_active: true } });

  const createSupplier = useMutation({
    mutationFn: async (payload: any) => api.post('/suppliers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      supplierForm.reset({ is_active: true });
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Add supplier</h2>
        <form onSubmit={supplierForm.handleSubmit((values) => createSupplier.mutate(values))} className="grid gap-4 md:grid-cols-2">
          <input {...supplierForm.register('name')} placeholder="Supplier name" className="rounded-xl border border-slate-300 px-3 py-2.5" />
          <input {...supplierForm.register('contact_person')} placeholder="Contact person" className="rounded-xl border border-slate-300 px-3 py-2.5" />
          <input {...supplierForm.register('email')} placeholder="Email" className="rounded-xl border border-slate-300 px-3 py-2.5" />
          <input {...supplierForm.register('phone')} placeholder="Phone" className="rounded-xl border border-slate-300 px-3 py-2.5" />
          <textarea {...supplierForm.register('address')} placeholder="Address" className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2.5" rows={3} />
          <textarea {...supplierForm.register('notes')} placeholder="Notes" className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2.5" rows={3} />
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" {...supplierForm.register('is_active')} />
            Active supplier
          </label>
          <button type="submit" className="md:col-span-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white">
            Save supplier
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Supplier list</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Contact</th>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier: Supplier) => (
                <tr key={supplier.id} className="border-t border-slate-200">
                  <td className="py-3 pr-4 font-medium text-slate-900">{supplier.name}</td>
                  <td className="py-3 pr-4">{supplier.contact_person ?? '—'}</td>
                  <td className="py-3 pr-4">{supplier.email ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${supplier.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {supplier.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ProductsPage() {
  const queryClient = useQueryClient();
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data,
  });
  const productForm = useForm({ resolver: zodResolver(productSchema), defaultValues: { is_active: true, reorder_level: 0 } });

  const createProduct = useMutation({
    mutationFn: async (payload: any) => api.post('/products', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      productForm.reset({ is_active: true, reorder_level: 0 });
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Add product</h2>
        <form onSubmit={productForm.handleSubmit((values) => createProduct.mutate(values))} className="grid gap-4 md:grid-cols-2">
          <input {...productForm.register('sku')} placeholder="SKU" className="rounded-xl border border-slate-300 px-3 py-2.5" />
          <input {...productForm.register('name')} placeholder="Product name" className="rounded-xl border border-slate-300 px-3 py-2.5" />
          <input {...productForm.register('unit')} placeholder="Unit (pcs, boxes, kg)" className="rounded-xl border border-slate-300 px-3 py-2.5" />
          <input type="number" {...productForm.register('reorder_level')} placeholder="Reorder level" className="rounded-xl border border-slate-300 px-3 py-2.5" />
          <textarea {...productForm.register('description')} placeholder="Description" className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2.5" rows={3} />
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" {...productForm.register('is_active')} />
            Active product
          </label>
          <button type="submit" className="md:col-span-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white">Save product</button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Product catalog</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-3 pr-4">SKU</th>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Unit</th>
                <th className="py-3 pr-4">Reorder</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product: Product) => (
                <tr key={product.id} className="border-t border-slate-200">
                  <td className="py-3 pr-4 font-medium text-slate-900">{product.sku}</td>
                  <td className="py-3 pr-4">{product.name}</td>
                  <td className="py-3 pr-4">{product.unit}</td>
                  <td className="py-3 pr-4">{product.reorder_level ?? 0}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: async () => (await api.get('/suppliers')).data });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: async () => (await api.get('/products')).data });
  const { data: orders = [] } = useQuery({ queryKey: ['purchase-orders'], queryFn: async () => (await api.get('/purchase-orders')).data });
  const orderForm = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      supplier_id: '',
      order_date: new Date().toISOString().slice(0, 10),
      expected_delivery_date: '',
      notes: '',
      line_items: [{ product_id: '', quantity_ordered: 1, unit_price: 0 }],
    },
  });

  const createOrder = useMutation({
    mutationFn: async (payload: any) => api.post('/purchase-orders', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      orderForm.reset({
        supplier_id: '',
        order_date: new Date().toISOString().slice(0, 10),
        expected_delivery_date: '',
        notes: '',
        line_items: [{ product_id: '', quantity_ordered: 1, unit_price: 0 }],
      });
    },
  });

  const addLineItem = () => {
    const current = orderForm.getValues('line_items');
    orderForm.setValue('line_items', [...current, { product_id: '', quantity_ordered: 1, unit_price: 0 }]);
  };

  const removeLineItem = (index: number) => {
    const items = orderForm.getValues('line_items');
    if (items.length === 1) return;
    orderForm.setValue('line_items', items.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Create purchase order</h2>
        <form onSubmit={orderForm.handleSubmit((values) => createOrder.mutate(values))} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <select {...orderForm.register('supplier_id')} className="rounded-xl border border-slate-300 px-3 py-2.5">
              <option value="">Select supplier</option>
              {suppliers.map((supplier: Supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
            <input type="date" {...orderForm.register('order_date')} className="rounded-xl border border-slate-300 px-3 py-2.5" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input type="date" {...orderForm.register('expected_delivery_date')} className="rounded-xl border border-slate-300 px-3 py-2.5" />
            <input {...orderForm.register('notes')} placeholder="Notes" className="rounded-xl border border-slate-300 px-3 py-2.5" />
          </div>

          <div className="space-y-3">
            {orderForm.watch('line_items')?.map((_: any, index: number) => (
              <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-4">
                <select {...orderForm.register(`line_items.${index}.product_id` as const)} className="rounded-xl border border-slate-300 px-3 py-2.5">
                  <option value="">Select product</option>
                  {products.map((product: Product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
                <input type="number" {...orderForm.register(`line_items.${index}.quantity_ordered` as const)} className="rounded-xl border border-slate-300 px-3 py-2.5" placeholder="Qty" />
                <input type="number" step="0.01" {...orderForm.register(`line_items.${index}.unit_price` as const)} className="rounded-xl border border-slate-300 px-3 py-2.5" placeholder="Unit price" />
                <button type="button" onClick={() => removeLineItem(index)} className="rounded-xl bg-slate-100 px-3 py-2.5 text-slate-700">Remove</button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button type="button" onClick={addLineItem} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">Add line item</button>
            <button type="submit" className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white">Create order</button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Purchase order list</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-3 pr-4">Order</th>
                <th className="py-3 pr-4">Supplier</th>
                <th className="py-3 pr-4">Expected</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: PurchaseOrder) => (
                <tr key={order.id} className="border-t border-slate-200">
                  <td className="py-3 pr-4 font-medium text-slate-900">{order.order_number}</td>
                  <td className="py-3 pr-4">{order.supplier_name ?? order.supplier_id}</td>
                  <td className="py-3 pr-4">{order.expected_delivery_date ?? '—'}</td>
                  <td className="py-3 pr-4"><StatusBadge status={order.status} /></td>
                  <td className="py-3 pr-4 text-right font-medium">${Number(order.order_total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function DeliveriesPage() {
  const queryClient = useQueryClient();
  const { data: orders = [] } = useQuery({ queryKey: ['purchase-orders'], queryFn: async () => (await api.get('/purchase-orders')).data });
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const selectedOrder = orders.find((order: any) => order.id === selectedOrderId) ?? null;
  const deliveryForm = useForm({
    defaultValues: {
      line_item_id: '',
      quantity_received: 1,
      reference_number: '',
      notes: '',
    },
  });

  const createDelivery = useMutation({
    mutationFn: async (payload: any) => api.post(`/purchase-orders/${selectedOrderId}/deliveries`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      deliveryForm.reset({ line_item_id: '', quantity_received: 1, reference_number: '', notes: '' });
    },
  });

  useEffect(() => {
    if (selectedOrder && selectedOrder.line_items.length > 0) {
      deliveryForm.setValue('line_item_id', selectedOrder.line_items[0].id);
    }
  }, [selectedOrder, deliveryForm]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Record delivery</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <select value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5">
            <option value="">Select purchase order</option>
            {orders.map((order: any) => (
              <option key={order.id} value={order.id}>{order.order_number}</option>
            ))}
          </select>
        </div>

        {selectedOrder && (
          <form onSubmit={deliveryForm.handleSubmit((values) => createDelivery.mutate(values))} className="mt-5 space-y-4">
            <select {...deliveryForm.register('line_item_id')} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">
              <option value="">Select line item</option>
              {selectedOrder.line_items.map((line: any) => (
                <option key={line.id} value={line.id}>{line.product_name ?? line.product_id} ({line.quantity_ordered} qty)</option>
              ))}
            </select>
            <div className="grid gap-4 md:grid-cols-2">
              <input type="number" step="0.01" {...deliveryForm.register('quantity_received')} className="rounded-xl border border-slate-300 px-3 py-2.5" placeholder="Quantity received" />
              <input {...deliveryForm.register('reference_number')} className="rounded-xl border border-slate-300 px-3 py-2.5" placeholder="Delivery reference number" />
            </div>
            <textarea {...deliveryForm.register('notes')} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" rows={3} placeholder="Delivery notes" />
            <button type="submit" className="rounded-xl bg-blue-600 px-4 py-3 font-medium text-white">Record delivery</button>
          </form>
        )}
      </section>
    </div>
  );
}

function SupplierPerformancePage() {
  const { data: reports = [] } = useQuery({
    queryKey: ['supplier-performance'],
    queryFn: async () => (await api.get('/reports/supplier-performance')).data,
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-slate-900">Supplier reliability</h2>
      <div className="space-y-3">
        {reports.map((report: any) => (
          <div key={report.supplier_id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
            <div>
              <div className="font-semibold text-slate-900">{report.supplier_name}</div>
              <div className="text-sm text-slate-500">{report.eligible_order_count} eligible orders</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-slate-900">{report.reliability_percentage ?? 'Not enough data'}</div>
              {report.reliability_percentage !== null && <div className="text-xs text-slate-500">{report.on_time_count} on time / {report.late_count} late</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppShell><DashboardPage /></AppShell></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><AppShell><DashboardPage /></AppShell></ProtectedRoute>} />
      <Route path="/suppliers" element={<ProtectedRoute><AppShell><SuppliersPage /></AppShell></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><AppShell><ProductsPage /></AppShell></ProtectedRoute>} />
      <Route path="/purchase-orders" element={<ProtectedRoute><AppShell><PurchaseOrdersPage /></AppShell></ProtectedRoute>} />
      <Route path="/deliveries" element={<ProtectedRoute><AppShell><DeliveriesPage /></AppShell></ProtectedRoute>} />
      <Route path="/supplier-performance" element={<ProtectedRoute><AppShell><SupplierPerformancePage /></AppShell></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
