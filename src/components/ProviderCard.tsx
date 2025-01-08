import React from 'react';
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Provider } from '@/types/provider';

interface ProviderCardProps {
  provider: Provider;
  onSelect?: (provider: Provider) => void;
}

export const ProviderCard = ({ provider, onSelect }: ProviderCardProps) => {
  return (
    <Card 
      className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onSelect?.(provider)}
    >
      <div className="flex items-center space-x-4">
        <Avatar className="h-12 w-12">
          <img 
            src={provider.avatar_url || '/placeholder.svg'} 
            alt={`${provider.first_name} ${provider.last_name}`}
          />
        </Avatar>
        <div>
          <h3 className="font-semibold">
            Dr. {provider.first_name} {provider.last_name}
          </h3>
          {provider.specialty && (
            <p className="text-sm text-gray-600">{provider.specialty}</p>
          )}
          {provider.bio && (
            <p className="text-sm text-gray-500 mt-2">{provider.bio}</p>
          )}
        </div>
      </div>
    </Card>
  );
};