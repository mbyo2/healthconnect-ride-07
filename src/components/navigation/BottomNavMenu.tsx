
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
    rippleOpacity: 0.12
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="relative flex flex-1 basis-0 flex-col items-center justify-center gap-0.5 py-1.5 min-h-0 text-muted-foreground hover:text-foreground/70 active:text-foreground/50 touch-manipulation select-none transition-all duration-200"
          {...touchFeedbackProps}
          aria-label="More options"
        >
          <div className="flex items-center justify-center w-10 h-7 sm:w-12 sm:h-8 rounded-full">
            <Menu className="h-5 w-5" />
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold leading-tight tracking-tight">More</span>
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[85vw] max-w-sm bg-background border-border flex flex-col h-full"
      >
        <SheetHeader className="pb-4 flex-shrink-0">
          <SheetTitle className="text-lg font-bold">Menu</SheetTitle>
          {user && (
            <div className="flex items-center gap-3 py-3 px-3 bg-muted/50 rounded-xl">
              <Avatar className="h-10 w-10 ring-2 ring-border">
                <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-semibold text-sm truncate">
                  {user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
              </div>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-1 pb-6">
            {menuItems.map((item, idx) => (
              <SheetClose key={idx} asChild>
                <Link
                  to={item.to}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                  </div>
                </Link>
              </SheetClose>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
