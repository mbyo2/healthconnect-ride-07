
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
            "text-muted-foreground hover:text-primary hover:scale-105 relative overflow-hidden"
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
        className="w-[90vw] max-w-sm bg-background/98 backdrop-blur-xl border-trust-200 shadow-2xl animate-in slide-in-from-right duration-300 ease-out data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:fade-out-0 data-[state=closed]:duration-200 flex flex-col h-full"
      >
        <SheetHeader className="pb-4 flex-shrink-0">
          <SheetTitle className="text-primary text-xl font-bold">Quick Access</SheetTitle>
          {user && (
            <div className="flex items-center gap-3 py-3 px-3 bg-secondary rounded-xl border border-border shadow-sm">
              <Avatar className="h-12 w-12 ring-2 ring-primary/20 shadow-sm">
                <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-bold text-foreground text-base truncate">
                  {user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user.email}
                </span>
              </div>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 px-1 overflow-y-auto">
          <div className="space-y-2 pb-6">
            {menuItems.map((item, idx) => (
              <SheetClose key={idx} asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-auto p-3 text-left transition-all duration-200 rounded-lg",
                    "hover:bg-accent hover:text-accent-foreground hover:scale-[1.01] hover:shadow-sm",
                    "active:scale-[0.99] active:bg-accent/80 group border border-transparent hover:border-border",
                    "touch-manipulation transform-gpu"
                  )}
                  asChild
                >
                  <Link to={item.to} className="flex items-center gap-3 w-full">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors flex-shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
                      <span className="font-medium group-hover:text-primary text-sm leading-tight">
                        {item.label}
                      </span>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground/80 leading-tight">
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
