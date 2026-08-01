SELECT 'User' AS table_name, COUNT(*) FROM "User"
UNION ALL SELECT 'Order', COUNT(*) FROM "Order"
UNION ALL SELECT 'MenuItem', COUNT(*) FROM "MenuItem"
UNION ALL SELECT 'Expense', COUNT(*) FROM "Expense";
