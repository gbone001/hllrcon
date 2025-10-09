# Build stage
FROM golang:1.25.1-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Accept build arguments for version information
ARG VERSION=dev
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown

# Build the application with version info
RUN set -ex && \
    echo "Building version: ${VERSION}, commit: ${GIT_COMMIT}, date: ${BUILD_DATE}" && \
    CGO_ENABLED=0 GOOS=linux go build \
        -a -installsuffix cgo \
        -ldflags "-X main.Version=${VERSION} -X main.GitCommit=${GIT_COMMIT} -X main.BuildDate=${BUILD_DATE}" \
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

