
import * as React from 'react';
import { useState, useEffect } from 'react';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertCircle, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  FileWarning,
  Calendar
} from 'lucide-react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

interface MedicationInventoryItem {
  id: string;
  medication_name: string;
  generic_name: string | null;
  dosage: string;
  medication_type: string;
  manufacturer: string | null;
  batch_number: string | null;
  expiry_date: string;
  quantity_available: number;
  minimum_stock_level: number;
  unit_price: number | null;
  institution_id: string;
}

const MEDICATION_TYPES = [
  'tablet', 'capsule', 'liquid', 'injection', 'cream', 
  'ointment', 'drops', 'inhaler', 'powder', 'other'
];

export const MedicationInventory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<MedicationInventoryItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    medication_name: '',
    generic_name: '',
    dosage: '',
    medication_type: 'tablet',
    manufacturer: '',
    batch_number: '',
    expiry_date: format(new Date(), 'yyyy-MM-dd'),
    quantity_available: 0,
    minimum_stock_level: 10,
    unit_price: ''
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

  // Fetch medication inventory
  const { data: inventory, isLoading: loadingInventory, refetch } = useQuery({
    queryKey: ['medicationInventory', userInstitution],
    queryFn: async () => {
      if (!userInstitution) return [];
      
      const { data, error } = await supabase
        .from('medication_inventory')
        .select('*')
        .eq('institution_id', userInstitution)
        .order('medication_name', { ascending: true });

      if (error) {
        console.error('Error fetching medication inventory:', error);
        throw new Error(error.message);
      }
      
      return data as MedicationInventoryItem[];
    },
    enabled: !!userInstitution,
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'quantity_available' || name === 'minimum_stock_level' 
        ? parseInt(value) || 0 
        : value
    });
  };

  // Handle dropdown changes
  const handleSelectChange = (name: string, value: string) => {
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
      const dataToSubmit = {
        ...formData,
        institution_id: userInstitution,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null
      };
      
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('medication_inventory')
          .update(dataToSubmit)
          .eq('id', editingItem.id);
          
        if (error) throw error;
        toast.success('Medication updated successfully');
      } else {
        // Create new item
        const { error } = await supabase
          .from('medication_inventory')
          .insert([dataToSubmit]);
          
        if (error) throw error;
        toast.success('Medication added to inventory');
      }
      
      // Refresh data and reset form
      await refetch();
      resetForm();
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  // Handle edit item
  const handleEdit = (item: MedicationInventoryItem) => {
    setEditingItem(item);
    setFormData({
      medication_name: item.medication_name,
      generic_name: item.generic_name || '',
      dosage: item.dosage,
      medication_type: item.medication_type,
      manufacturer: item.manufacturer || '',
      batch_number: item.batch_number || '',
      expiry_date: item.expiry_date,
      quantity_available: item.quantity_available,
      minimum_stock_level: item.minimum_stock_level,
      unit_price: item.unit_price ? item.unit_price.toString() : ''
    });
    setIsDialogOpen(true);
  };

  // Handle delete item
  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const { error } = await supabase
        .from('medication_inventory')
        .delete()
        .eq('id', itemToDelete);
        
      if (error) throw error;
      
      toast.success('Medication deleted successfully');
      refetch();
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const confirmDelete = (id: string) => {
    setItemToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // Reset form to default values
  const resetForm = () => {
    setFormData({
      medication_name: '',
      generic_name: '',
      dosage: '',
      medication_type: 'tablet',
      manufacturer: '',
      batch_number: '',
      expiry_date: format(new Date(), 'yyyy-MM-dd'),
      quantity_available: 0,
      minimum_stock_level: 10,
      unit_price: ''
    });
    setEditingItem(null);
  };

  // Filter inventory based on search
  const filteredInventory = inventory?.filter(item => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      item.medication_name.toLowerCase().includes(query) ||
      (item.generic_name && item.generic_name.toLowerCase().includes(query)) ||
      item.dosage.toLowerCase().includes(query) ||
      item.medication_type.toLowerCase().includes(query)
    );
  });

  // Check for items low in stock
  const lowStockItems = inventory?.filter(item => item.quantity_available <= item.minimum_stock_level) || [];
  
  // Check for items expiring soon (within 90 days)
  const currentDate = new Date();
  const ninetyDaysLater = new Date();
  ninetyDaysLater.setDate(currentDate.getDate() + 90);
  
  const expiringItems = inventory?.filter(item => {
    const expiryDate = new Date(item.expiry_date);
    return expiryDate <= ninetyDaysLater;
  }) || [];

  if (loadingInstitution || loadingInventory) {
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
      {/* Alerts Section */}
      {(lowStockItems.length > 0 || expiringItems.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {lowStockItems.length > 0 && (
            <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Low Stock Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {lowStockItems.length} {lowStockItems.length === 1 ? 'item is' : 'items are'} below minimum stock level
                </p>
              </CardContent>
            </Card>
          )}
          
          {expiringItems.length > 0 && (
            <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center text-red-700 dark:text-red-400">
                  <FileWarning className="h-4 w-4 mr-2" />
                  Expiration Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-red-700 dark:text-red-400">
                  {expiringItems.length} {expiringItems.length === 1 ? 'item is' : 'items are'} expiring within 90 days
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      {/* Management Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search medications..."
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
          <Plus className="h-4 w-4" /> Add Medication
        </Button>
      </div>
      
      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Medication Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInventory && filteredInventory.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medication</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Expiry Date</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.medication_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.dosage}
                            {item.generic_name && <> ({item.generic_name})</>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{item.medication_type}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <div className={`font-medium ${
                            item.quantity_available <= item.minimum_stock_level 
                              ? 'text-red-500' 
                              : ''
                          }`}>
                            {item.quantity_available}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Min: {item.minimum_stock_level}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`font-medium ${
                          new Date(item.expiry_date) <= ninetyDaysLater 
                            ? 'text-red-500' 
                            : ''
                        }`}>
                          {format(new Date(item.expiry_date), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.unit_price ? `$${item.unit_price.toFixed(2)}` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(item)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDelete(item.id)}
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
                <p className="text-muted-foreground">No medications found matching your search.</p>
              ) : (
                <p className="text-muted-foreground">No medications in inventory. Add some to get started.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add/Edit Medication Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Medication' : 'Add Medication'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="medication_name">Medication Name *</Label>
                <Input
                  id="medication_name"
                  name="medication_name"
                  value={formData.medication_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dosage">Dosage *</Label>
                  <Input
                    id="dosage"
                    name="dosage"
                    placeholder="e.g. 10mg"
                    value={formData.dosage}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="medication_type">Type *</Label>
                  <Select 
                    value={formData.medication_type} 
                    onValueChange={(value) => handleSelectChange('medication_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDICATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="generic_name">Generic Name</Label>
                <Input
                  id="generic_name"
                  name="generic_name"
                  value={formData.generic_name}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="batch_number">Batch Number</Label>
                  <Input
                    id="batch_number"
                    name="batch_number"
                    value={formData.batch_number}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="expiry_date">Expiry Date *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="expiry_date"
                      name="expiry_date"
                      type="date"
                      className="pl-8"
                      value={formData.expiry_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="unit_price">Unit Price</Label>
                  <Input
                    id="unit_price"
                    name="unit_price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.unit_price}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantity_available">Quantity Available *</Label>
                  <Input
                    id="quantity_available"
                    name="quantity_available"
                    type="number"
                    value={formData.quantity_available}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="minimum_stock_level">Minimum Stock Level</Label>
                  <Input
                    id="minimum_stock_level"
                    name="minimum_stock_level"
                    type="number"
                    value={formData.minimum_stock_level}
                    onChange={handleInputChange}
                  />
                </div>
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
                {editingItem ? 'Update' : 'Add'} Medication
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          
          <p className="py-4">
            Are you sure you want to delete this medication from the inventory? 
            This action cannot be undone.
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
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
