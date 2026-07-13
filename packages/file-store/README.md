# File Store

`@team-forge/file-store` is the default local adapter for the core
`WorkContextStore` port. It persists one versioned `context.json` per work ID
under `.team-forge/work/` unless the caller selects another root.

The adapter:

- validates work IDs before building a path;
- writes through a unique temporary file and atomically replaces the record;
- rejects records whose stored ID conflicts with the nested task identity;
- rejects workflow checkpoints whose work or run identity conflicts with the record;
- leaves source and Code Graph freshness decisions to the core resume policy.

The host repository decides whether sanitized context records are tracked in
Git. Never persist raw confidential requirement text, credentials, private
memory, or fetched requirement overrides in a shared Work Context record.
