import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, GripVertical, Check, X, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

interface Category {
  id: string;
  name: string;
  name_el: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  sort_order: number | null;
  is_operational: boolean | null;
  is_default: boolean | null;
}

const ICON_OPTIONS = [
  "Receipt", "CreditCard", "Fuel", "Car", "Plane", "Hotel", "Utensils",
  "ShoppingBag", "Briefcase", "Wrench", "Building", "Phone", "Wifi",
  "FileText", "Package", "Truck", "Bus", "CircleDot", "Navigation",
  "Hammer", "MoreHorizontal", "Tag", "Folder", "DollarSign", "Euro",
];

const COLOR_PRESETS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#64748b",
  "#84cc16", "#06b6d4", "#a855f7", "#e11d48", "#0ea5e9",
];

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [replacementCategory, setReplacementCategory] = useState<string>("");
  const [usageCount, setUsageCount] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    name_el: "",
    icon: "Receipt",
    color: "#3b82f6",
    description: "",
    is_operational: true,
    is_default: false,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const { data, error } = await supabase
      .from("expense_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Αποτυχία φόρτωσης κατηγοριών");
      console.error(error);
    } else {
      setCategories((data as Category[]) || []);
    }
    setLoading(false);
  }

  function openAddDialog() {
    setEditingCategory(null);
    setFormData({
      name: "",
      name_el: "",
      icon: "Receipt",
      color: "#3b82f6",
      description: "",
      is_operational: true,
      is_default: false,
    });
    setDialogOpen(true);
  }

  function openEditDialog(category: Category) {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      name_el: category.name_el,
      icon: category.icon || "Receipt",
      color: category.color || "#3b82f6",
      description: category.description || "",
      is_operational: category.is_operational ?? true,
      is_default: category.is_default ?? false,
    });
    setDialogOpen(true);
  }

  async function openDeleteDialog(category: Category) {
    setDeletingCategory(category);
    setReplacementCategory("");

    // Check usage count
    const { count } = await supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("expense_category_id", category.id);

    setUsageCount(count || 0);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.name_el.trim()) {
      toast.error("Το ελληνικό όνομα είναι υποχρεωτικό");
      return;
    }

    try {
      // If setting as default, unset other defaults first
      if (formData.is_default) {
        await supabase
          .from("expense_categories")
          .update({ is_default: false })
          .eq("is_default", true);
      }

      if (editingCategory) {
        // Update
        const { error } = await supabase
          .from("expense_categories")
          .update({
            name: formData.name || formData.name_el,
            name_el: formData.name_el,
            icon: formData.icon,
            color: formData.color,
            description: formData.description || null,
            is_operational: formData.is_operational,
            is_default: formData.is_default,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Η κατηγορία ενημερώθηκε");
      } else {
        // Insert
        const maxOrder = Math.max(...categories.map((c) => c.sort_order || 0), 0);
        const { error } = await supabase.from("expense_categories").insert({
          name: formData.name || formData.name_el,
          name_el: formData.name_el,
          icon: formData.icon,
          color: formData.color,
          description: formData.description || null,
          is_operational: formData.is_operational,
          is_default: formData.is_default,
          sort_order: maxOrder + 1,
        });

        if (error) throw error;
        toast.success("Η κατηγορία δημιουργήθηκε");
      }

      setDialogOpen(false);
      fetchCategories();
    } catch (err: any) {
      console.error(err);
      toast.error(`Αποτυχία: ${err.message}`);
    }
  }

  async function handleDelete() {
    if (!deletingCategory) return;

    try {
      // If has usage, reassign first
      if (usageCount > 0 && replacementCategory) {
        await supabase
          .from("invoices")
          .update({ expense_category_id: replacementCategory === "null" ? null : replacementCategory })
          .eq("expense_category_id", deletingCategory.id);
      }

      const { error } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", deletingCategory.id);

      if (error) throw error;

      toast.success("Η κατηγορία διαγράφηκε");
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      fetchCategories();
    } catch (err: any) {
      console.error(err);
      toast.error(`Αποτυχία διαγραφής: ${err.message}`);
    }
  }

  const getIconComponent = (iconName: string | null) => {
    const name = iconName || "Receipt";
    const IconComponent = (LucideIcons as any)[name];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Φόρτωση κατηγοριών...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Κατηγορίες Εξόδων</h2>
          <p className="text-sm text-muted-foreground">
            Διαχείριση κατηγοριών για έξοδα και τιμολόγια
          </p>
        </div>
        <Button onClick={openAddDialog} className="rounded-xl gap-2">
          <Plus className="h-4 w-4" />
          Νέα Κατηγορία
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Card
            key={category.id}
            className="p-4 rounded-2xl hover:shadow-md transition-shadow"
            style={{ borderLeftWidth: "4px", borderLeftColor: category.color || "#e5e7eb" }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <span style={{ color: category.color }}>
                    {getIconComponent(category.icon)}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{category.name_el}</p>
                  {category.name !== category.name_el && (
                    <p className="text-xs text-muted-foreground">{category.name}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(category)}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openDeleteDialog(category)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {category.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {category.description}
              </p>
            )}

            <div className="flex gap-2 mt-3">
              {category.is_operational && (
                <Badge variant="secondary" className="text-xs">
                  Λειτουργικό
                </Badge>
              )}
              {category.is_default && (
                <Badge className="text-xs">Προεπιλογή</Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Επεξεργασία Κατηγορίας" : "Νέα Κατηγορία"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Όνομα (Ελληνικά) *</label>
              <Input
                value={formData.name_el}
                onChange={(e) => setFormData({ ...formData, name_el: e.target.value })}
                placeholder="π.χ. Διόδια"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Όνομα (Αγγλικά)</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="π.χ. Tolls"
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Εικονίδιο</label>
                <Select
                  value={formData.icon}
                  onValueChange={(v) => setFormData({ ...formData, icon: v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {ICON_OPTIONS.map((icon) => {
                      const IconComp = (LucideIcons as any)[icon];
                      return (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            {IconComp && <IconComp className="h-4 w-4" />}
                            <span>{icon}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Χρώμα</label>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                        formData.color === color ? "border-foreground scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Περιγραφή</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Προαιρετική περιγραφή..."
                className="rounded-xl resize-none"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Λειτουργικό Έξοδο</label>
                <p className="text-xs text-muted-foreground">Εμφάνιση σε λειτουργικά έξοδα</p>
              </div>
              <Switch
                checked={formData.is_operational}
                onCheckedChange={(checked) => setFormData({ ...formData, is_operational: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Προεπιλεγμένη</label>
                <p className="text-xs text-muted-foreground">Αυτόματη επιλογή σε νέα έξοδα</p>
              </div>
              <Switch
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
              Ακύρωση
            </Button>
            <Button onClick={handleSave} className="rounded-xl">
              {editingCategory ? "Αποθήκευση" : "Δημιουργία"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή Κατηγορίας</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Είστε σίγουροι ότι θέλετε να διαγράψετε την κατηγορία "
                <strong>{deletingCategory?.name_el}</strong>";
              </p>
              {usageCount > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-amber-800 dark:text-amber-200 font-medium">
                    ⚠️ Αυτή η κατηγορία χρησιμοποιείται σε {usageCount} έξοδα
                  </p>
                  <div className="mt-2">
                    <Select value={replacementCategory} onValueChange={setReplacementCategory}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Επιλέξτε νέα κατηγορία..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Χωρίς Κατηγορία</SelectItem>
                        {categories
                          .filter((c) => c.id !== deletingCategory?.id)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name_el}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Ακύρωση</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={usageCount > 0 && !replacementCategory}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
