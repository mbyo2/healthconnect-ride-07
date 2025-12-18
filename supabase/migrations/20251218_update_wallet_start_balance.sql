
-- Update create_user_wallet function to set starting balance to 0.00
CREATE OR REPLACE FUNCTION public.create_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id, balance)
  VALUES (NEW.id, 0.00) -- Set starting balance to 0.00
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Optional: Update existing wallets that have the default 100.00 balance to 0.00
-- Uncomment the following line if you want to reset existing balances
-- UPDATE public.user_wallets SET balance = 0.00 WHERE balance = 100.00;
