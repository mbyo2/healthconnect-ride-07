import {
  MapPin, MessageCircle, Calendar, Pill, Stethoscope, Building, User, ShoppingCart, Phone, Mail, Clock
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
      case "health_personnel": return <Stethoscope className="h-3.5 w-3.5" />;
      case "patient": return <User className="h-3.5 w-3.5" />;
      default: return <Building className="h-3.5 w-3.5" />;
    }
  };

  const getRolePill = (role: string) => {
    switch (role) {
      case "health_personnel": return "bg-[#0073ea] text-white";
      case "patient": return "bg-[#00c875] text-white";
      default: return "bg-[#a25ddc] text-white";
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-[#e6e9ef] bg-white shadow-xs hover:border-[#0073ea] transition-all font-sans space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-11 w-11 border border-[#e6e9ef]">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="bg-[#e5f0ff] text-[#0073ea] font-extrabold text-xs">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              {user.first_name} {user.last_name}
            </h3>
            {user.specialty && (
              <p className="text-xs text-[#676879] font-medium">{user.specialty}</p>
            )}
            {user.city && user.state && (
              <div className="flex items-center gap-1 text-[11px] text-[#676879] font-medium mt-0.5">
                <MapPin className="h-3 w-3 text-[#0073ea]" />
                {user.city}, {user.state}
              </div>
            )}
          </div>
        </div>
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize flex items-center gap-1 ${getRolePill(user.role)}`}>
          {getRoleIcon(user.role)}
          {user.role.replace("_", " ")}
        </span>
      </div>

      {user.bio && (
        <p className="text-xs text-[#676879] line-clamp-2 font-medium">
          {user.bio}
        </p>
      )}

      {/* Institution Info */}
      {user.institution && (
        <div className="p-3 bg-[#e5f0ff] border border-[#c5d9f7] rounded-xl text-xs">
          <div className="flex items-center gap-1.5 font-extrabold text-[#0073ea]">
            <Building className="h-3.5 w-3.5" />
            <span>{user.institution.name}</span>
          </div>
          <p className="text-[10px] text-[#676879] font-medium mt-0.5">{user.institution.type}</p>
        </div>
      )}

      {/* Services */}
      {user.services && user.services.length > 0 && (
        <div className="space-y-1.5 text-xs">
          <h4 className="font-extrabold text-[#676879] uppercase text-[10px] flex items-center gap-1">
            <Stethoscope className="h-3 w-3 text-[#0073ea]" /> Services Offered
          </h4>
          <div className="space-y-1">
            {user.services.slice(0, 3).map((service) => (
              <div key={service.id} className="flex justify-between items-center text-xs p-1.5 rounded-lg bg-[#f5f6f8]">
                <span className="font-bold text-slate-900">{service.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#00c875] font-black">K{service.price}</span>
                  {service.duration && (
                    <span className="text-[#676879] text-[10px] flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> {service.duration}m
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      {user.products && user.products.length > 0 && (
        <div className="space-y-1.5 text-xs">
          <h4 className="font-extrabold text-[#676879] uppercase text-[10px] flex items-center gap-1">
            <Pill className="h-3 w-3 text-[#a25ddc]" /> Available Products
          </h4>
          <div className="space-y-1">
            {user.products.slice(0, 3).map((product) => (
              <div key={product.id} className="flex justify-between items-center text-xs p-1.5 rounded-lg bg-[#f5f6f8]">
                <span className="font-bold text-slate-900">{product.medication_name}</span>
                <span className="text-[#00c875] font-black">K{product.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Info */}
      <div className="flex flex-wrap gap-3 text-[11px] text-[#676879] font-medium pt-1 border-t border-[#e6e9ef]">
        {user.email && (
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3 text-[#0073ea]" /> {user.email}
          </div>
        )}
        {user.phone && (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-[#00c875]" /> {user.phone}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onConnect(user.id, user.role)}
          disabled={isConnecting}
          className="flex-1 py-2 rounded-xl bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all"
        >
          Connect
        </button>
        <button
          onClick={() => (window.location.href = `/chat?receiver=${user.id}`)}
          className="px-3.5 py-2 rounded-xl border border-[#c3c6d4] bg-white text-slate-800 font-bold text-xs hover:bg-[#f0f2f7] flex items-center gap-1"
        >
          <MessageCircle className="h-3.5 w-3.5 text-[#0073ea]" /> Chat
        </button>
        {user.role === "health_personnel" && (
          <button
            onClick={() => (window.location.href = `/provider/${user.id}`)}
            className="px-3.5 py-2 rounded-xl border border-[#c3c6d4] bg-white text-slate-800 font-bold text-xs hover:bg-[#f0f2f7] flex items-center gap-1"
          >
            <Calendar className="h-3.5 w-3.5 text-[#00c875]" /> Book
          </button>
        )}
      </div>
    </div>
  );
}
