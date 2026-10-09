import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Zap, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface NoteTemplate {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category: string;
  is_shared: boolean;
  use_count: number;
}

const PLACEHOLDER_VALUES: Record<string, () => string> = {
  date: () => new Date().toLocaleDateString(),
  time: () => new Date().toLocaleTimeString(),
};

export function expandTemplate(
  content: string,
  context: { patient_name?: string; provider_name?: string; dob?: string; age?: string } = {}
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (key === "patient_name") return context.patient_name || "[patient]";
    if (key === "provider_name") return context.provider_name || "[provider]";
    if (key === "dob") return context.dob || "[dob]";
    if (key === "age") return context.age || "[age]";
    const fn = PLACEHOLDER_VALUES[key];
    return fn ? fn() : `{{${key}}}`;
  });
}

interface TemplatePickerProps {
  onInsert: (expandedText: string, template: NoteTemplate) => void;
  patientName?: string;
  providerName?: string;
}

/**
 * Epic SmartPhrases-style template picker.
 * Type a shortcut (e.g. ".ros") or browse; inserts expanded template text.
 */
export function TemplatePicker({ onInsert, patientName, providerName }: TemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["note-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clinical_note_templates")
        .select("id, shortcut, title, content, category, is_shared, use_count")
        .order("use_count", { ascending: false });
      if (error) throw error;
      return (data || []) as NoteTemplate[];
    },
  });

  const filtered = templates.filter(
    (t) =>
      t.shortcut.toLowerCase().includes(search.toLowerCase()) ||
      t.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleInsert = async (t: NoteTemplate) => {
    const expanded = expandTemplate(t.content, { patient_name: patientName, provider_name: providerName });
    try {
      await (supabase as any).rpc("increment_template_use", { p_template_id: t.id });
    } catch {
      /* non-fatal */
    }
    queryClient.invalidateQueries({ queryKey: ["note-templates"] });
    onInsert(expanded, t);
    setOpen(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Note Templates</DialogTitle>
          <DialogDescription>
            Type a shortcut like <code>.ros</code> or <code>.soap</code> to find a template.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Search shortcuts or titles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className="max-h-80 overflow-y-auto space-y-2 py-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading templates...</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No templates match.</p>
          )}
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => handleInsert(t)}
              className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-primary">{t.shortcut}</span>
                <span className="text-xs text-muted-foreground">
                  {t.is_shared ? "Shared" : "Personal"} · used {t.use_count}×
                </span>
              </div>
              <div className="text-sm font-medium mt-1">{t.title}</div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">
                {t.content.slice(0, 80)}...
              </div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <TemplateCreator onCreated={() => queryClient.invalidateQueries({ queryKey: ["note-templates"] })} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCreator({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [shortcut, setShortcut] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const sc = shortcut.trim().toLowerCase();
    if (!/^\.[a-z0-9_]{2,30}$/.test(sc)) {
      toast.error("Shortcut must look like .ros (dot + 2-30 lowercase letters/numbers)");
      return;
    }
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from("clinical_note_templates").insert({
        shortcut: sc,
        title: title.trim(),
        content: content.trim(),
        category: "general",
        is_shared: false,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success(`Template ${sc} created`);
      setOpen(false);
      setShortcut("");
      setTitle("");
      setContent("");
      onCreated();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> New template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
          <DialogDescription>
            Shortcuts start with a dot. Use {"{{patient_name}}"}, {"{{date}}"} as placeholders.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Shortcut</Label>
            <Input placeholder=".myexam" value={shortcut} onChange={(e) => setShortcut(e.target.value)} />
          </div>
          <div>
            <Label>Title</Label>
            <Input placeholder="My Exam Template" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Content</Label>
            <Textarea rows={6} placeholder="Template text with {{placeholders}}..." value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
