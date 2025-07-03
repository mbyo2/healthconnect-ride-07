-- Add can_be_delivered field to marketplace_products
ALTER TABLE public.marketplace_products 
ADD COLUMN can_be_delivered BOOLEAN NOT NULL DEFAULT true;