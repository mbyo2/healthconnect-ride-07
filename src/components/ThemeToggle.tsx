
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { toast } from "sonner";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    toast.success(`${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode activated`);
    
    // Announce theme change to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('class', 'sr-only');
    announcement.textContent = `${newTheme} mode activated`;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="relative h-10 w-10 rounded-full transition-colors duration-300"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={theme === "dark"}
    >
      <Sun className={`h-5 w-5 absolute transition-all duration-500 rotate-0 scale-100 ${theme === 'dark' ? 'rotate-90 scale-0' : ''}`} />
      <Moon className={`h-5 w-5 absolute transition-all duration-500 rotate-90 scale-0 ${theme === 'dark' ? '!rotate-0 !scale-100' : ''}`} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};
