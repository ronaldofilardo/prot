import { prisma, withEmpresaRLS } from "./src/lib/db/prisma-client";

async function main() {
  console.log("prisma.cliente:", !!prisma.cliente);
  await withEmpresaRLS("fake-id", async (tx) => {
    console.log("tx.cliente:", !!tx.cliente);
    return true;
  });
}
main().catch(console.error);
