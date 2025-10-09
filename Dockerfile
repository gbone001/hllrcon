# Build stage
FROM golang:1.25.1-alpine AS builder

# Install git for version info extraction
RUN apk add --no-cache git

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and git metadata
COPY . .

# Extract version info from git and build the application
RUN set -ex && \
    ls -la .git/ && \
    GIT_COMMIT=$(git rev-parse --short HEAD 2>&1) && \
    echo "GIT_COMMIT: ${GIT_COMMIT}" && \
    VERSION=$(git describe --tags --exact-match 2>/dev/null || echo "${GIT_COMMIT}") && \
    echo "VERSION: ${VERSION}" && \
    BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") && \
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

