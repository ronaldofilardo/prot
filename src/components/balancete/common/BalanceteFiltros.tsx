import type { BalanceteFilters } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function FilterInput({ label, value, onChange, placeholder, className = "w-32" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={className} />
    </div>
  );
}

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
      <FilterInput label="Exercício" value={filters.exercicio} onChange={(v) => onChange({ ...filters, exercicio: v })} placeholder="Ex: 2026" />
      <FilterInput label="Filial (opcional)" value={filters.filial} onChange={(v) => onChange({ ...filters, filial: v })} placeholder="Ex: 01" />
      <Button onClick={onSearch} disabled={loading}>{loading ? "Buscando..." : "Pesquisar"}</Button>
    </div>
  );
}