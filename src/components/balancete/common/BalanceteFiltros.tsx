import type { BalanceteFilters } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BalanceteFiltros({
  filters,
  onChange,
  onSearch,
  loading
}: {
  filters: BalanceteFilters;
  onChange: (f: BalanceteFilters) => void;
  onSearch: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-4 items-end bg-muted/50 p-4 rounded-md">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Exercício</label>
        <Input 
          type="text" 
          value={filters.exercicio} 
          onChange={(e) => onChange({ ...filters, exercicio: e.target.value })} 
          placeholder="Ex: 2026"
          className="w-32"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Filial (opcional)</label>
        <Input 
          type="text" 
          value={filters.filial} 
          onChange={(e) => onChange({ ...filters, filial: e.target.value })} 
          placeholder="Ex: 01"
          className="w-32"
        />
      </div>
      <Button onClick={onSearch} disabled={loading}>
        {loading ? "Buscando..." : "Pesquisar"}
      </Button>
    </div>
  );
}
