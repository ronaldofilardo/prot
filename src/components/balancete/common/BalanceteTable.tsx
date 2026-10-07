import type { BalanceteDTO } from "../types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function BalanceteTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Filial</TableHead>
        <TableHead>Conta</TableHead>
        <TableHead>Competência</TableHead>
        <TableHead className="text-right">Saldo Anterior</TableHead>
        <TableHead className="text-right">Débitos</TableHead>
        <TableHead className="text-right">Créditos</TableHead>
        <TableHead className="text-right">Saldo Atual</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function BalanceteTableRow({ row }: { row: BalanceteDTO }) {
  return (
    <TableRow key={row.id}>
      <TableCell>{row.filial}</TableCell>
      <TableCell className="font-mono">{row.conta}</TableCell>
      <TableCell>{row.competencia}</TableCell>
      <TableCell className="text-right">{row.saldoAnteriorFormatado}</TableCell>
      <TableCell className="text-right text-red-600">{row.debitosFormatados}</TableCell>
      <TableCell className="text-right text-green-600">{row.creditosFormatados}</TableCell>
      <TableCell className="text-right font-medium">{row.saldoAtualFormatado}</TableCell>
    </TableRow>
  );
}

export function BalanceteTable({ data }: { data: BalanceteDTO[] }) {
  if (data.length === 0) {
    return <div className="p-4 text-center text-muted-foreground border rounded-md">Nenhum saldo encontrado para o período.</div>;
  }
  return (
    <div className="rounded-md border">
      <Table>
        <BalanceteTableHeader />
        <TableBody>
          {data.map((row) => <BalanceteTableRow key={row.id} row={row} />)}
        </TableBody>
      </Table>
    </div>
  );
}