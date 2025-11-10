import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    const stored = (localStorage.getItem("theme") as Theme | null) ?? null;
    if (stored === "light" || stored === "dark") {
      return stored;
    }
    return "dark";
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const root = window.document.documentElement;
    const stored = localStorage.getItem("theme") as Theme | null;

    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      root.classList.toggle("dark", stored === "dark");
      return;
    }

    root.classList.add("dark");
    localStorage.setItem("theme", "dark");
    setTheme("dark");
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    const root = window.document.documentElement;
    root.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("theme", nextTheme);
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
