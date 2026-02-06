import { useState, useEffect, useCallback, useMemo } from "react";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plus, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Entity {
  id: string;
  name: string;
  vat_number?: string | null;
  email?: string | null;
}

interface EntityAutocompleteProps {
  type: 'customer' | 'supplier';
  value: string | null;
  onValueChange: (id: string | null, entity?: Entity) => void;
  onCreateNew?: (name: string, vat?: string) => void;
  placeholder?: string;
  className?: string;
}

export function EntityAutocomplete({
  type,
  value,
  onValueChange,
  onCreateNew,
  placeholder,
  className,
}: EntityAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch entities
  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const table = type === 'customer' ? 'customers' : 'suppliers';
      const { data, error } = await supabase
        .from(table)
        .select('id, name, vat_number, email')
        .order('name', { ascending: true })
        .limit(100);

      if (!error && data) {
        setEntities(data);
      }
      setLoading(false);
    }
    fetch();
  }, [type]);

  const selectedEntity = useMemo(() => {
    return entities.find(e => e.id === value);
  }, [entities, value]);

  const filteredEntities = useMemo(() => {
    if (!search) return entities.slice(0, 20);
    
    const query = search.toLowerCase();
    return entities.filter(e =>
      e.name.toLowerCase().includes(query) ||
      e.vat_number?.includes(query) ||
      e.email?.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [entities, search]);

  const handleSelect = (entityId: string) => {
    const entity = entities.find(e => e.id === entityId);
    onValueChange(entityId, entity);
    setOpen(false);
    setSearch("");
  };

  const handleCreateNew = () => {
    if (onCreateNew && search.trim()) {
      onCreateNew(search.trim());
      setOpen(false);
      setSearch("");
    }
  };

  const Icon = type === 'customer' ? Users : Building2;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between rounded-xl h-11", className)}
        >
          <div className="flex items-center gap-2 truncate">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            {selectedEntity ? (
              <span className="truncate">{selectedEntity.name}</span>
            ) : (
              <span className="text-muted-foreground">
                {placeholder || `Επιλέξτε ${type === 'customer' ? 'πελάτη' : 'προμηθευτή'}...`}
              </span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0 rounded-xl" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Αναζήτηση με όνομα ή ΑΦΜ...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-4 text-center text-sm text-muted-foreground">
                {loading ? 'Φόρτωση...' : 'Δεν βρέθηκαν αποτελέσματα'}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredEntities.map((entity) => (
                <CommandItem
                  key={entity.id}
                  value={entity.id}
                  onSelect={handleSelect}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === entity.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{entity.name}</p>
                    {entity.vat_number && (
                      <p className="text-xs text-muted-foreground">ΑΦΜ: {entity.vat_number}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            
            {onCreateNew && search.trim() && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreateNew}
                  className="cursor-pointer border-t"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Δημιουργία "{search}"</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
