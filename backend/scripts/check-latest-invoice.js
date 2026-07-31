const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const rows = await prisma.supplierInvoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { ocrLogs: { take: 1, orderBy: { createdAt: 'desc' } } },
  });
  for (const r of rows) {
    const log = r.ocrLogs[0];
    console.log('---');
    console.log('created:', r.createdAt.toISOString());
    console.log('supplier:', r.supplierName);
    console.log('inv:', r.invoiceNumber);
    console.log('total:', Number(r.total));
    console.log('procMs:', r.processingTimeMs);
    console.log('engine:', r.ocrData?.ocrEngine);
    console.log('errors:', r.validationErrors);
    console.log('raw:', (log?.rawText || '').slice(0, 250));
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
