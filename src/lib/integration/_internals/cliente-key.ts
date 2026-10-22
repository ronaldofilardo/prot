/**
 * Chave normalizada de cliente para casamento entre cadastro (SA1) e
 * titulos/notas (SE1, SF2, SD2).
 *
 * O Protheus real devolve A1_LOJA/E1_LOJA em 4 digitos ("0001"), enquanto
 * syncs antigos gravaram "01". Comparar strings crus derrubava todos os
 * titulos com "cliente nao encontrado". A normalizacao remove zeros a
 * esquerda APENAS da loja; o codigo fica exato (trim) para nao criar
 * colisao entre "001" e "000001".
 */
export function normLoja(loja: string | null | undefined): string {
  const raw = String(loja ?? "").trim();
  if (!raw) return "1";
  return raw.replace(/^0+(?=\d)/, "");
}

export function clienteKey(
  codigo: string | null | undefined,
  loja: string | null | undefined
): string {
  return `${String(codigo ?? "").trim()}|${normLoja(loja)}`;
}
