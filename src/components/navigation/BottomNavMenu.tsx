
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTouchFeedback } from "@/hooks/use-touch-feedback";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { User } from "@supabase/supabase-js";

interface MenuItemType {
  to: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface BottomNavMenuProps {
  user: User | null;
  menuItems: MenuItemType[];
}

export function BottomNavMenu({ user, menuItems }: BottomNavMenuProps) {
  const touchFeedbackProps = useTouchFeedback({ 
    rippleColor: 'var(--primary)', 
    rippleOpacity: 0.15 
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button 
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300 ease-out min-h-[52px]",
            "text-muted-foreground hover:text-trust-500 hover:scale-105 relative overflow-hidden"
          )}
          {...touchFeedbackProps}
          aria-label="More options and settings"
        >
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="p-1.5 rounded-lg">
              <Menu className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-medium leading-tight tracking-tight">More</span>
          </div>
        </button>
      </SheetTrigger>
      
      <SheetContent 
        side="right" 
        className="w-[90vw] max-w-sm bg-background/98 backdrop-blur-xl border-trust-200 shadow-2xl"
      >
        <SheetHeader className="pb-6">
          <SheetTitle className="text-trust-600 text-2xl font-bold">Quick Access</SheetTitle>
          {user && (
            <div className="flex items-center gap-4 py-4 px-3 bg-gradient-to-r from-trust-50 to-trust-100 rounded-2xl border border-trust-200 shadow-sm">
              <Avatar className="h-14 w-14 ring-2 ring-trust-300 shadow-sm">
                <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                <AvatarFallback className="bg-trust-200 text-trust-700 font-bold text-lg">
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1">
                <span className="font-bold text-trust-800 text-lg">
                  {user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-sm text-trust-600 truncate">
                  {user.email}
                </span>
              </div>
            </div>
          )}
        </SheetHeader>
        
        <ScrollArea className="flex-1 px-1">
          <div className="space-y-3 pb-4">
            {menuItems.map((item, idx) => (
              <SheetClose key={idx} asChild>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full justify-start h-auto p-3 text-left transition-all duration-200 rounded-lg",
                    "hover:bg-trust-50 hover:text-trust-700 hover:scale-[1.01] hover:shadow-sm",
                    "active:scale-[0.99] group border border-transparent hover:border-trust-200",
                    "touch-manipulation"
                  )}
                  asChild
                >
                  <Link to={item.to} className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-trust-100 text-trust-600 group-hover:bg-trust-200 transition-colors flex-shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex flex-col items-start gap-0.5 min-w-0">
                      <span className="font-medium group-hover:text-trust-800 text-sm leading-tight">
                        {item.label}
                      </span>
                      <span className="text-xs text-muted-foreground group-hover:text-trust-600 leading-tight">
                        {item.description}
                      </span>
                    </div>
                  </Link>
                </Button>
              </SheetClose>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
