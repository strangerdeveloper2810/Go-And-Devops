# Stage 1: build
FROM golang:1.24-alpine as builder 

WORKDIR /app

COPY go.mod go.sum ./  

RUN go mod download 

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /api ./cmd/api

# Stage 2: Runtime

FROM alpine:3.19

RUN apk add --no-cache ca-certificates

COPY --from=builder /api /api

EXPOSE 8080

CMD ["/api"]
