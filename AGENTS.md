# Agent rules

- Tax: per-line rates resolve server-side via resolve_item_tax_rate (item tax_template_id → facility default template → fallback) inside billing/sale RPCs; never send tax from the client. Why: tax must be customisable per item yet tamper-proof.
