import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, ArrowLeft } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface KBArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  body: string;
  tags: string[];
  view_count: number;
}

/** Self-help knowledge base — real, searchable articles. */
export default function KnowledgeBase() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [open, setOpen] = useState<KBArticle | null>(null);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["kb-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kb_articles")
        .select("id, slug, title, category, body, tags, view_count")
        .eq("is_published", true)
        .order("title");
      if (error) throw error;
      return (data as KBArticle[]) || [];
    },
  });

  const categories = ["all", ...Array.from(new Set((articles || []).map((a) => a.category)))];

  const filtered = (articles || []).filter((a) => {
    if (activeCategory !== "all" && a.category !== activeCategory) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.body.toLowerCase().includes(q) ||
      (a.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const openArticle = (a: KBArticle) => {
    setOpen(a);
    supabase.rpc("increment_kb_views", { p_slug: a.slug }).catch(() => {});
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search help articles..."
            className="pl-9"
            aria-label="Search help articles"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Badge
            key={c}
            variant={activeCategory === c ? "default" : "secondary"}
            className="cursor-pointer capitalize"
            onClick={() => setActiveCategory(c)}
          >
            {c === "all" ? "All" : c.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading articles...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              No articles match. Open a ticket and support will help you directly.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {filtered.map((a) => (
            <Card
              key={a.id}
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => openArticle(a)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="capitalize text-[10px]">
                    {a.category.replace(/_/g, " ")}
                  </Badge>
                  {a.view_count > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {a.view_count} view{a.view_count === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold">{a.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {a.body.slice(0, 120)}...
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{open?.title}</DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize text-xs">
                  {open.category.replace(/_/g, " ")}
                </Badge>
                <div className="flex flex-wrap gap-1">
                  {(open.tags || []).map((t) => (
                    <span key={t} className="text-[10px] text-muted-foreground">#{t}</span>
                  ))}
                </div>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-line">{open.body}</div>
              <Button variant="outline" size="sm" onClick={() => setOpen(null)}>
                <ArrowLeft className="h-3 w-3 mr-1" /> Back to articles
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
