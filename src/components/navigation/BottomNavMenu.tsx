
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
          className="relative flex flex-1 flex-col items-center justify-center py-1.5 px-2 rounded-2xl min-h-[50px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 touch-manipulation group"
          {...touchFeedbackProps}
          aria-label="More options"
        >
          <div className="p-2 rounded-full transition-all duration-200 flex items-center justify-center group-hover:bg-slate-100 dark:group-hover:bg-slate-800">
            <Menu className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-black leading-none tracking-tight mt-0.5">More</span>
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[82vw] max-w-sm bg-white dark:bg-slate-900 border-l border-[#e6e9ef] dark:border-slate-800 flex flex-col h-full p-0"
      >
        <SheetHeader className="pb-0 flex-shrink-0 px-5 pt-6">
          <SheetTitle className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Menu</SheetTitle>
          {user && (
            <div className="flex items-center gap-3 mt-4 py-3.5 px-4 bg-[#f5f7fa] dark:bg-slate-800 rounded-3xl border border-[#e6e9ef] dark:border-slate-700">
              <Avatar className="h-11 w-11 ring-2 ring-[#0073ea]/30 ring-offset-1 ring-offset-[#f5f7fa] dark:ring-offset-slate-800">
                <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                <AvatarFallback className="bg-[#e5f0ff] dark:bg-blue-950 text-[#0073ea] dark:text-blue-400 font-extrabold text-sm">
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 truncate font-medium">{user.email}</span>
              </div>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 px-5 mt-4">
          <div className="space-y-1 pb-8">
            {menuItems.map((item, idx) => (
              <SheetClose key={idx} asChild>
                <Link
                  to={item.to}
                  className="flex items-center gap-3.5 w-full p-3.5 rounded-2xl hover:bg-[#f0f4ff] dark:hover:bg-slate-800 transition-all group"
                >
                  <div className="p-2.5 rounded-xl bg-[#e5f0ff] dark:bg-blue-950/60 text-[#0073ea] dark:text-blue-400 group-hover:bg-[#0073ea] group-hover:text-white transition-all shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-[#0073ea] transition-colors">{item.label}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate font-medium">{item.description}</span>
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
