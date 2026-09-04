import React, { useState } from "react";
import { toast } from "sonner";
import {
  Package,
  Boxes,
  Truck,
  ArrowLeftRight,
  ShieldAlert,
  Plus,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Layers,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface StockBatchItem {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  reorderLevel: number;
  unitPrice: number;
  costPrice: number;
  warehouse: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  orderDate: string;
  itemsCount: number;
  totalAmount: number;
  status: "draft" | "submitted" | "approved" | "received" | "cancelled";
  expectedDelivery: string;
}

interface StockTransfer {
  id: string;
  voucherNo: string;
  fromLocation: string;
  toLocation: string;
  item: string;
  quantity: number;
  date: string;
  transferredBy: string;
}

const DEFAULT_BATCHES: StockBatchItem[] = [
  { id: "1", itemCode: "MED-001", itemName: "Amoxicillin 500mg Caps", category: "Antibiotics", batchNo: "BATCH-2026-A1", expiryDate: "2027-08-31", quantity: 450, reorderLevel: 200, unitPrice: 15.0, costPrice: 9.0, warehouse: "Main Pharmacy Store" },
  { id: "2", itemCode: "MED-002", itemName: "Paracetamol 500mg Tabs", category: "Analgesics", batchNo: "BATCH-2026-P4", expiryDate: "2028-02-15", quantity: 180, reorderLevel: 250, unitPrice: 3.0, costPrice: 1.2, warehouse: "OPD Sub-Store" },
  { id: "3", itemCode: "MED-003", itemName: "Ceftriaxone 1g Injectable", category: "Injectables", batchNo: "BATCH-2026-C9", expiryDate: "2026-10-30", quantity: 45, reorderLevel: 100, unitPrice: 45.0, costPrice: 28.0, warehouse: "IPD Pharmacy Ward" },
  { id: "4", itemCode: "MED-004", itemName: "Insulin Glargine 100IU/mL", category: "Endocrine", batchNo: "BATCH-2026-IN7", expiryDate: "2027-01-20", quantity: 28, reorderLevel: 40, unitPrice: 180.0, costPrice: 120.0, warehouse: "Cold Chain Refrigerator" },
  { id: "5", itemCode: "MED-005", itemName: "IV Normal Saline 0.9% 500ml", category: "IV Fluids", batchNo: "BATCH-2026-NS2", expiryDate: "2028-11-30", quantity: 320, reorderLevel: 150, unitPrice: 25.0, costPrice: 14.0, warehouse: "Central Store" },
];

const DEFAULT_POS: PurchaseOrder[] = [
  { id: "po-1", poNumber: "PO-2026-0891", supplier: "PharmaMed Zambia Ltd", orderDate: "2026-08-25", itemsCount: 6, totalAmount: 48500.0, status: "approved", expectedDelivery: "2026-09-05" },
  { id: "po-2", poNumber: "PO-2026-0892", supplier: "Universal Diagnostics Supply", orderDate: "2026-08-28", itemsCount: 3, totalAmount: 14200.0, status: "submitted", expectedDelivery: "2026-09-08" },
  { id: "po-3", poNumber: "PO-2026-0893", supplier: "Crown Healthcare Equipments", orderDate: "2026-09-01", itemsCount: 1, totalAmount: 85000.0, status: "draft", expectedDelivery: "2026-09-15" },
];

const DEFAULT_TRANSFERS: StockTransfer[] = [
  { id: "st-1", voucherNo: "STV-2026-104", fromLocation: "Central Store", toLocation: "OPD Pharmacy", item: "Paracetamol 500mg (500 tabs)", quantity: 500, date: "2026-08-30", transferredBy: "Store Manager" },
  { id: "st-2", voucherNo: "STV-2026-105", fromLocation: "Main Pharmacy", toLocation: "Emergency Trauma Unit", item: "IV Normal Saline 500ml", quantity: 60, date: "2026-09-01", transferredBy: "Chief Pharmacist" },
];

export const ERPPharmacyInventory: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<"stock" | "po" | "transfers" | "reorder">("stock");
  const [batches, setBatches] = useState<StockBatchItem[]>(DEFAULT_BATCHES);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(DEFAULT_POS);
  const [transfers, setTransfers] = useState<StockTransfer[]>(DEFAULT_TRANSFERS);
  const [searchQuery, setSearchQuery] = useState("");

  // New PO Modal state
  const [showPOModal, setShowPOModal] = useState(false);
  const [newPOSupplier, setNewPOSupplier] = useState("PharmaMed Zambia Ltd");
  const [newPOAmount, setNewPOAmount] = useState(15000);
  const [newPOExpected, setNewPOExpected] = useState("2026-09-12");

  // New Transfer Modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFrom, setTransferFrom] = useState("Central Store");
  const [transferTo, setTransferTo] = useState("OPD Sub-Store");
  const [transferItem, setTransferItem] = useState("Amoxicillin 500mg Caps");
  const [transferQty, setTransferQty] = useState(100);

  // Filtered Stock
  const filteredBatches = batches.filter((b) =>
    b.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.warehouse.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Items needing reorder
  const lowStockItems = batches.filter((b) => b.quantity <= b.reorderLevel);

  const handleCreatePO = () => {
    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier: newPOSupplier,
      orderDate: new Date().toISOString().split("T")[0],
      itemsCount: 4,
      totalAmount: newPOAmount,
      status: "submitted",
      expectedDelivery: newPOExpected,
    };
    setPurchaseOrders([newPO, ...purchaseOrders]);
    toast.success(`Purchase Order ${newPO.poNumber} created and submitted for approval`);
    setShowPOModal(false);
  };

  const handleCreateTransfer = () => {
    const newST: StockTransfer = {
      id: `st-${Date.now()}`,
      voucherNo: `STV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      fromLocation: transferFrom,
      toLocation: transferTo,
      item: transferItem,
      quantity: transferQty,
      date: new Date().toISOString().split("T")[0],
      transferredBy: "Inventory Clerk",
    };
    setTransfers([newST, ...transfers]);
    toast.success(`Stock Transfer Voucher ${newST.voucherNo} issued`);
    setShowTransferModal(false);
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0073ea] via-[#0f172a] to-[#1e293b] text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <Boxes className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">ERP Stock &amp; Buying Procurement Hub</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                ERPNext Compatible
              </span>
            </div>
            <p className="text-xs text-blue-100 font-medium">
              Medicine batch management, expiration monitoring, automated reordering, stock vouchers &amp; purchase workflows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lowStockItems.length > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xs animate-pulse">
              <AlertTriangle className="h-4 w-4" /> {lowStockItems.length} Low Stock Alerts
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e6e9ef] dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: "stock", label: "Medicine Batches & Stock Ledger", icon: Package },
          { id: "po", label: "Purchase Orders & Procurement", icon: Truck },
          { id: "transfers", label: "Department Stock Transfers", icon: ArrowLeftRight },
          { id: "reorder", label: "Auto-Reordering Queue", icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
                activeTab === tab.id
                  ? "bg-[#0073ea] text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#f0f2f7]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Stock Batches & Ledger */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by drug name, batch #, warehouse, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:border-[#0073ea]"
              />
            </div>
            <button
              onClick={() => toast.success("Stock valuation report generated")}
              className="px-4 py-2 rounded-xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-[#f0f2f7]"
            >
              Export Stock Valuation (Excel)
            </button>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 text-[11px] font-extrabold uppercase text-[#676879]">
                  <th className="py-3 px-4">Item &amp; Code</th>
                  <th className="py-3 px-3">Batch Number</th>
                  <th className="py-3 px-3">Expiry Date</th>
                  <th className="py-3 px-3">Warehouse / Store</th>
                  <th className="py-3 px-3 text-right">Available Stock</th>
                  <th className="py-3 px-3 text-right">Unit / Cost Price</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800">
                {filteredBatches.map((b) => {
                  const isLow = b.quantity <= b.reorderLevel;
                  return (
                    <tr key={b.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100">{b.itemName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{b.itemCode} • {b.category}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#0073ea]">{b.batchNo}</td>
                      <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-300">{b.expiryDate}</td>
                      <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">{b.warehouse}</td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-slate-100">
                        {b.quantity} units
                        <div className="text-[10px] text-slate-400 font-normal">Reorder at: {b.reorderLevel}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        <div className="font-bold text-slate-900 dark:text-slate-100">K{b.unitPrice.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-400">Cost: K{b.costPrice.toFixed(2)}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isLow ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                            ⚠ Low Stock
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                            ✓ In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Purchase Orders */}
      {activeTab === "po" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Purchase Orders &amp; Procurement Pipeline</h3>
              <p className="text-xs text-[#676879] dark:text-slate-400">Manage supplier quotes, PO approval, and Goods Receipt Notes (GRN)</p>
            </div>

            <Dialog open={showPOModal} onOpenChange={setShowPOModal}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 rounded-xl bg-[#0073ea] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                  <Plus className="h-4 w-4" /> Raise Purchase Order
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
                <DialogHeader>
                  <DialogTitle className="font-black text-lg">Raise ERP Purchase Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <label className="font-bold">Supplier *</label>
                    <select
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-bold bg-white dark:bg-slate-950"
                      value={newPOSupplier}
                      onChange={(e) => setNewPOSupplier(e.target.value)}
                    >
                      <option value="PharmaMed Zambia Ltd">PharmaMed Zambia Ltd</option>
                      <option value="Universal Diagnostics Supply">Universal Diagnostics Supply</option>
                      <option value="Crown Healthcare Equipments">Crown Healthcare Equipments</option>
                      <option value="Mediland Africa Wholesalers">Mediland Africa Wholesalers</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold">Estimated Order Total (ZMW) *</label>
                    <input
                      type="number"
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-bold"
                      value={newPOAmount}
                      onChange={(e) => setNewPOAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="font-bold">Expected Delivery Date *</label>
                    <input
                      type="date"
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
                      value={newPOExpected}
                      onChange={(e) => setNewPOExpected(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button onClick={() => setShowPOModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                  <button onClick={handleCreatePO} className="px-5 py-2.5 rounded-xl bg-[#0073ea] text-white font-extrabold">Create PO</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 text-[11px] font-extrabold uppercase text-[#676879]">
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-3">Supplier Name</th>
                  <th className="py-3 px-3">Order Date</th>
                  <th className="py-3 px-3">Expected Delivery</th>
                  <th className="py-3 px-3 text-right">Total Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60">
                    <td className="py-3 px-4 font-black font-mono text-[#0073ea]">{po.poNumber}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{po.supplier}</td>
                    <td className="py-3 px-3 text-slate-600">{po.orderDate}</td>
                    <td className="py-3 px-3 text-slate-600">{po.expectedDelivery}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-slate-100">
                      K{po.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          po.status === "approved"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : po.status === "submitted"
                            ? "bg-blue-100 text-[#0073ea] dark:bg-blue-950"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800"
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => toast.success(`Goods Receipt Note (GRN) created for ${po.poNumber}`)}
                        className="px-3 py-1 rounded-lg bg-[#f0f4ff] hover:bg-[#0073ea] hover:text-white text-[#0073ea] font-extrabold text-[11px] transition-colors"
                      >
                        Create GRN
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Department Stock Transfers */}
      {activeTab === "transfers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Department Stock Movement Vouchers</h3>
              <p className="text-xs text-[#676879] dark:text-slate-400">Transfer medicines between Central Pharmacy, OPD, IPD, OT, and Lab</p>
            </div>

            <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 rounded-xl bg-[#0073ea] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                  <Plus className="h-4 w-4" /> Issue Transfer Voucher
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
                <DialogHeader>
                  <DialogTitle className="font-black text-lg">New Stock Transfer Voucher</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold">Source Warehouse *</label>
                      <select
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-bold"
                        value={transferFrom}
                        onChange={(e) => setTransferFrom(e.target.value)}
                      >
                        <option value="Central Store">Central Store</option>
                        <option value="Main Pharmacy Store">Main Pharmacy Store</option>
                        <option value="Cold Chain Refrigerator">Cold Chain Refrigerator</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold">Destination Unit *</label>
                      <select
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-bold"
                        value={transferTo}
                        onChange={(e) => setTransferTo(e.target.value)}
                      >
                        <option value="OPD Sub-Store">OPD Sub-Store</option>
                        <option value="IPD Pharmacy Ward">IPD Pharmacy Ward</option>
                        <option value="Emergency Trauma Unit">Emergency Trauma Unit</option>
                        <option value="Operating Theatre (OT)">Operating Theatre (OT)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="font-bold">Item Description *</label>
                    <input
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-bold"
                      value={transferItem}
                      onChange={(e) => setTransferItem(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="font-bold">Quantity *</label>
                    <input
                      type="number"
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-black"
                      value={transferQty}
                      onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button onClick={() => setShowTransferModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                  <button onClick={handleCreateTransfer} className="px-5 py-2.5 rounded-xl bg-[#0073ea] text-white font-extrabold">Issue Voucher</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 text-[11px] font-extrabold uppercase text-[#676879]">
                  <th className="py-3 px-4">Voucher No</th>
                  <th className="py-3 px-3">From Location</th>
                  <th className="py-3 px-3">To Destination</th>
                  <th className="py-3 px-3">Transferred Item</th>
                  <th className="py-3 px-3 text-right">Quantity</th>
                  <th className="py-3 px-3">Issued By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60">
                    <td className="py-3 px-4 font-mono font-bold text-[#0073ea]">{t.voucherNo}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">{t.fromLocation}</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">{t.toLocation}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{t.item}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-slate-100">{t.quantity}</td>
                    <td className="py-3 px-3 text-slate-500">{t.transferredBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Auto-Reorder Queue */}
      {activeTab === "reorder" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Automated Reorder Recommendations</h3>
              <p className="text-xs text-[#676879] dark:text-slate-400">Items that have breached the minimum safety buffer</p>
            </div>
            <button
              onClick={() => toast.success("Batch PO generated for all low stock items")}
              className="px-4 py-2 rounded-xl bg-[#0073ea] text-white font-extrabold text-xs shadow-xs"
            >
              Generate Batch PO for All ({lowStockItems.length})
            </button>
          </div>

          <div className="space-y-3">
            {lowStockItems.map((item) => {
              const shortfall = item.reorderLevel - item.quantity;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-amber-300 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{item.itemName}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-mono text-[10px] font-black">
                        {item.batchNo}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Current: <span className="font-bold text-rose-600">{item.quantity} units</span> • Reorder Threshold: {item.reorderLevel} units • Shortfall: +{shortfall} units
                    </div>
                  </div>

                  <button
                    onClick={() => toast.success(`PO Draft generated for ${item.itemName} (+${shortfall * 2} units)`)}
                    className="px-4 py-2 rounded-xl bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs shrink-0"
                  >
                    Quick Reorder (+{shortfall * 2})
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ERPPharmacyInventory;
