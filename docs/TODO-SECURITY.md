# Security TODO
- [ ] Review all functions for missing authz (callables/webhooks)
- [ ] Ensure no secrets/PII in logs (ids/statuses only)
- [ ] Validate all inputs (zod/schema) on callables
- [ ] Idempotency keys for critical mutations
- [ ] Review Storage/Firestore rules for least privilege
- [ ] Add rate limiting where feasible
- [ ] Audit auditLogs coverage

