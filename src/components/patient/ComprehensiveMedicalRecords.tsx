import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserRoles } from '@/context/UserRolesContext';
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
import { CalendarIcon, Plus, FileText, Stethoscope, TestTube, Camera, Pill, AlertTriangle, Heart, Shield, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MedicalRecord {
  id: string;
  record_type: string;
  title: string;
  description: string;
  clinical_data: any;
  visit_date: string;
  severity_level: string;
  status: string;
  provider_id?: string;
  is_private: boolean;
  created_at: string;
}

const recordTypeIcons = {
  diagnosis: Stethoscope,
  treatment: Heart,
  lab_result: TestTube,
  imaging: Camera,
  procedure: FileText,
  medication: Pill,
  allergy: AlertTriangle,
  vital_signs: Heart,
  vaccination: Shield
};

const recordTypes = [
  { value: 'diagnosis', label: 'Diagnosis' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'lab_result', label: 'Lab Result' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'medication', label: 'Medication' },
  { value: 'allergy', label: 'Allergy' },
  { value: 'vital_signs', label: 'Vital Signs' },
  { value: 'vaccination', label: 'Vaccination' }
];

const severityLevels = [
  { value: 'low', label: 'Low', className: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', className: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', className: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical', className: 'bg-red-100 text-red-800' }
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'chronic', label: 'Chronic' },
  { value: 'under_treatment', label: 'Under Treatment' }
];

export const ComprehensiveMedicalRecords = () => {
  const { user, profile } = useAuth();
  const { availableRoles, isAdmin, isSuperAdmin } = useUserRoles();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const userSpecialty = profile?.specialty?.toLowerCase() || '';

  const canEditRecordType = (recordType: string) => {
    if (isSuperAdmin || isAdmin) return true;

    const roles = availableRoles;
    const specialty = userSpecialty;

    switch (recordType) {
      case 'diagnosis':
        return roles.includes('doctor');
      case 'treatment':
        return roles.includes('doctor') || roles.includes('nurse');
      case 'lab_result':
        return roles.includes('lab_technician') || roles.includes('lab') || (roles.includes('doctor') && specialty.includes('patholog'));
      case 'imaging':
        return roles.includes('radiologist') || (roles.includes('doctor') && specialty.includes('radiolog'));
      case 'procedure':
        return roles.includes('doctor') || roles.includes('nurse');
      case 'medication':
        return roles.includes('doctor') || roles.includes('pharmacist') || roles.includes('pharmacy');
      case 'allergy':
        return roles.includes('doctor') || roles.includes('nurse');
      case 'vital_signs':
        return roles.includes('nurse') || roles.includes('doctor') || roles.includes('lab_technician');
      case 'vaccination':
        return roles.includes('nurse') || roles.includes('doctor');
      default:
        return false;
    }
  };

  const canAddAny = recordTypes.some(type => canEditRecordType(type.value));

  const [formData, setFormData] = useState({
    record_type: '',
    title: '',
    description: '',
    visit_date: new Date(),
    severity_level: 'low',
    status: 'active',
    is_private: false,
    clinical_data: {}
  });

  useEffect(() => {
    if (user) {
      fetchMedicalRecords();
    }
  }, [user, filterType, sortBy]);

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('comprehensive_medical_records')
        .select('*')
        .eq('patient_id', user?.id);

      if (filterType !== 'all') {
        query = query.eq('record_type', filterType);
      }

      const orderColumn = sortBy.includes('date') ? 'visit_date' : 'created_at';
      const orderDirection = sortBy.includes('desc') ? { ascending: false } : { ascending: true };

      query = query.order(orderColumn, orderDirection);

      const { data, error } = await query;

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching medical records:', error);
      toast.error('Failed to load medical records');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEditRecordType(formData.record_type)) {
      toast.error('You do not have permission to add/edit this type of medical record');
      return;
    }

    if (!formData.record_type || !formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingRecordId) {
        const { error } = await supabase
          .from('comprehensive_medical_records')
          .update({
            ...formData,
            visit_date: format(formData.visit_date, 'yyyy-MM-dd')
          })
          .eq('id', editingRecordId);

        if (error) throw error;
        toast.success('Medical record updated successfully');
      } else {
        const { error } = await supabase
          .from('comprehensive_medical_records')
          .insert({
            patient_id: user?.id,
            ...formData,
            visit_date: format(formData.visit_date, 'yyyy-MM-dd')
          });

        if (error) throw error;
        toast.success('Medical record added successfully');
      }

      setShowAddForm(false);
      setEditingRecordId(null);
      setFormData({
        record_type: '',
        title: '',
        description: '',
        visit_date: new Date(),
        severity_level: 'low',
        status: 'active',
        is_private: false,
        clinical_data: {}
      });
      fetchMedicalRecords();
    } catch (error) {
      console.error('Error saving medical record:', error);
      toast.error('Failed to save medical record');
    }
  };

  const handleEdit = (record: MedicalRecord) => {
    if (!canEditRecordType(record.record_type)) {
      toast.error('You do not have permission to edit this record');
      return;
    }
    setFormData({
      record_type: record.record_type,
      title: record.title,
      description: record.description,
      visit_date: new Date(record.visit_date),
      severity_level: record.severity_level,
      status: record.status,
      is_private: record.is_private,
      clinical_data: record.clinical_data || {}
    });
    setEditingRecordId(record.id);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingRecordId(null);
    setFormData({
      record_type: '',
      title: '',
      description: '',
      visit_date: new Date(),
      severity_level: 'low',
      status: 'active',
      is_private: false,
      clinical_data: {}
    });
  };

  const getSeverityBadge = (level: string) => {
    const severity = severityLevels.find(s => s.value === level);
    return (
      <Badge className={severity?.className}>
        {severity?.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      chronic: 'bg-purple-100 text-purple-800',
      under_treatment: 'bg-orange-100 text-orange-800'
    };

    return (
      <Badge className={statusConfig[status as keyof typeof statusConfig]}>
        {statusOptions.find(s => s.value === status)?.label}
      </Badge>
    );
  };

  const getRecordIcon = (type: string) => {
    const Icon = recordTypeIcons[type as keyof typeof recordTypeIcons] || FileText;
    return <Icon className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
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
          <h2 className="text-2xl font-bold">Medical Records</h2>
          <p className="text-muted-foreground">Comprehensive medical history and records</p>
        </div>
        {canAddAny && (
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Record
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {recordTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
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

      {/* Add/Edit Record Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingRecordId ? 'Edit Medical Record' : 'Add Medical Record'}</CardTitle>
            <CardDescription>
              {editingRecordId ? 'Update medical information' : 'Record new medical information'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="record_type">Record Type *</Label>
                  <Select value={formData.record_type} onValueChange={(value) =>
                    setFormData(prev => ({ ...prev, record_type: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {recordTypes.map((type) => (
                        <SelectItem
                          key={type.value}
                          value={type.value}
                          disabled={!canEditRecordType(type.value)}
                        >
                          {type.label} {!canEditRecordType(type.value) && '(Unauthorized)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="visit_date">Visit Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.visit_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.visit_date ? format(formData.visit_date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.visit_date}
                        onSelect={(date) =>
                          setFormData(prev => ({ ...prev, visit_date: date || new Date() }))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="severity_level">Severity Level</Label>
                  <Select value={formData.severity_level} onValueChange={(value) =>
                    setFormData(prev => ({ ...prev, severity_level: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {severityLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) =>
                    setFormData(prev => ({ ...prev, status: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Brief title for this record"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description of the medical record"
                  required
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRecordId ? 'Update Record' : 'Add Record'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Records List */}
      <div className="space-y-4">
        {records.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Medical Records</h3>
              <p className="text-muted-foreground mb-4">
                {canAddAny ? 'Start by adding your first medical record' : 'No medical records found.'}
              </p>
              {canAddAny && (
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Record
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          records.map((record) => (
            <Card key={record.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getRecordIcon(record.record_type)}
                    <div>
                      <CardTitle className="text-lg">{record.title}</CardTitle>
                      <CardDescription>
                        {recordTypes.find(t => t.value === record.record_type)?.label} •
                        {format(new Date(record.visit_date), 'PPP')}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {getSeverityBadge(record.severity_level)}
                    {getStatusBadge(record.status)}
                    {record.is_private && <Badge variant="outline">Private</Badge>}
                    {canEditRecordType(record.record_type) && (
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(record)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {record.description}
                </p>
                {record.clinical_data && Object.keys(record.clinical_data).length > 0 && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Clinical Data</h4>
                    <pre className="text-xs text-muted-foreground">
                      {JSON.stringify(record.clinical_data, null, 2)}
                    </pre>
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