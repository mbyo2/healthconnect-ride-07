
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
  Building,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const supplierFormSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contact_person: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  institution_id: z.string().uuid("Invalid institution ID"),
});

export const SupplierManagement = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: institutions, isLoading: loadingInstitutions } = useQuery({
    queryKey: ["healthcare_institutions_for_suppliers"],
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

  const { data: suppliers, isLoading: loadingSuppliers, refetch: refetchSuppliers } = useQuery({
    queryKey: ["suppliers", selectedInstitution, searchTerm],
    queryFn: async () => {
      if (!selectedInstitution) return [];
      
      let query = supabase
        .from("suppliers")
        .select("*")
        .eq("institution_id", selectedInstitution);
        
      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }
      
      const { data, error } = await query;

      if (error) {
        throw new Error(`Error fetching suppliers: ${error.message}`);
      }
      
      return data;
    },
    enabled: !!selectedInstitution
  });
  
  const addForm = useForm<z.infer<typeof supplierFormSchema>>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      institution_id: "",
    }
  });
  
  const editForm = useForm<z.infer<typeof supplierFormSchema>>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      institution_id: "",
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
    if (selectedSupplier) {
      editForm.reset({
        ...selectedSupplier,
        contact_person: selectedSupplier.contact_person || "",
        email: selectedSupplier.email || "",
        phone: selectedSupplier.phone || "",
        address: selectedSupplier.address || "",
      });
    }
  }, [selectedSupplier, editForm]);

  const handleAddSupplier = async (values: z.infer<typeof supplierFormSchema>) => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert(values)
        .select();
      
      if (error) throw error;
      
      toast.success("Supplier added successfully");
      setIsAddDialogOpen(false);
      addForm.reset();
      refetchSuppliers();
    } catch (error: any) {
      toast.error(`Error adding supplier: ${error.message}`);
    }
  };
  
  const handleEditSupplier = async (values: z.infer<typeof supplierFormSchema>) => {
    try {
      const { error } = await supabase
        .from("suppliers")
        .update(values)
        .eq("id", selectedSupplier.id);
      
      if (error) throw error;
      
      toast.success("Supplier updated successfully");
      setIsEditDialogOpen(false);
      setSelectedSupplier(null);
      refetchSuppliers();
    } catch (error: any) {
      toast.error(`Error updating supplier: ${error.message}`);
    }
  };
  
  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    
    try {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Supplier deleted successfully");
      refetchSuppliers();
    } catch (error: any) {
      toast.error(`Error deleting supplier: ${error.message}`);
    }
  };

  const columns = [
    { header: "Name", accessorKey: "name" },
    { 
      header: "Contact Person", 
      accessorKey: "contact_person",
      cell: ({ row }: any) => row.original.contact_person || "-"
    },
    { 
      header: "Contact", 
      cell: ({ row }: any) => (
        <div className="space-y-1">
          {row.original.phone && (
            <div className="flex items-center text-sm">
              <Phone className="h-3 w-3 mr-1" />
              <span>{row.original.phone}</span>
            </div>
          )}
          {row.original.email && (
            <div className="flex items-center text-sm">
              <Mail className="h-3 w-3 mr-1" />
              <span>{row.original.email}</span>
            </div>
          )}
          {!row.original.phone && !row.original.email && "-"}
        </div>
      )
    },
    { 
      header: "Address", 
      accessorKey: "address",
      cell: ({ row }: any) => row.original.address || "-"
    },
    {
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedSupplier(row.original);
              setIsEditDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteSupplier(row.original.id)}
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
        <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
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
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-[300px]"
          />
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(handleAddSupplier)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Supplier name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact person name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Email address" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={addForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Full address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit">Add Supplier</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Supplier</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSupplier)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Supplier name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact person name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Email address" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Full address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {selectedInstitution && (
        loadingSuppliers ? <LoadingScreen /> : 
          <DataTable
            columns={columns}
            data={suppliers || []}
          />
      )}
    </div>
  );
};
