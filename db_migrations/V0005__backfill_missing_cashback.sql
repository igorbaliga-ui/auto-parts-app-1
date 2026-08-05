UPDATE leads
SET cashback = ROUND(order_amount * 0.03, 2)
WHERE order_amount IS NOT NULL AND cashback IS NULL;