ALTER TABLE cab_cart ADD COLUMN IF NOT EXISTS berg_resource_id text, ADD COLUMN IF NOT EXISTS berg_warehouse_id text;
ALTER TABLE cab_order_items ADD COLUMN IF NOT EXISTS berg_resource_id text, ADD COLUMN IF NOT EXISTS berg_warehouse_id text;
ALTER TABLE cab_orders ADD COLUMN IF NOT EXISTS berg_order_id text;