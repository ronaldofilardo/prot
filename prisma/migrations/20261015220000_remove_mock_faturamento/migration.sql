-- Remove registros de mock injetados anteriormente por fallbacks (5000.00 / 000000001 / CLIENTE TESTE LC1)
DELETE FROM "Faturamento" WHERE "numeroNota" = '000000001' AND "valorTotal" = 5000;
DELETE FROM "ContaReceber" WHERE "numero" = '000000001' AND "valor" = 5000;
DELETE FROM "ContaPagar" WHERE "numero" = '000000001' AND "valor" = 5000;
DELETE FROM "Cliente" WHERE "codigo" = '000001' AND "nome" = 'CLIENTE TESTE LC1';
