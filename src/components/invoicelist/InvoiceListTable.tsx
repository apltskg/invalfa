import { useState, useMemo } from "react";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  MoreVertical,
  Link2,
  FolderOpen,
  Plus,
  Check,
  X,
  ArrowUpDown,
} from "lucide-react";

export interface InvoiceListItem {
  id: string;
  import_id: string;
  invoice_date: string | null;
  invoice_number: string | null;
  mydata_code: string | null;
  client_id: string | null;
  client_name: string | null;
  client_vat: string | null;
  net_amount: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  mydata_mark: string | null;
  match_status: 'matched' | 'suggested' | 'unmatched';
  matched_income_id: string | null;
  matched_folder_id: string | null;
  notes: string | null;
}

interface InvoiceListTableProps {
  items: InvoiceListItem[];
  onMatchItem: (item: InvoiceListItem) => void;
  onCreateIncome: (item: InvoiceListItem) => void;
  onLinkFolder: (item: InvoiceListItem) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

type SortField = 'invoice_date' | 'invoice_number' | 'client_name' | 'total_amount';
type SortDirection = 'asc' | 'desc';

export function InvoiceListTable({
  items,
  onMatchItem,
  onCreateIncome,
  onLinkFolder,
  selectedIds,
  onSelectionChange,
}: InvoiceListTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('invoice_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch =
            item.invoice_number?.toLowerCase().includes(query) ||
            item.client_name?.toLowerCase().includes(query) ||
            item.client_vat?.includes(query);
          if (!matchesSearch) return false;
        }
        
        // Status filter
        if (statusFilter !== 'all' && item.match_status !== statusFilter) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        
        switch (sortField) {
          case 'invoice_date':
            comparison = (a.invoice_date || '').localeCompare(b.invoice_date || '');
            break;
          case 'invoice_number':
            comparison = (a.invoice_number || '').localeCompare(b.invoice_number || '');
            break;
          case 'client_name':
            comparison = (a.client_name || '').localeCompare(b.client_name || '');
            break;
          case 'total_amount':
            comparison = (a.total_amount || 0) - (b.total_amount || 0);
            break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [items, searchQuery, statusFilter, sortField, sortDirection]);

  const allSelected = filteredItems.length > 0 && filteredItems.every(item => selectedIds.includes(item.id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredItems.map(item => item.id));
    }
  };

  const toggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
            <Check className="h-3 w-3" />
            Αντιστοιχισμένο
          </Badge>
        );
      case 'suggested':
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
            <Link2 className="h-3 w-3" />
            Προτεινόμενο
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1">
            <X className="h-3 w-3" />
            Ανοιχτό
          </Badge>
        );
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      onClick={() => toggleSort(field)}
      className="cursor-pointer hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-primary' : 'text-muted-foreground/50'}`} />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Αναζήτηση αριθμού, πελάτη, ΑΦΜ..."
            className="pl-10 rounded-xl"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 rounded-xl">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλες οι καταστάσεις</SelectItem>
            <SelectItem value="matched">Αντιστοιχισμένα</SelectItem>
            <SelectItem value="suggested">Προτεινόμενα</SelectItem>
            <SelectItem value="unmatched">Ανοιχτά</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <SortableHeader field="invoice_date">Ημερομηνία</SortableHeader>
              <SortableHeader field="invoice_number">Παραστατικό</SortableHeader>
              <SortableHeader field="client_name">Πελάτης</SortableHeader>
              <TableHead>Α.Φ.Μ.</TableHead>
              <TableHead className="text-right">Καθαρή</TableHead>
              <TableHead className="text-right">Φ.Π.Α.</TableHead>
              <SortableHeader field="total_amount">
                <span className="text-right w-full">Σύνολο</span>
              </SortableHeader>
              <TableHead>MyDATA</TableHead>
              <TableHead>Κατάσταση</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                  Δεν βρέθηκαν τιμολόγια
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  className={`hover:bg-muted/50 transition-colors ${
                    selectedIds.includes(item.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.invoice_date
                      ? format(new Date(item.invoice_date), 'dd/MM/yy', { locale: el })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.invoice_number || '-'}</p>
                      {item.mydata_code && (
                        <p className="text-xs text-muted-foreground">{item.mydata_code}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-48 truncate" title={item.client_name || ''}>
                    {item.client_name || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.client_vat || '-'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    €{(item.net_amount || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    €{(item.vat_amount || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    €{(item.total_amount || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.mydata_mark || '-'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.match_status)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onMatchItem(item)}>
                          <Link2 className="h-4 w-4 mr-2" />
                          Αντιστοίχιση σε Έσοδο
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onLinkFolder(item)}>
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Σύνδεση με Φάκελο
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onCreateIncome(item)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Δημιουργία Νέου Εσόδου
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <span>
          {selectedIds.length > 0
            ? `${selectedIds.length} επιλεγμένα`
            : `${filteredItems.length} τιμολόγια`}
        </span>
        <div className="flex items-center gap-4">
          <span>
            Σύνολο: <strong className="text-foreground">€{filteredItems.reduce((sum, i) => sum + (i.total_amount || 0), 0).toFixed(2)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
