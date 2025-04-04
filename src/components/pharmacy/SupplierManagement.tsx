
import * as React from 'react';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertCircle,
  Plus,
  Search,
  Edit,
  Trash2,
  BuildingStorefront
} from 'lucide-react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/context/AuthContext';

interface Supplier {
  id: string;
  institution_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
}

export const SupplierManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: ''
  });

  // Get institution id for the current user
  const { data: userInstitution, isLoading: loadingInstitution } = useQuery({
    queryKey: ['userInstitution', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('institution_staff')
        .select('institution_id')
        .eq('provider_id', user.id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching institution:', error);
        return null;
      }
      
      return data?.institution_id;
    },
  });

  // Fetch suppliers
  const { data: suppliers, isLoading: loadingSuppliers, refetch } = useQuery({
    queryKey: ['suppliers', userInstitution],
    queryFn: async () => {
      if (!userInstitution) return [];
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('institution_id', userInstitution)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching suppliers:', error);
        throw new Error(error.message);
      }
      
      return data as Supplier[];
    },
    enabled: !!userInstitution,
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userInstitution) {
      toast.error("No institution found for user");
      return;
    }
    
    try {
      if (editingSupplier) {
        // Update existing supplier
        const { error } = await supabase
          .from('suppliers')
          .update({
            name: formData.name,
            contact_person: formData.contact_person || null,
            email: formData.email || null,
            phone: formData.phone || null,
            address: formData.address || null
          })
          .eq('id', editingSupplier.id);
          
        if (error) throw error;
        toast.success('Supplier updated successfully');
      } else {
        // Create new supplier
        const { error } = await supabase
          .from('suppliers')
          .insert([{
            institution_id: userInstitution,
            name: formData.name,
            contact_person: formData.contact_person || null,
            email: formData.email || null,
            phone: formData.phone || null,
            address: formData.address || null
          }]);
          
        if (error) throw error;
        toast.success('Supplier added successfully');
      }
      
      // Refresh data and reset form
      await refetch();
      resetForm();
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  // Handle edit supplier
  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
    });
    setIsDialogOpen(true);
  };

  // Handle delete supplier
  const handleDelete = async () => {
    if (!supplierToDelete) return;
    
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: false })
        .eq('id', supplierToDelete);
        
      if (error) throw error;
      
      toast.success('Supplier deactivated successfully');
      refetch();
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const confirmDelete = (id: string) => {
    setSupplierToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // Reset form to default values
  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: ''
    });
    setEditingSupplier(null);
  };

  // Filter suppliers based on search
  const filteredSuppliers = suppliers?.filter(supplier => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(query) ||
      (supplier.contact_person && supplier.contact_person.toLowerCase().includes(query)) ||
      (supplier.email && supplier.email.toLowerCase().includes(query))
    );
  });

  if (loadingInstitution || loadingSuppliers) {
    return <LoadingScreen />;
  }

  if (!userInstitution) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-6 text-center">
            <div>
              <AlertCircle className="mx-auto h-10 w-10 text-orange-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Institution Association</h3>
              <p className="text-muted-foreground mb-4">
                You are not associated with any healthcare institution. 
                Please contact an administrator to associate your account.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search suppliers..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Button 
          className="gap-1"
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Suppliers Management</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSuppliers && filteredSuppliers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.filter(s => s.is_active).map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          {supplier.address && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {supplier.address}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.contact_person || '-'}
                      </TableCell>
                      <TableCell>
                        {supplier.email ? (
                          <a href={`mailto:${supplier.email}`} className="hover:underline text-primary">
                            {supplier.email}
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.phone ? (
                          <a href={`tel:${supplier.phone}`} className="hover:underline text-primary">
                            {supplier.phone}
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(supplier)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDelete(supplier.id)}
                            className="hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-6">
              {searchQuery ? (
                <p className="text-muted-foreground">No suppliers found matching your search.</p>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <BuildingStorefront className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No suppliers added yet.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add/Edit Supplier Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Supplier Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingSupplier ? 'Update' : 'Add'} Supplier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate Supplier</DialogTitle>
          </DialogHeader>
          
          <p className="py-4">
            Are you sure you want to deactivate this supplier? 
            They will no longer appear in your supplier list but will still be associated with historical records.
          </p>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
