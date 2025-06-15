
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pill, Calendar, User, Clock, Download } from 'lucide-react';

const Prescriptions = () => {
  const prescriptions = [
    {
      id: '1',
      medication: 'Amoxicillin 500mg',
      prescriber: 'Dr. Sarah Johnson',
      dosage: '1 tablet twice daily',
      duration: '7 days',
      prescribedDate: '2024-01-15',
      status: 'active',
      refillsRemaining: 2
    },
    {
      id: '2',
      medication: 'Paracetamol 500mg',
      prescriber: 'Dr. Michael Chen',
      dosage: '1-2 tablets as needed',
      duration: 'As needed',
      prescribedDate: '2024-01-10',
      status: 'completed',
      refillsRemaining: 0
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">My Prescriptions</h1>
        <p className="text-muted-foreground">
          Track and manage your medication prescriptions
        </p>
      </div>

      <div className="grid gap-6">
        {prescriptions.map((prescription) => (
          <Card key={prescription.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Pill className="h-8 w-8 text-blue-600" />
                  <div>
                    <CardTitle className="text-xl">{prescription.medication}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <User className="h-3 w-3" />
                      Prescribed by {prescription.prescriber}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(prescription.status)}>
                  {prescription.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-1">Dosage</h4>
                  <p className="text-sm text-muted-foreground">{prescription.dosage}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm mb-1">Duration</h4>
                  <p className="text-sm text-muted-foreground">{prescription.duration}</p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-1">Refills Remaining</h4>
                  <p className="text-sm text-muted-foreground">{prescription.refillsRemaining}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Prescribed on {new Date(prescription.prescribedDate).toLocaleDateString()}
              </div>

              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline">
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                {prescription.status === 'active' && prescription.refillsRemaining > 0 && (
                  <Button size="sm">
                    Request Refill
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {prescriptions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No prescriptions found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Prescriptions;
