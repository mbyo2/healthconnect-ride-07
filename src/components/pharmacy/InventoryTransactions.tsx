
import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { 
  Receipt,
  ShoppingBasket,
  TrendingUp,
  TrendingDown,
  Plus
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

const transactionFormSchema = z.object({
  medication_inventory_id: z.string().uuid("Please select a medication"),
  transaction_type: z.string().min(1, "Transaction type is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
  supplier: z.string().optional(),
  invoice_number: z.string().optional(),
  unit_price: z.number().optional(),
});

export const InventoryTransactions = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<string>("purchase");
  const [dateRange, setDateRange] = useState({
    from: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  
  const { data: institutions, isLoading: loadingInstitutions } = useQuery({
    queryKey: ["healthcare_institutions_for_transactions"],
    queryFn: async () => {
      // Fetch institutions where the current user is staff
      const { data: staffInstitutions, error } = await supabase
        .from("institution_staff")
        .select(`
          institution_id,
          institution: institution_id (
            id,
            name,
            type
          )
        `)
        .eq("provider_id", (await supabase.auth.getUser()).data.user?.id || "");

      if (error) {
        throw new Error(`Error fetching institutions: ${error.message}`);
      }
      
      return staffInstitutions.map(item => item.institution);
    }
  });

  const { data: medications, isLoading: loadingMedications } = useQuery({
    queryKey: ["medications_for_transactions", selectedInstitution],
    queryFn: async () => {
      if (!selectedInstitution) return [];
      
      const { data, error } = await supabase
        .from("medication_inventory")
        .select("id, medication_name, dosage, quantity_available")
        .eq("institution_id", selectedInstitution);

      if (error) {
        throw new Error(`Error fetching medications: ${error.message}`);
      }
      
      return data;
    },
    enabled: !!selectedInstitution
  });

  const { data: transactions, isLoading: loadingTransactions, refetch: refetchTransactions } = useQuery({
    queryKey: ["inventory_transactions", selectedInstitution, dateRange],
    queryFn: async () => {
      if (!selectedInstitution) return [];
      
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(`
          *,
          medication_inventory!inner (
            id,
            medication_name,
            dosage,
            institution_id
          )
        `)
        .gte("transaction_date", `${dateRange.from}T00:00:00`)
        .lte("transaction_date", `${dateRange.to}T23:59:59`)
        .eq("medication_inventory.institution_id", selectedInstitution)
        .order("transaction_date", { ascending: false });

      if (error) {
        throw new Error(`Error fetching transactions: ${error.message}`);
      }
      
      return data;
    },
    enabled: !!selectedInstitution
  });

  const form = useForm<z.infer<typeof transactionFormSchema>>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      medication_inventory_id: "",
      transaction_type: "purchase",
      quantity: 1,
      notes: "",
      supplier: "",
      invoice_number: "",
      unit_price: undefined
    }
  });

  useEffect(() => {
    if (institutions && institutions.length > 0 && !selectedInstitution) {
      setSelectedInstitution(institutions[0].id);
    }
  }, [institutions, selectedInstitution]);
  
  useEffect(() => {
    setTransactionType(form.watch("transaction_type"));
  }, [form.watch("transaction_type")]);

  const handleAddTransaction = async (values: z.infer<typeof transactionFormSchema>) => {
    try {
      // If it's a sale, make sure there's enough stock
      if (values.transaction_type === "sale" || values.transaction_type === "expired" || values.transaction_type === "damaged") {
        const medication = medications?.find(m => m.id === values.medication_inventory_id);
        if (medication && medication.quantity_available < values.quantity) {
          toast.error(`Not enough stock. Available: ${medication.quantity_available}`);
          return;
        }
      }
      
      const { data, error } = await supabase
        .from("inventory_transactions")
        .insert({
          ...values,
          performed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select();
      
      if (error) throw error;
      
      toast.success(`${values.transaction_type.charAt(0).toUpperCase() + values.transaction_type.slice(1)} transaction recorded successfully`);
      setIsAddDialogOpen(false);
      form.reset({
        medication_inventory_id: "",
        transaction_type: "purchase",
        quantity: 1,
        notes: "",
        supplier: "",
        invoice_number: "",
        unit_price: undefined
      });
      refetchTransactions();
    } catch (error: any) {
      toast.error(`Error recording transaction: ${error.message}`);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return <ShoppingBasket className="h-4 w-4 text-primary" />;
      case "sale":
        return <Receipt className="h-4 w-4 text-orange-500" />;
      case "adjustment":
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case "return":
        return <TrendingDown className="h-4 w-4 text-purple-500" />;
      case "expired":
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case "damaged":
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <ShoppingBasket className="h-4 w-4" />;
    }
  };

  const columns = [
    { 
      header: "Type", 
      accessorKey: "transaction_type",
      cell: ({ row }: any) => {
        const type = row.original.transaction_type;
        return (
          <div className="flex items-center space-x-2">
            {getTransactionIcon(type)}
            <span className="capitalize">{type}</span>
          </div>
        );
      }
    },
    { 
      header: "Medication", 
      accessorKey: "medication_name", 
      cell: ({ row }: any) => {
        return `${row.original.medication_inventory.medication_name} ${row.original.medication_inventory.dosage}`;
      }
    },
    { header: "Quantity", accessorKey: "quantity" },
    { 
      header: "Date", 
      accessorKey: "transaction_date",
      cell: ({ row }: any) => {
        return new Date(row.original.transaction_date).toLocaleString();
      }
    },
    { 
      header: "Price", 
      accessorKey: "unit_price",
      cell: ({ row }: any) => {
        return row.original.unit_price ? 
          `$${parseFloat(row.original.unit_price).toFixed(2)}` : 
          "-";
      }
    },
    { 
      header: "Total", 
      cell: ({ row }: any) => {
        return row.original.unit_price ? 
          `$${(parseFloat(row.original.unit_price) * row.original.quantity).toFixed(2)}` : 
          "-";
      }
    },
    { header: "Notes", accessorKey: "notes" }
  ];

  if (loadingInstitutions) {
    return <LoadingScreen />;
  }
  
  if (!institutions || institutions.length === 0) {
    return (
      <div className="text-center py-10">
        <ShoppingBasket className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No Pharmacy Access</h3>
        <p className="text-muted-foreground mt-2">
          You don't have access to any pharmacy or hospital inventory systems.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          <Select value={selectedInstitution || ''} onValueChange={setSelectedInstitution}>
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder="Select institution" />
            </SelectTrigger>
            <SelectContent>
              {institutions.map((institution: any) => (
                <SelectItem key={institution.id} value={institution.id}>
                  {institution.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2">
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
              className="w-full md:w-auto"
            />
            <span>to</span>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
              className="w-full md:w-auto"
            />
          </div>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record New Transaction</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddTransaction)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="transaction_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="purchase">Purchase</SelectItem>
                          <SelectItem value="sale">Sale</SelectItem>
                          <SelectItem value="adjustment">Adjustment</SelectItem>
                          <SelectItem value="return">Return</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="medication_inventory_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medication</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select medication" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingMedications ? (
                            <SelectItem value="" disabled>Loading...</SelectItem>
                          ) : (
                            medications?.map(med => (
                              <SelectItem key={med.id} value={med.id}>
                                {med.medication_name} {med.dosage} (Stock: {med.quantity_available})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {(transactionType === "purchase" || transactionType === "sale" || transactionType === "return") && (
                  <FormField
                    control={form.control}
                    name="unit_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            placeholder="0.00"
                            {...field}
                            value={field.value === undefined ? "" : field.value}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {(transactionType === "purchase" || transactionType === "return") && (
                  <>
                    <FormField
                      control={form.control}
                      name="supplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier</FormLabel>
                          <FormControl>
                            <Input placeholder="Supplier name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="invoice_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Invoice number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit">Record Transaction</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {selectedInstitution && (
        loadingTransactions ? <LoadingScreen /> : 
          <DataTable
            columns={columns}
            data={transactions || []}
            searchColumn="medication_inventory.medication_name"
          />
      )}
    </div>
  );
};
