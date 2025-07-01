
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MapPin, 
  MessageCircle, 
  Calendar,
  Pill,
  Stethoscope,
  Building,
  User,
  ShoppingCart,
  Phone,
  Mail,
  Clock
} from 'lucide-react';

interface UserWithServices {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  specialty?: string;
  bio?: string;
  city?: string;
  state?: string;
  services?: Array<{
    id: string;
    name: string;
    description?: string;
    price: number;
    category: string;
    duration?: number;
  }>;
  products?: Array<{
    id: string;
    medication_name: string;
    description?: string;
    price: number;
    category: string;
    stock_quantity: number;
  }>;
  institution?: {
    id: string;
    name: string;
    type: string;
    address?: string;
  };
}

interface UserCardProps {
  user: UserWithServices;
  onConnect: (userId: string, userRole: string) => void;
  isConnecting: boolean;
}

export function UserCard({ user, onConnect, isConnecting }: UserCardProps) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'health_personnel': return <Stethoscope className="h-4 w-4" />;
      case 'patient': return <User className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'health_personnel': return 'bg-blue-100 text-blue-800';
      case 'patient': return 'bg-green-100 text-green-800';
      default: return 'bg-purple-100 text-purple-800';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>
                {user.first_name?.[0]}{user.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {user.first_name} {user.last_name}
              </CardTitle>
              {user.specialty && (
                <p className="text-sm text-muted-foreground">{user.specialty}</p>
              )}
              {user.city && user.state && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {user.city}, {user.state}
                </div>
              )}
            </div>
          </div>
          <Badge className={getRoleColor(user.role)}>
            <div className="flex items-center gap-1">
              {getRoleIcon(user.role)}
              {user.role.replace('_', ' ')}
            </div>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {user.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {user.bio}
          </p>
        )}

        {/* Institution Info */}
        {user.institution && (
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-purple-800">{user.institution.name}</span>
            </div>
            <p className="text-xs text-purple-600 mt-1">{user.institution.type}</p>
            {user.institution.address && (
              <p className="text-xs text-purple-600 mt-1">{user.institution.address}</p>
            )}
          </div>
        )}

        {/* Services */}
        {user.services && user.services.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-1">
              <Stethoscope className="h-3 w-3" />
              Services Offered
            </h4>
            <div className="space-y-1">
              {user.services.slice(0, 3).map((service) => (
                <div key={service.id} className="flex justify-between items-center text-xs">
                  <span className="font-medium">{service.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">K{service.price}</span>
                    {service.duration && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {service.duration}min
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {user.services.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{user.services.length - 3} more services
                </p>
              )}
            </div>
          </div>
        )}

        {/* Products */}
        {user.products && user.products.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-1">
              <Pill className="h-3 w-3" />
              Products Available
            </h4>
            <div className="space-y-1">
              {user.products.slice(0, 3).map((product) => (
                <div key={product.id} className="flex justify-between items-center text-xs">
                  <span className="font-medium">{product.medication_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">K{product.price}</span>
                    <span className="text-muted-foreground">
                      Stock: {product.stock_quantity}
                    </span>
                  </div>
                </div>
              ))}
              {user.products.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{user.products.length - 3} more products
                </p>
              )}
            </div>
          </div>
        )}

        {/* Contact Info */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {user.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {user.email}
            </div>
          )}
          {user.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {user.phone}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => onConnect(user.id, user.role)}
            disabled={isConnecting}
            className="flex-1"
          >
            <User className="h-3 w-3 mr-1" />
            Connect
          </Button>
          <Button size="sm" variant="outline">
            <MessageCircle className="h-3 w-3 mr-1" />
            Chat
          </Button>
          {user.role === 'health_personnel' && (
            <Button size="sm" variant="outline">
              <Calendar className="h-3 w-3 mr-1" />
              Book
            </Button>
          )}
          {user.products && user.products.length > 0 && (
            <Button size="sm" variant="outline">
              <ShoppingCart className="h-3 w-3 mr-1" />
              Shop
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
