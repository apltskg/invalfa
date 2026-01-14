import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit2, 
  Eye, 
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Tables } from "@/integrations/supabase/types";

type ProformaInvoice = Tables<"proforma_invoices">;

interface LineItem {
  id: string;
  description: string;
  price: number;
  taxPercent: number;
  total: number;
}

const ITEMS_PER_PAGE = 10;

export default function ManageProformas() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [proformas, setProformas] = useState<ProformaInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "client">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewProforma, setViewProforma] = useState<ProformaInvoice | null>(null);

  // Fetch proformas
  useEffect(() => {
    fetchProformas();
  }, []);

  const fetchProformas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("proforma_invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProformas(data || []);
    } catch (error) {
      console.error("Error fetching proformas:", error);
      toast({
        title: "Error",
        description: "Failed to load proforma invoices.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort
  const filteredProformas = proformas
    .filter((p) => {
      const query = searchQuery.toLowerCase();
      return (
        p.invoice_number.toLowerCase().includes(query) ||
        (p.client_name?.toLowerCase().includes(query) ?? false) ||
        (p.client_email?.toLowerCase().includes(query) ?? false)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison = new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime();
          break;
        case "amount":
          comparison = a.total - b.total;
          break;
        case "client":
          comparison = (a.client_name || "").localeCompare(b.client_name || "");
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Pagination
  const totalPages = Math.ceil(filteredProformas.length / ITEMS_PER_PAGE);
  const paginatedProformas = filteredProformas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Delete proforma
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("proforma_invoices")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      setProformas((prev) => prev.filter((p) => p.id !== deleteId));
      toast({
        title: "Deleted",
        description: "Proforma invoice deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting proforma:", error);
      toast({
        title: "Error",
        description: "Failed to delete proforma invoice.",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  // Get line items from JSON
  const getLineItems = (proforma: ProformaInvoice): LineItem[] => {
    try {
      return proforma.line_items as unknown as LineItem[];
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Manage Proformas</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {proformas.length} proforma invoice{proformas.length !== 1 ? "s" : ""} total
              </p>
            </div>
            <Button asChild>
              <Link to="/proforma">
                <Plus className="h-4 w-4 mr-2" />
                New Proforma
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Search and Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number, client name, or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Proformas Table */}
        {paginatedProformas.length === 0 ? (
          searchQuery ? (
            <EmptyState
              icon={FileText}
              title="No results found"
              description="Try adjusting your search query"
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No proforma invoices yet"
              description="Create your first proforma invoice to get started"
              actionLabel="Create Proforma"
              onAction={() => navigate("/proforma")}
            />
          )
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProformas.map((proforma) => {
                  const lineItems = getLineItems(proforma);
                  return (
                    <TableRow key={proforma.id}>
                      <TableCell>
                        <span className="font-medium">{proforma.invoice_number}</span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(proforma.issue_date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{proforma.client_name || "-"}</p>
                          {proforma.client_email && (
                            <p className="text-sm text-muted-foreground">
                              {proforma.client_email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {lineItems.slice(0, 2).map((item, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {item.description?.slice(0, 20) || "Service"}
                              {item.description && item.description.length > 20 ? "..." : ""}
                            </Badge>
                          ))}
                          {lineItems.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{lineItems.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        €{proforma.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewProforma(proforma)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/proforma?edit=${proforma.id}`)}
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(proforma.id)}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredProformas.length)} of{" "}
              {filteredProformas.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Proforma Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The proforma invoice will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewProforma} onOpenChange={() => setViewProforma(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Proforma Invoice Details</DialogTitle>
            <DialogDescription>
              {viewProforma?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          {viewProforma && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="font-medium">
                    {format(new Date(viewProforma.issue_date), "dd MMMM yyyy")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-primary">
                    €{viewProforma.total.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Client Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Client Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    {viewProforma.client_name || "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    {viewProforma.client_email || "-"}
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Address:</span>{" "}
                    {viewProforma.client_address || "-"}
                  </div>
                  {viewProforma.client_vat_number && (
                    <div>
                      <span className="text-muted-foreground">VAT:</span>{" "}
                      {viewProforma.client_vat_number}
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-medium mb-2">Services</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getLineItems(viewProforma).map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.description || "-"}</TableCell>
                        <TableCell className="text-right">€{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.taxPercent}%</TableCell>
                        <TableCell className="text-right">€{item.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>€{viewProforma.subtotal.toFixed(2)}</span>
                  </div>
                  {viewProforma.discount_percent && viewProforma.discount_percent > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({viewProforma.discount_percent}%):</span>
                      <span>-€{viewProforma.discount_amount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax:</span>
                    <span>€{viewProforma.tax_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-primary">€{viewProforma.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewProforma.notes && (
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4">
                  <h4 className="font-medium mb-1">Notes</h4>
                  <p className="text-sm">{viewProforma.notes}</p>
                </div>
              )}

              {/* Payment Methods */}
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">Accepted:</span>
                {viewProforma.accept_cash && <Badge variant="outline">Cash</Badge>}
                {viewProforma.accept_bank_transfer && (
                  <Badge variant="outline">Bank Transfer</Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
