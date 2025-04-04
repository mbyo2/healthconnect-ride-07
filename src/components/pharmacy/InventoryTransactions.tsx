
import * as React from 'react';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  ArrowDown,
  ArrowUp,
  History
} from 'lucide-react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

interface MedicationInventoryItem {
  id: string;
  medication_name: string;
  dosage: string;
  quantity_available: number;
  unit_price: number | null;
}

interface Transaction {
  id: string;
  medication_inventory_id: string;
  transaction_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'expired' | 'damaged';
  quantity: number;
  transaction_date: string;
  performed_by: string | null;
  notes: string | null;
  unit_price: number | null;
  supplier: string | null;
  invoice_number: string | null;
}

const TRANSACTION_TYPES = ['purchase', 'sale', 'adjustment', 'return', 'expired', 'damaged'];

export const InventoryTransactions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedication, setSelectedMedication] = useState<MedicationInventoryItem | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    transaction_type: 'purchase' as Transaction['transaction_type'],
    quantity: 1,
    unit_price: '',
    supplier: '',
    invoice_number: '',
    notes: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm')
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
  const { data: medications, isLoading: loadingMedications } = useQuery({
    queryKey: ['medicationInventory', userInstitution],
    queryFn: async () => {
      if (!userInstitution) return [];
      
      const { data, error } = await supabase
        .from('medication_inventory')
        .select('id, medication_name, dosage, quantity_available, unit_price')
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

  // Fetch transactions
  const { data: transactions, isLoading: loadingTransactions, refetch } = useQuery({
    queryKey: ['inventoryTransactions', userInstitution],
    queryFn: async () => {
      if (!userInstitution) return [];
      
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          medication_inventory!inner (
            id,
            medication_name,
            dosage,
            institution_id
          )
        `)
        .eq('medication_inventory.institution_id', userInstitution)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        throw new Error(error.message);
      }
      
      return data;
    },
    enabled: !!userInstitution,
  });
  
  // Update form when selected medication changes
  useEffect(() => {
    if (selectedMedication && selectedMedication.unit_price) {
      setFormData(prev => ({
        ...prev,
        unit_price: selectedMedication.unit_price?.toString() || ''
      }));
    }
  }, [selectedMedication]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
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
    
    if (!selectedMedication) {
      toast.error("Please select a medication");
      return;
    }
    
    if (formData.transaction_type !== 'purchase' && 
        parseInt(formData.quantity as unknown as string) > selectedMedication.quantity_available) {
      toast.error("Cannot remove more items than available in inventory");
      return;
    }
    
    try {
      const dataToSubmit = {
        medication_inventory_id: selectedMedication.id,
        transaction_type: formData.transaction_type,
        quantity: parseInt(formData.quantity as unknown as string),
        transaction_date: new Date(formData.transaction_date).toISOString(),
        performed_by: user?.id || null,
        notes: formData.notes || null,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
        supplier: formData.supplier || null,
        invoice_number: formData.invoice_number || null
      };
      
      const { error } = await supabase
        .from('inventory_transactions')
        .insert([dataToSubmit]);
        
      if (error) throw error;
      
      toast.success('Transaction recorded successfully');
      
      // Refresh data and reset form
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['medicationInventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      resetForm();
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  // Reset form to default values
  const resetForm = () => {
    setFormData({
      transaction_type: 'purchase',
      quantity: 1,
      unit_price: selectedMedication?.unit_price?.toString() || '',
      supplier: '',
      invoice_number: '',
      notes: '',
      transaction_date: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm')
    });
    setSelectedMedication(null);
  };

  // Filter transactions based on search
  const filteredTransactions = transactions?.filter(transaction => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const medicationItem = transaction.medication_inventory;
    
    return (
      medicationItem.medication_name.toLowerCase().includes(query) ||
      medicationItem.dosage.toLowerCase().includes(query) ||
      transaction.transaction_type.toLowerCase().includes(query)
    );
  });

  if (loadingInstitution || loadingMedications || loadingTransactions) {
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
            placeholder="Search transactions..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Button 
          className="gap-1"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-4 w-4" /> Record Transaction
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Inventory Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions && filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Medication</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(transaction.transaction_date), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{transaction.medication_inventory.medication_name}</div>
                        <div className="text-sm text-muted-foreground">{transaction.medication_inventory.dosage}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {transaction.transaction_type === 'purchase' || 
                           transaction.transaction_type === 'return' ? (
                            <ArrowDown className="mr-1 h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowUp className="mr-1 h-4 w-4 text-amber-500" />
                          )}
                          <span className="capitalize">{transaction.transaction_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {transaction.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.unit_price ? `$${transaction.unit_price.toFixed(2)}` : 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {transaction.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-6">
              {searchQuery ? (
                <p className="text-muted-foreground">No transactions found matching your search.</p>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <History className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No transactions recorded yet.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Record Transaction Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Inventory Transaction</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="medication">Select Medication *</Label>
                <Select 
                  value={selectedMedication?.id || ''} 
                  onValueChange={(value) => {
                    const med = medications?.find(m => m.id === value);
                    setSelectedMedication(med || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select medication" />
                  </SelectTrigger>
                  <SelectContent>
                    {medications?.map((med) => (
                      <SelectItem key={med.id} value={med.id}>
                        {med.medication_name} ({med.dosage}) - Stock: {med.quantity_available}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="transaction_type">Transaction Type *</Label>
                  <Select 
                    value={formData.transaction_type} 
                    onValueChange={(value) => handleSelectChange('transaction_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="transaction_date">Date and Time *</Label>
                <Input
                  id="transaction_date"
                  name="transaction_date"
                  type="datetime-local"
                  value={formData.transaction_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              {(formData.transaction_type === 'purchase' || formData.transaction_type === 'return') && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="supplier">Supplier</Label>
                      <Input
                        id="supplier"
                        name="supplier"
                        value={formData.supplier}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="invoice_number">Invoice Number</Label>
                      <Input
                        id="invoice_number"
                        name="invoice_number"
                        value={formData.invoice_number}
                        onChange={handleInputChange}
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
                </>
              )}
              
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Additional details about this transaction..."
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="resize-none"
                  rows={3}
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
                Record Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
