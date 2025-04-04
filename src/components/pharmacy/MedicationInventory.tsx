
import * as React from "react";
import { useState } from "react";
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
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle 
} from "lucide-react";

const medicationFormSchema = z.object({
  medication_name: z.string().min(1, "Medication name is required"),
  generic_name: z.string().optional(),
  dosage: z.string().min(1, "Dosage is required"),
  medication_type: z.string().min(1, "Medication type is required"),
  manufacturer: z.string().optional(),
  batch_number: z.string().optional(),
  expiry_date: z.string().min(1, "Expiry date is required"),
  quantity_available: z.number().min(0, "Quantity cannot be negative"),
  minimum_stock_level: z.number().min(0, "Minimum stock level cannot be negative"),
  unit_price: z.number().optional(),
  institution_id: z.string().uuid("Invalid institution ID")
});

export const MedicationInventory = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: institutions, isLoading: loadingInstitutions } = useQuery({
    queryKey: ["healthcare_institutions"],
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

  const { data: inventory, isLoading: loadingInventory, refetch: refetchInventory } = useQuery({
    queryKey: ["medication_inventory", selectedInstitution, searchTerm],
    queryFn: async () => {
      if (!selectedInstitution) return [];
      
      let query = supabase
        .from("medication_inventory")
        .select("*")
        .eq("institution_id", selectedInstitution);
        
      if (searchTerm) {
        query = query.ilike("medication_name", `%${searchTerm}%`);
      }
      
      const { data, error } = await query;

      if (error) {
        throw new Error(`Error fetching inventory: ${error.message}`);
      }
      
      return data;
    },
    enabled: !!selectedInstitution
  });
  
  const addForm = useForm<z.infer<typeof medicationFormSchema>>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: {
      medication_name: "",
      generic_name: "",
      dosage: "",
      medication_type: "",
      manufacturer: "",
      batch_number: "",
      expiry_date: "",
      quantity_available: 0,
      minimum_stock_level: 10,
      unit_price: undefined,
      institution_id: ""
    }
  });
  
  const editForm = useForm<z.infer<typeof medicationFormSchema>>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: {
      medication_name: "",
      generic_name: "",
      dosage: "",
      medication_type: "",
      manufacturer: "",
      batch_number: "",
      expiry_date: "",
      quantity_available: 0,
      minimum_stock_level: 10,
      unit_price: undefined,
      institution_id: ""
    }
  });

  React.useEffect(() => {
    if (institutions && institutions.length > 0 && !selectedInstitution) {
      setSelectedInstitution(institutions[0].id);
    }
  }, [institutions, selectedInstitution]);

  React.useEffect(() => {
    if (selectedInstitution) {
      addForm.setValue("institution_id", selectedInstitution);
    }
  }, [selectedInstitution, addForm]);
  
  React.useEffect(() => {
    if (selectedMedication) {
      editForm.reset({
        ...selectedMedication,
        unit_price: selectedMedication.unit_price || undefined,
        generic_name: selectedMedication.generic_name || "",
        manufacturer: selectedMedication.manufacturer || "",
        batch_number: selectedMedication.batch_number || "",
        expiry_date: selectedMedication.expiry_date,
      });
    }
  }, [selectedMedication, editForm]);

  const handleAddMedication = async (values: z.infer<typeof medicationFormSchema>) => {
    try {
      const { data, error } = await supabase
        .from("medication_inventory")
        .insert({
          ...values,
          unit_price: values.unit_price || null
        })
        .select();
      
      if (error) throw error;
      
      toast.success("Medication added successfully");
      setIsAddDialogOpen(false);
      addForm.reset();
      refetchInventory();
    } catch (error: any) {
      toast.error(`Error adding medication: ${error.message}`);
    }
  };
  
  const handleEditMedication = async (values: z.infer<typeof medicationFormSchema>) => {
    try {
      const { error } = await supabase
        .from("medication_inventory")
        .update({
          ...values,
          unit_price: values.unit_price || null
        })
        .eq("id", selectedMedication.id);
      
      if (error) throw error;
      
      toast.success("Medication updated successfully");
      setIsEditDialogOpen(false);
      setSelectedMedication(null);
      refetchInventory();
    } catch (error: any) {
      toast.error(`Error updating medication: ${error.message}`);
    }
  };
  
  const handleDeleteMedication = async (id: string) => {
    if (!confirm("Are you sure you want to delete this medication?")) return;
    
    try {
      const { error } = await supabase
        .from("medication_inventory")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Medication deleted successfully");
      refetchInventory();
    } catch (error: any) {
      toast.error(`Error deleting medication: ${error.message}`);
    }
  };

  const columns = [
    { header: "Name", accessorKey: "medication_name" },
    { header: "Dosage", accessorKey: "dosage" },
    { header: "Type", accessorKey: "medication_type" },
    { 
      header: "Quantity", 
      accessorKey: "quantity_available",
      cell: ({ row }: any) => {
        const qty = row.original.quantity_available;
        const min = row.original.minimum_stock_level;
        const isLowStock = qty <= min;
        
        return (
          <div className="flex items-center space-x-1">
            {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
            <span className={isLowStock ? "text-destructive font-bold" : ""}>
              {qty}
            </span>
          </div>
        );
      }
    },
    { 
      header: "Expiry Date", 
      accessorKey: "expiry_date",
      cell: ({ row }: any) => {
        const date = new Date(row.original.expiry_date);
        const now = new Date();
        const threeMonths = new Date();
        threeMonths.setMonth(now.getMonth() + 3);
        
        const expiringSoon = date < threeMonths;
        
        return (
          <span className={expiringSoon ? "text-orange-500 font-bold" : ""}>
            {date.toLocaleDateString()}
          </span>
        );
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
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedMedication(row.original);
              setIsEditDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteMedication(row.original.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )
    }
  ];

  if (loadingInstitutions) {
    return <LoadingScreen />;
  }
  
  if (!institutions || institutions.length === 0) {
    return (
      <div className="text-center py-10">
        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
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
          
          <Input
            placeholder="Search medications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-[300px]"
          />
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Medication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Medication</DialogTitle>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(handleAddMedication)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="medication_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medication Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Medication name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="generic_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Generic Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Generic name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="dosage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dosage</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 500mg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="medication_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="tablet">Tablet</SelectItem>
                          <SelectItem value="capsule">Capsule</SelectItem>
                          <SelectItem value="liquid">Liquid</SelectItem>
                          <SelectItem value="injection">Injection</SelectItem>
                          <SelectItem value="cream">Cream</SelectItem>
                          <SelectItem value="ointment">Ointment</SelectItem>
                          <SelectItem value="drops">Drops</SelectItem>
                          <SelectItem value="inhaler">Inhaler</SelectItem>
                          <SelectItem value="powder">Powder</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturer (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Manufacturer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addForm.control}
                    name="batch_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Batch number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={addForm.control}
                  name="expiry_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={addForm.control}
                    name="quantity_available"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addForm.control}
                    name="minimum_stock_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Stock</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addForm.control}
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
                </div>
                
                <DialogFooter>
                  <Button type="submit">Add Medication</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Medication</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditMedication)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="medication_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medication Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Medication name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Same form fields as the add form */}
                <FormField
                  control={editForm.control}
                  name="generic_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Generic Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Generic name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="dosage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dosage</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 500mg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="medication_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="tablet">Tablet</SelectItem>
                          <SelectItem value="capsule">Capsule</SelectItem>
                          <SelectItem value="liquid">Liquid</SelectItem>
                          <SelectItem value="injection">Injection</SelectItem>
                          <SelectItem value="cream">Cream</SelectItem>
                          <SelectItem value="ointment">Ointment</SelectItem>
                          <SelectItem value="drops">Drops</SelectItem>
                          <SelectItem value="inhaler">Inhaler</SelectItem>
                          <SelectItem value="powder">Powder</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturer (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Manufacturer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="batch_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Batch number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="expiry_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="quantity_available"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="minimum_stock_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Stock</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
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
                </div>
                
                <DialogFooter>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {selectedInstitution && (
        loadingInventory ? <LoadingScreen /> : 
          <DataTable
            columns={columns}
            data={inventory || []}
          />
      )}
    </div>
  );
};
