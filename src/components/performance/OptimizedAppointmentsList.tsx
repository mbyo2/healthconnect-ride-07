import React, { useMemo, useCallback } from 'react';
import { VirtualList } from '@/components/ui/VirtualList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  provider: string;
  location: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  type: string;
}

interface OptimizedAppointmentsListProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onReschedule: (appointmentId: string) => void;
  onCancel: (appointmentId: string) => void;
  className?: string;
}

const AppointmentItem = React.memo<{
  appointment: Appointment;
  onAppointmentClick: (appointment: Appointment) => void;
  onReschedule: (appointmentId: string) => void;
  onCancel: (appointmentId: string) => void;
}>(({ appointment, onAppointmentClick, onReschedule, onCancel }) => {
  const handleClick = useCallback(() => {
    onAppointmentClick(appointment);
  }, [appointment, onAppointmentClick]);

  const handleReschedule = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onReschedule(appointment.id);
  }, [appointment.id, onReschedule]);

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel(appointment.id);
  }, [appointment.id, onCancel]);

  const statusColor = useMemo(() => {
    switch (appointment.status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, [appointment.status]);

  const formattedDate = useMemo(() => {
    try {
      return format(new Date(appointment.date), 'MMM dd, yyyy');
    } catch {
      return appointment.date;
    }
  }, [appointment.date]);

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 mb-4"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{appointment.title}</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              {appointment.type}
            </CardDescription>
          </div>
          <Badge className={`${statusColor} text-xs font-medium`}>
            {appointment.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{appointment.time}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <User className="w-4 h-4" />
              <span>{appointment.provider}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MapPin className="w-4 h-4" />
              <span>{appointment.location}</span>
            </div>
          </div>
          
          {appointment.status === 'upcoming' && (
            <div className="flex space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReschedule}
                className="text-xs"
              >
                Reschedule
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

AppointmentItem.displayName = 'AppointmentItem';

export const OptimizedAppointmentsList = React.memo<OptimizedAppointmentsListProps>(({
  appointments,
  onAppointmentClick,
  onReschedule,
  onCancel,
  className = ''
}) => {
  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [appointments]);

  const renderAppointment = useCallback((appointment: Appointment, index: number) => (
    <AppointmentItem
      key={appointment.id}
      appointment={appointment}
      onAppointmentClick={onAppointmentClick}
      onReschedule={onReschedule}
      onCancel={onCancel}
    />
  ), [onAppointmentClick, onReschedule, onCancel]);

  if (appointments.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments</h3>
        <p className="text-gray-500">You don't have any appointments scheduled.</p>
      </div>
    );
  }

  // Use virtual scrolling for large lists (>50 items)
  if (appointments.length > 50) {
    return (
      <div className={className}>
        <VirtualList
          items={sortedAppointments}
          itemHeight={200}
          containerHeight={600}
          renderItem={renderAppointment}
          className="space-y-4"
        />
      </div>
    );
  }

  // Regular rendering for smaller lists
  return (
    <div className={`space-y-4 ${className}`}>
      {sortedAppointments.map((appointment, index) => 
        renderAppointment(appointment, index)
      )}
    </div>
  );
});

OptimizedAppointmentsList.displayName = 'OptimizedAppointmentsList';
