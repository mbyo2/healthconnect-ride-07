import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "sonner";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    toast.success(`${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode activated`);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-full transition-colors hover:bg-accent relative z-10 h-9 w-9 md:h-10 md:w-10"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-[1.2rem] w-[1.2rem] md:h-5 md:w-5 animate-theme-toggle text-yellow-500" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] md:h-5 md:w-5 animate-theme-toggle text-slate-900 dark:text-slate-100" />
      )}
    </Button>
  );
};