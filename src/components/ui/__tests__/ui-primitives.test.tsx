import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "../table";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "../card";
import { Badge } from "../badge";
import { Button } from "../button";
import { Input } from "../input";

describe("Tabela (components/ui/table)", () => {
  it("renderiza a estrutura completa com todos os subcomponentes", () => {
    const { container } = render(
      <Table>
        <TableCaption>Notas do período</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Alpha</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );

    for (const slot of ["table", "table-header", "table-body", "table-footer", "table-row", "table-head", "table-cell"]) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
    }
    expect(screen.getByText("Notas do período")).toBeDefined();
    expect(screen.getByText("Alpha")).toBeDefined();
  });
});

describe("Card (components/ui/card)", () => {
  it("renderiza header, conteúdo e rodapé", () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Faturamento</CardTitle>
          <CardDescription>Últimos 12 meses</CardDescription>
          <CardAction>
            <button type="button">Fechar</button>
          </CardAction>
        </CardHeader>
        <CardContent>Conteúdo</CardContent>
        <CardFooter>Rodapé</CardFooter>
      </Card>
    );

    for (const slot of ["card", "card-header", "card-title", "card-description", "card-action", "card-content", "card-footer"]) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
    }
    expect(screen.getByText("Faturamento")).toBeDefined();
    expect(screen.getByText("Conteúdo")).toBeDefined();
  });
});

describe("Badge (components/ui/badge)", () => {
  it("renderiza todas as variantes", () => {
    render(
      <>
        <Badge>Novo</Badge>
        <Badge variant="secondary">Secundário</Badge>
        <Badge variant="outline">Contorno</Badge>
        <Badge variant="destructive">Erro</Badge>
      </>
    );

    expect(screen.getByText("Novo")).toBeDefined();
    expect(screen.getByText("Secundário")).toBeDefined();
    expect(screen.getByText("Contorno")).toBeDefined();
    expect(screen.getByText("Erro")).toBeDefined();
  });
});

describe("Button (components/ui/button)", () => {
  it("renderiza variantes, tamanhos e estado desabilitado", () => {
    render(
      <>
        <Button>Salvar</Button>
        <Button variant="ghost" size="sm">Fantasma</Button>
        <Button variant="destructive" size="lg" disabled>Excluir</Button>
      </>
    );

    expect(screen.getByText("Salvar")).toBeDefined();
    expect(screen.getByText("Fantasma").getAttribute("data-variant")).toBe("ghost");
    expect(screen.getByText("Fantasma").getAttribute("data-size")).toBe("sm");
    expect(screen.getByText("Excluir").hasAttribute("disabled")).toBe(true);
  });
});

describe("Input (components/ui/input)", () => {
  it("renderiza com tipo, placeholder e valor padrão", () => {
    render(<Input type="email" placeholder="E-mail" defaultValue="ana@empresa.com" />);

    const input = screen.getByPlaceholderText("E-mail");
    expect(input.getAttribute("type")).toBe("email");
    expect((input as HTMLInputElement).value).toBe("ana@empresa.com");
  });
});
