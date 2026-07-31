const { SEED_PREFIX, pick, randInt, randFloat, randomDateInRange, sixMonthsAgo, batchRun } = require('./helpers');
const { EXPENSE_CATEGORIES } = require('./constants');

const EXPENSE_TITLES = {
  Rent: ['Monthly Rent — MG Road', 'Equipment Lease', 'Parking Lease'],
  Electricity: ['BESCOM Bill', 'Generator Diesel', 'AC Power Consumption'],
  Gas: ['Commercial LPG Cylinder', 'Pipeline Gas Charges'],
  Internet: ['ACT Fibernet', 'POS Network Charges'],
  Maintenance: ['Exhaust Hood Service', 'Refrigerator Repair', 'Plumbing Fix'],
  Salary: ['Staff Salaries — Fortnight', 'Overtime Payout', 'Bonus Disbursement'],
  Cleaning: ['Deep Clean Service', 'Pest Control', 'Uniform Laundry'],
  Marketing: ['Google Ads', 'Instagram Promotion', 'Zomato Listing Fee'],
  Transportation: ['Delivery Fuel', 'Supplier Pickup', 'Courier Charges'],
  'Office Supplies': ['Receipt Paper', 'Stationery', 'Printer Ink'],
};

async function seedFinance(prisma, ctx) {
  console.log('→ Finance (expenses & supplier invoices)');

  const { expCatMap, supplierIds, supplierMap, owner } = ctx;
  const start = sixMonthsAgo();
  const supplierNames = Object.keys(supplierMap);

  const expenseCount = await prisma.expense.count({
    where: { title: { startsWith: `${SEED_PREFIX}-EXP-` } },
  });

  if (expenseCount < 250) {
    await prisma.expense.deleteMany({ where: { title: { startsWith: `${SEED_PREFIX}-EXP-` } } });
    const expenseBatch = [];
    for (let i = 0; i < 250; i++) {
      const cat = pick(EXPENSE_CATEGORIES);
      const titles = EXPENSE_TITLES[cat] || [cat];
      expenseBatch.push({
        title: `${SEED_PREFIX}-EXP-${String(i + 1).padStart(4, '0')} ${pick(titles)}`,
        amount: randFloat(500, cat === 'Rent' ? 85000 : cat === 'Salary' ? 200000 : 25000),
        date: randomDateInRange(start),
        description: `${cat} expense for RestaurantOS Demo Restaurant`,
        categoryId: expCatMap[cat],
        supplierId: Math.random() < 0.3 ? pick(supplierIds) : null,
        createdById: owner.id,
      });
    }
    for (let i = 0; i < expenseBatch.length; i += 50) {
      await prisma.expense.createMany({ data: expenseBatch.slice(i, i + 50) });
    }
  }

  const invoiceCount = await prisma.supplierInvoice.count({
    where: { invoiceNumber: { startsWith: `${SEED_PREFIX}-INV-` } },
  });

  if (invoiceCount < 100) {
    const existing = await prisma.supplierInvoice.findMany({
      where: { invoiceNumber: { startsWith: `${SEED_PREFIX}-INV-` } },
      select: { id: true },
    });
    if (existing.length) {
      await prisma.supplierInvoiceItem.deleteMany({
        where: { invoiceId: { in: existing.map((e) => e.id) } },
      });
      await prisma.supplierInvoice.deleteMany({
        where: { invoiceNumber: { startsWith: `${SEED_PREFIX}-INV-` } },
      });
    }

    const invoiceStatuses = ['PAID', 'PAID', 'PAID', 'APPROVED', 'PENDING', 'PENDING', 'DRAFT', 'REJECTED'];
    const productNames = [
      'Tomatoes 20kg', 'Basmati Rice 25kg', 'Chicken Breast 10kg', 'Paneer 5kg',
      'Cooking Oil 5L', 'Fresh Cream 10L', 'Garam Masala 2kg', 'Onions 30kg',
      'Prawns 3kg', 'Mozzarella 2kg', 'Pasta 5kg', 'Coffee Beans 3kg',
    ];

    await batchRun(100, 10, async (from, to) => {
      for (let i = from; i < to; i++) {
        const invoiceNumber = `${SEED_PREFIX}-INV-${String(i + 1).padStart(5, '0')}`;
        const supplierName = pick(supplierNames);
        const supplierId = supplierMap[supplierName];
        const invoiceDate = randomDateInRange(start);
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 30);

        const status = pick(invoiceStatuses);
        const isOverdue = status === 'PENDING' && dueDate < new Date();
        const isHandwritten = i % 7 === 0;
        const confidence = isHandwritten ? randFloat(0.45, 0.75) : randFloat(0.82, 0.98);

        const lineCount = randInt(2, 6);
        const items = [];
        let subtotal = 0;
        for (let j = 0; j < lineCount; j++) {
          const qty = randFloat(1, 30);
          const unitPrice = randFloat(40, 800);
          const lineTax = Number((qty * unitPrice * 0.18).toFixed(2));
          const lineTotal = Number((qty * unitPrice + lineTax).toFixed(2));
          subtotal += qty * unitPrice;
          items.push({
            name: pick(productNames),
            quantity: qty,
            unitPrice,
            tax: lineTax,
            total: lineTotal,
            confidence: confidence - randFloat(0, 0.1),
          });
        }

        const tax = Number((subtotal * 0.18).toFixed(2));
        const total = Number((subtotal + tax).toFixed(2));

        await prisma.supplierInvoice.create({
          data: {
            invoiceNumber,
            supplierId,
            supplierName,
            invoiceDate,
            dueDate: isOverdue ? new Date(Date.now() - randInt(5, 45) * 86400000) : dueDate,
            gstNumber: `29AABCR${String(1000 + i).slice(-4)}F1Z5`,
            subtotal,
            tax,
            total,
            status: isOverdue ? 'PENDING' : status,
            filePath: isHandwritten ? `/uploads/demo/handwritten-inv-${i + 1}.jpg` : `/uploads/demo/printed-inv-${i + 1}.pdf`,
            ocrData: {
              supplierName,
              invoiceNumber,
              invoiceDate: invoiceDate.toISOString().split('T')[0],
              subtotal,
              tax,
              total,
              items,
              ocrEngine: confidence < 0.6 ? 'easyocr+gemini' : 'easyocr',
              rawText: `Invoice ${invoiceNumber} from ${supplierName}`,
            },
            ocrConfidence: {
              supplierName: confidence,
              invoiceNumber: confidence - 0.05,
              invoiceDate: confidence - 0.03,
              total: confidence - 0.02,
              averageConfidence: confidence,
            },
            items: { create: items },
          },
        });
      }
    });
  }

  console.log('  Expenses & invoices ready');
}

module.exports = { seedFinance };
