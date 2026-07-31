const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function main() {
  const prisma = new PrismaClient();
  const r = await prisma.supplierInvoice.findFirst({ orderBy: { createdAt: 'desc' } });
  console.log('filePath:', r.filePath);
  console.log('exists:', fs.existsSync(r.filePath));
  if (fs.existsSync(r.filePath)) {
    const st = fs.statSync(r.filePath);
    console.log('size:', st.size);
  }
  console.log('ocrData keys:', Object.keys(r.ocrData || {}));
  console.log('rawText len:', (r.ocrData?.rawText || '').length);
  console.log('items:', r.ocrData?.items?.length);
  console.log('averageConfidence:', r.ocrData?.averageConfidence);
  await prisma.$disconnect();
}

main();
