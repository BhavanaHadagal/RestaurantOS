require('dotenv').config();
const { invoiceService } = require('../src/services/aiService');
const { serializeForJson } = require('../src/utils/serialize');

async function main() {
  const result = await invoiceService.getAll({ page: 1, limit: 10 });
  const payload = serializeForJson({ success: true, ...result });
  console.log('rows', payload.data.length, 'total', payload.pagination.total);
  console.log('bytes', JSON.stringify(payload).length);
}

main().catch((error) => {
  console.error('FAIL', error);
  process.exit(1);
});
