import React, { useEffect, useState } from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { supabase } from '@/integrations/supabase/client';
import {
  Package, Pill, ShoppingCart, FileText, Truck, Settings,
  BarChart3, Users, Shield, AlertTriangle, Wallet, ClipboardList,
  Megaphone, CreditCard, BookOpen, ChevronRight, ScanLine
} from 'lucide-react';

interface ActionItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
}

interface ActionGroup {
  title: string;
  primary: ActionItem;
  secondary: ActionItem[];
}

export const PharmacistWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { isInstitutionAffiliated, institutionId } = useInstitutionAffiliation();
  const [pendingRx, setPendingRx] = useState<number | null>(null);
  const [lowStock, setLowStock] = useState<number | null>(null);
  const [todayDispenses, setTodayDispenses] = useState<number | null>(null);

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  useEffect(() => {
    const loadGlance = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Pending prescriptions
        let rxQuery = supabase
          .from('comprehensive_prescriptions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (institutionId) rxQuery = rxQuery.eq('pharmacy_id', institutionId);
        const { count: rx } = await rxQuery;
        setPendingRx(rx ?? 0);

        // Low stock alerts (quantity at or below reorder level)
        if (institutionId) {
          const { data: items } = await supabase
            .from('drug_stock_items')
            .select('quantity, reorder_level')
            .eq('institution_id', institutionId)
            .limit(500);
          const low = (items ?? []).filter(
            (i) => Number(i.quantity) <= Number(i.reorder_level)
          ).length;
          setLowStock(low);
        } else {
          setLowStock(0);
        }

        // Today's dispenses
        let dispQuery = supabase
          .from('drug_stock_movements')
          .select('id', { count: 'exact', head: true })
          .eq('movement_type', 'issued')
          .gte('created_at', startOfDay.toISOString());
        if (institutionId) dispQuery = dispQuery.eq('institution_id', institutionId);
        const { count: disp } = await dispQuery;
        setTodayDispenses(disp ?? 0);
      } catch {
        setPendingRx(0);
        setLowStock(0);
        setTodayDispenses(0);
      }
    };
    loadGlance();
  }, [institutionId]);

  const icon = (Icon: React.ElementType) => <Icon className="h-5 w-5" />;

  const groups: ActionGroup[] = [
    {
      title: 'Dispensing',
      primary: { title: 'Dispense Prescriptions', description: 'Process Rx with allergy & interaction checks', icon: icon(FileText), route: '/prescriptions' },
      secondary: [
        { title: 'Verify Medication', description: 'Scan-to-verify barcode check before dispensing', icon: icon(ScanLine), route: '/pharmacy-verify' },
        { title: 'Drug Interaction Checker', description: 'Real-time interaction & contraindication alerts', icon: icon(Shield), route: '/prescriptions' },
        { title: 'Controlled Substances', description: 'Schedule tracking & compliance logs', icon: icon(ClipboardList), route: '/pharmacy-inventory' },
        { title: 'Insurance Verification', description: 'Verify patient insurance for Rx', icon: icon(CreditCard), route: '/prescriptions' },
        { title: 'Medication Guide', description: 'Drug information & patient counseling', icon: icon(BookOpen), route: '/medications' },
      ],
    },
    {
      title: 'Inventory & Safety',
      primary: { title: 'Inventory Management', description: 'Stock, expiry tracking & reorder alerts', icon: icon(Pill), route: '/pharmacy-inventory' },
      secondary: [
        { title: 'Near-Expiry Alerts', description: 'Medications approaching expiration', icon: icon(AlertTriangle), route: '/pharmacy-inventory' },
        { title: 'Pharmacy Portal', description: 'Overview & daily operations', icon: icon(Package), route: '/pharmacy-portal' },
      ],
    },
    {
      title: 'Business',
      primary: { title: 'Marketplace', description: 'Product listings & online sales', icon: icon(ShoppingCart), route: '/marketplace' },
      secondary: [
        { title: 'Orders & Delivery', description: 'Track orders & delivery zones', icon: icon(Truck), route: '/pharmacy-management' },
        { title: 'Customer Records', description: 'Patient medication history', icon: icon(Users), route: '/connections' },
        { title: 'Sales Analytics', description: 'Revenue, top sellers & trends', icon: icon(BarChart3), route: '/pharmacy-portal' },
        { title: 'Promote Pharmacy', description: 'Sponsored listings & visibility', icon: icon(Megaphone), route: '/pharmacy-portal' },
      ],
    },
    {
      title: 'Account',
      primary: isInstitutionAffiliated
        ? { title: 'Settings', description: 'Pharmacy preferences & profile', icon: icon(Settings), route: '/settings' }
        : { title: 'Earnings & Wallet', description: 'Revenue & payment management', icon: icon(Wallet), route: '/wallet' },
      secondary: isInstitutionAffiliated
        ? []
        : [{ title: 'Settings', description: 'Pharmacy preferences & profile', icon: icon(Settings), route: '/settings' }],
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-md">
          <Pill className="h-7 w-7" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Pharmacist Clinical Workspace</p>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">Pharmacy Dashboard</h1>
        </div>
      </div>

      {/* Today at a Glance */}
      <section>
        <h2 className="mb-4 text-[18px] font-semibold text-slate-900 dark:text-white">Today at a glance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            onClick={() => handleNavigation('/prescriptions', 'Pending Prescriptions')}
            className="rounded-2xl bg-primary-500 p-5 text-left text-white shadow-sm transition-all hover:bg-primary-600 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 opacity-80" />
              <ChevronRight className="h-4 w-4 opacity-60" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none">{pendingRx ?? '–'}</p>
            <p className="mt-1 text-[15px] font-medium">Pending prescriptions</p>
            <p className="text-[13px] opacity-80">Awaiting dispensing</p>
          </button>

          <button
            onClick={() => handleNavigation('/pharmacy-inventory', 'Low Stock Alerts')}
            className="rounded-2xl border border-canvas-silk bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-slate-900 dark:text-white">{lowStock ?? '–'}</p>
            <p className="mt-1 text-[15px] font-medium text-slate-900 dark:text-white">Low stock alerts</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">At or below reorder level</p>
          </button>

          <button
            onClick={() => handleNavigation('/pharmacy-inventory', "Today's Dispenses")}
            className="rounded-2xl border border-canvas-silk bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <Package className="h-5 w-5 text-emerald-500" />
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-slate-900 dark:text-white">{todayDispenses ?? '–'}</p>
            <p className="mt-1 text-[15px] font-medium text-slate-900 dark:text-white">Dispensed today</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Items issued from stock</p>
          </button>
        </div>
      </section>

      {/* Grouped Actions */}
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="mb-4 text-[18px] font-semibold text-slate-900 dark:text-white">{group.title}</h2>
          <div className="rounded-2xl border border-canvas-silk bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Primary action */}
            <button
              onClick={() => handleNavigation(group.primary.route, group.primary.title)}
              className="flex w-full items-center gap-4 border-b border-canvas-silk p-5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800/50"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white">
                {group.primary.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-slate-900 dark:text-white">{group.primary.title}</p>
                <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{group.primary.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
            {/* Secondary actions */}
            {group.secondary.length > 0 && (
              <div className="divide-y divide-canvas-silk dark:divide-slate-800">
                {group.secondary.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => handleNavigation(item.route, item.title)}
                    className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-slate-900 dark:text-white">{item.title}</p>
                      <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{item.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
};
