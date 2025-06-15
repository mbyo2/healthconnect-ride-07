
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserConnection } from '@/types/connections';
import { useAuth } from '@/context/AuthContext';
import { Check, X, MessageCircle, Calendar, Star } from 'lucide-react';
import { format } from 'date-fns';

interface ConnectionCardProps {
  connection: UserConnection;
  onApprove?: (connectionId: string) => void;
  onReject?: (connectionId: string) => void;
  onSetPrimary?: (providerId: string) => void;
  showActions?: boolean;
  isAssigningPrimary?: boolean;
}

export const ConnectionCard = ({
  connection,
  onApprove,
  onReject,
  onSetPrimary,
  showActions = false,
  isAssigningPrimary = false
}: ConnectionCardProps) => {
  const { user } = useAuth();
  
  // Determine if current user is patient or provider in this connection
  const isUserPatient = connection.patient_id === user?.id;
  const otherUser = isUserPatient ? connection.provider : connection.patient;
  const userRole = isUserPatient ? 'patient' : 'provider';

  const getConnectionTypeColor = (type: string) => {
    switch (type) {
      case 'manual': return 'bg-blue-100 text-blue-800';
      case 'automatic': return 'bg-green-100 text-green-800';
      case 'appointment_based': return 'bg-purple-100 text-purple-800';
      case 'chat_based': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'blocked': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={otherUser?.avatar_url} />
              <AvatarFallback>
                {otherUser?.first_name?.[0]}{otherUser?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">
                {otherUser?.first_name} {otherUser?.last_name}
              </CardTitle>
              {!isUserPatient && connection.provider?.specialty && (
                <p className="text-sm text-muted-foreground">
                  {connection.provider.specialty}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Badge className={getStatusColor(connection.status)}>
              {connection.status}
            </Badge>
            <Badge variant="outline" className={getConnectionTypeColor(connection.connection_type)}>
              {connection.connection_type.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Connected: {format(new Date(connection.created_at), 'PPP')}
          </div>
          
          {connection.notes && (
            <div className="text-sm">
              <strong>Notes:</strong> {connection.notes}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {connection.status === 'approved' && (
              <>
                <Button size="sm" variant="outline" className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  Chat
                </Button>
                <Button size="sm" variant="outline" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Book
                </Button>
                {isUserPatient && onSetPrimary && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex items-center gap-1"
                    onClick={() => onSetPrimary(connection.provider_id)}
                    disabled={isAssigningPrimary}
                  >
                    <Star className="h-3 w-3" />
                    Set Primary
                  </Button>
                )}
              </>
            )}
            
            {showActions && connection.status === 'pending' && onApprove && onReject && (
              <>
                <Button 
                  size="sm" 
                  variant="default"
                  className="flex items-center gap-1"
                  onClick={() => onApprove(connection.id)}
                >
                  <Check className="h-3 w-3" />
                  Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  className="flex items-center gap-1"
                  onClick={() => onReject(connection.id)}
                >
                  <X className="h-3 w-3" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
