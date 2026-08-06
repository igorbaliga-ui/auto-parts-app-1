-- Предоплата по заказу и автоматически вычисляемый остаток (сумма заказа минус предоплата)
ALTER TABLE leads ADD COLUMN prepayment NUMERIC(12,2) NULL;
ALTER TABLE leads ADD COLUMN remaining NUMERIC(12,2)
    GENERATED ALWAYS AS (
        CASE WHEN order_amount IS NOT NULL THEN order_amount - COALESCE(prepayment, 0) ELSE NULL END
    ) STORED;
