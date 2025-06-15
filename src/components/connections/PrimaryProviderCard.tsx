
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PrimaryProviderAssignment } from '@/types/connections';
import { Star, MessageCircle, Calendar, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface PrimaryProviderCardProps {
  primaryProvider: PrimaryProviderAssignment | null;
  onAssign: (providerId: string) => void;
  isAssigning: boolean;
}

export const PrimaryProviderCard = ({
  primaryProvider,
  onAssign,
  isAssigning
}: PrimaryProviderCardProps) => {
  if (!primaryProvider) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Primary Provider
          </CardTitle>
          <CardDescription>
            Assign a primary healthcare provider for easier access to care
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            You haven't assigned a primary provider yet. 
            Browse your connections and set one as your primary provider for quick access.
          </p>
          <p className="text-sm text-muted-foreground">
            You can set a primary provider from your connections list or when connecting with a new provider.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Primary Provider
        </CardTitle>
        <CardDescription>
          Your designated primary healthcare provider
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={primaryProvider.provider?.avatar_url} />
            <AvatarFallback className="text-lg">
              {primaryProvider.provider?.first_name?.[0]}
              {primaryProvider.provider?.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-xl font-semibold">
                Dr. {primaryProvider.provider?.first_name} {primaryProvider.provider?.last_name}
              </h3>
              {primaryProvider.provider?.specialty && (
                <Badge variant="outline" className="mt-1">
                  {primaryProvider.provider.specialty}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <strong>Assigned:</strong> {format(new Date(primaryProvider.assigned_at), 'PPP')}
              </div>
              {primaryProvider.provider?.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {primaryProvider.provider.email}
                </div>
              )}
            </div>

            {primaryProvider.notes && (
              <div className="p-3 bg-muted rounded-lg">
                <strong className="text-sm">Notes:</strong>
                <p className="text-sm mt-1">{primaryProvider.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                Send Message
              </Button>
              <Button size="sm" variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Book Appointment
              </Button>
              <Button size="sm" variant="outline">
                Change Primary Provider
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
