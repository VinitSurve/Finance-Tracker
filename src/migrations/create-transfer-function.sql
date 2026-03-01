-- ========================================
-- TRANSFER FUNCTION
-- ========================================
-- Creates a function to transfer money between user accounts atomically

CREATE OR REPLACE FUNCTION public.transfer_money(
  from_account_id UUID,
  to_account_id UUID,
  transfer_amount DECIMAL(15, 2)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  from_balance DECIMAL(15, 2);
  to_balance DECIMAL(15, 2);
  from_balance_type_id UUID;
  to_balance_type_id UUID;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate transfer amount
  IF transfer_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be greater than zero';
  END IF;
  
  -- Validate that accounts are different
  IF from_account_id = to_account_id THEN
    RAISE EXCEPTION 'Source and destination accounts must be different';
  END IF;
  
  -- Get the current balance and balance_type_id of the source account and verify ownership
  SELECT amount, balance_type_id INTO from_balance, from_balance_type_id
  FROM user_balances
  WHERE id = from_account_id AND user_id = current_user_id
  FOR UPDATE; -- Lock the row for update
  
  IF from_balance IS NULL THEN
    RAISE EXCEPTION 'Source account not found or access denied';
  END IF;
  
  -- Check if sufficient balance exists
  IF from_balance < transfer_amount THEN
    RAISE EXCEPTION 'Insufficient balance in source account';
  END IF;
  
  -- Get the current balance and balance_type_id of the destination account and verify ownership
  SELECT amount, balance_type_id INTO to_balance, to_balance_type_id
  FROM user_balances
  WHERE id = to_account_id AND user_id = current_user_id
  FOR UPDATE; -- Lock the row for update
  
  IF to_balance IS NULL THEN
    RAISE EXCEPTION 'Destination account not found or access denied';
  END IF;
  
  -- Deduct from source account
  UPDATE user_balances
  SET 
    amount = amount - transfer_amount,
    updated_at = NOW()
  WHERE id = from_account_id AND user_id = current_user_id;
  
  -- Add to destination account
  UPDATE user_balances
  SET 
    amount = amount + transfer_amount,
    updated_at = NOW()
  WHERE id = to_account_id AND user_id = current_user_id;
  
  -- Create transaction records for both accounts
  INSERT INTO transactions (user_id, type, category, reason, amount, balance_type_id, description, created_at)
  VALUES (
    current_user_id,
    'transfer',
    'Transfer',
    'Transfer out',
    transfer_amount,
    from_balance_type_id,
    'Money transferred to another account',
    NOW()
  );
  
  INSERT INTO transactions (user_id, type, category, reason, amount, balance_type_id, description, created_at)
  VALUES (
    current_user_id,
    'transfer',
    'Transfer',
    'Transfer in',
    transfer_amount,
    to_balance_type_id,
    'Money received from another account',
    NOW()
  );
  
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.transfer_money(UUID, UUID, DECIMAL) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.transfer_money IS 'Transfers money between two user accounts atomically';
