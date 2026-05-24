# proto-go

Generated Go bindings for PM Platform's Protobuf schemas.

**Do not edit `*.pb.go` files by hand.** They are regenerated from
`proto/pm/v1/*.proto` via:

```bash
pnpm proto:gen
# or
cd proto && buf generate
```

## Consumption

Each Go service depends on this package via local replace directive:

```go
// services/<svc>/go.mod
require github.com/pm-platform/proto-go v0.0.0
replace github.com/pm-platform/proto-go => ../../packages/proto-go
```

Or, when using Go workspaces (recommended for dev):

```bash
# At repo root
go work use ./packages/proto-go ./services/auth ./services/...
```

## Layout

```
pm/v1/
├── common.pb.go          # EventEnvelope, PageRequest, ErrorDetail
├── auth.pb.go            # AuthService messages
└── auth_grpc.pb.go       # AuthService server + client stubs
```
