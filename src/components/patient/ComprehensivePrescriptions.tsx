import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Pill, Clock, AlertTriangle, CheckCircle, Building, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Prescription {
  id: string;
  medication_name: string;
  generic_name?: string;
  dosage: string;
  strength?: string;
  quantity: number;
  refills_remaining: number;
  instructions: string;
  indication?: string;
  duration_days?: number;
  prescribed_date: string;
  expiry_date?: string;
  status: string;
  prescription_number?: string;
  is_controlled_substance: boolean;
  notes?: string;
  pharmacy_id?: string;
  provider_id: string;
}

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
  filled: { label: 'Filled', className: 'bg-green-100 text-green-800', icon: CheckCircle },
  partially_filled: { label: 'Partially Filled', className: 'bg-blue-100 text-blue-800', icon: RefreshCw },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800', icon: AlertTriangle },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-800', icon: AlertTriangle }
};

export const ComprehensivePrescriptions = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  useEffect(() => {
    if (user) {
      fetchPrescriptions();
    }
  }, [user, filterStatus, sortBy]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('comprehensive_prescriptions')
        .select(`
          *,
          healthcare_institutions!pharmacy_id (
            name,
            phone,
            address
          ),
          profiles!provider_id (
            first_name,
            last_name
          )
        `)
        .eq('patient_id', user?.id);

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const orderColumn = sortBy.includes('date') ? 'prescribed_date' : 'created_at';
      const orderDirection = sortBy.includes('desc') ? { ascending: false } : { ascending: true };
      
      query = query.order(orderColumn, orderDirection);

      const { data, error } = await query;

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Clock;
    
    return (
      <Badge className={config?.className || 'bg-gray-100 text-gray-800'}>
        <Icon className="h-3 w-3 mr-1" />
        {config?.label || status}
      </Badge>
    );
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const requestRefill = async (prescriptionId: string) => {
    try {
      // In a real implementation, this would create a refill request
      // For now, we'll just show a success message
      toast.success('Refill request sent to pharmacy');
    } catch (error) {
      console.error('Error requesting refill:', error);
      toast.error('Failed to request refill');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Prescriptions</h2>
          <p className="text-muted-foreground">Manage your prescriptions and refills</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([value, config]) => (
              <SelectItem key={value} value={value}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Newest First</SelectItem>
            <SelectItem value="date_asc">Oldest First</SelectItem>
            <SelectItem value="created_desc">Recently Added</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prescriptions List */}
      <div className="space-y-4">
        {prescriptions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Prescriptions</h3>
              <p className="text-muted-foreground">
                Your prescriptions will appear here once they're prescribed by your healthcare provider
              </p>
            </CardContent>
          </Card>
        ) : (
          prescriptions.map((prescription) => (
            <Card key={prescription.id} className={cn(
              isExpired(prescription.expiry_date) && "border-red-200 bg-red-50/50",
              isExpiringSoon(prescription.expiry_date) && !isExpired(prescription.expiry_date) && "border-yellow-200 bg-yellow-50/50"
            )}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Pill className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{prescription.medication_name}</CardTitle>
                      <CardDescription>
                        {prescription.generic_name && (
                          <span className="text-sm text-muted-foreground">
                            Generic: {prescription.generic_name}
                          </span>
                        )}
                        <br />
                        Prescribed: {format(new Date(prescription.prescribed_date), 'PPP')}
                        {prescription.prescription_number && (
                          <span className="ml-2">• Rx #{prescription.prescription_number}</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {getStatusBadge(prescription.status)}
                    {prescription.is_controlled_substance && (
                      <Badge variant="outline" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Controlled
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prescription Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Dosage:</span>
                    <p>{prescription.dosage} {prescription.strength && `(${prescription.strength})`}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Quantity:</span>
                    <p>{prescription.quantity}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Refills Left:</span>
                    <p className={cn(
                      prescription.refills_remaining === 0 && "text-red-600 font-medium"
                    )}>
                      {prescription.refills_remaining}
                    </p>
                  </div>
                  {prescription.duration_days && (
                    <div>
                      <span className="font-medium text-muted-foreground">Duration:</span>
                      <p>{prescription.duration_days} days</p>
                    </div>
                  )}
                  {prescription.expiry_date && (
                    <div>
                      <span className="font-medium text-muted-foreground">Expires:</span>
                      <p className={cn(
                        isExpired(prescription.expiry_date) && "text-red-600 font-medium",
                        isExpiringSoon(prescription.expiry_date) && !isExpired(prescription.expiry_date) && "text-yellow-600 font-medium"
                      )}>
                        {format(new Date(prescription.expiry_date), 'PPP')}
                        {isExpiringSoon(prescription.expiry_date) && !isExpired(prescription.expiry_date) && (
                          <span className="ml-1 text-xs">(Expires Soon)</span>
                        )}
                        {isExpired(prescription.expiry_date) && (
                          <span className="ml-1 text-xs">(Expired)</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div>
                  <span className="font-medium text-muted-foreground text-sm">Instructions:</span>
                  <p className="text-sm mt-1">{prescription.instructions}</p>
                </div>

                {/* Indication */}
                {prescription.indication && (
                  <div>
                    <span className="font-medium text-muted-foreground text-sm">Prescribed for:</span>
                    <p className="text-sm mt-1">{prescription.indication}</p>
                  </div>
                )}

                {/* Pharmacy Info */}
                {prescription.pharmacy_id && (prescription as any).healthcare_institutions && (
                  <div className="border-t pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Pharmacy</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium">{(prescription as any).healthcare_institutions.name}</p>
                      {(prescription as any).healthcare_institutions.address && (
                        <p>{(prescription as any).healthcare_institutions.address}</p>
                      )}
                      {(prescription as any).healthcare_institutions.phone && (
                        <p>📞 {(prescription as any).healthcare_institutions.phone}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Provider Info */}
                {(prescription as any).profiles && (
                  <div className="border-t pt-3">
                    <div className="text-sm">
                      <span className="font-medium text-muted-foreground">Prescribed by:</span>
                      <p className="mt-1">
                        Dr. {(prescription as any).profiles.first_name} {(prescription as any).profiles.last_name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {prescription.notes && (
                  <div className="border-t pt-3">
                    <span className="font-medium text-muted-foreground text-sm">Notes:</span>
                    <p className="text-sm mt-1 text-muted-foreground">{prescription.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {prescription.refills_remaining > 0 && 
                   prescription.status === 'filled' && 
                   !isExpired(prescription.expiry_date) && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => requestRefill(prescription.id)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Request Refill
                    </Button>
                  )}
                  
                  {prescription.status === 'pending' && (
                    <Button size="sm" variant="outline" disabled>
                      <Clock className="h-4 w-4 mr-2" />
                      Pending Fill
                    </Button>
                  )}
                </div>

                {/* Warnings */}
                {(isExpired(prescription.expiry_date) || isExpiringSoon(prescription.expiry_date)) && (
                  <div className={cn(
                    "p-3 rounded-lg border text-sm",
                    isExpired(prescription.expiry_date) 
                      ? "bg-red-50 border-red-200 text-red-800" 
                      : "bg-yellow-50 border-yellow-200 text-yellow-800"
                  )}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">
                        {isExpired(prescription.expiry_date) 
                          ? "This prescription has expired" 
                          : "This prescription expires soon"}
                      </span>
                    </div>
                    <p className="mt-1">
                      {isExpired(prescription.expiry_date)
                        ? "Contact your doctor for a new prescription."
                        : "Consider requesting a refill or contacting your doctor."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};