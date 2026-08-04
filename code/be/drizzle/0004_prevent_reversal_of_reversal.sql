CREATE OR REPLACE FUNCTION reject_reversal_of_reversal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.event_type = 'REVERSAL'
    AND EXISTS (
      SELECT 1
      FROM financial_events reversed
      WHERE reversed.id = NEW.reverses_event_id
        AND reversed.event_type = 'REVERSAL'
    )
  THEN
    RAISE EXCEPTION 'A reversal event cannot reverse another reversal'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER financial_events_no_reversal_of_reversal
BEFORE INSERT ON financial_events
FOR EACH ROW EXECUTE FUNCTION reject_reversal_of_reversal();
