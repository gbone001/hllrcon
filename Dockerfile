# Build stage
FROM golang:1.25.1-alpine AS builder

WORKDIR /app

# Build arguments for version info
ARG VERSION=dev
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application with version info
RUN CGO_ENABLED=0 GOOS=linux go build \
    -a -installsuffix cgo \
    -ldflags "-X github.com/Sledro/hllrcon/cmd/hllrcon.Version=${VERSION} -X github.com/Sledro/hllrcon/cmd/hllrcon.GitCommit=${GIT_COMMIT} -X github.com/Sledro/hllrcon/cmd/hllrcon.BuildDate=${BUILD_DATE}" \
    -o hllrcon ./cmd/hllrcon

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/hllrcon .

# Copy frontend assets and config
COPY --from=builder /app/frontend ./frontend
COPY --from=builder /app/config.toml ./config.toml

# Expose port
EXPOSE 8080

# Run the application
CMD ["./hllrcon"]

