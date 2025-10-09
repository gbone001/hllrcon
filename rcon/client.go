package rcon

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"strconv"
	"sync"
	"time"
)

type Client struct {
	host            string
	port            int
	password        string
	conn            net.Conn
	authToken       string
	xorKey          []byte
	mu              sync.Mutex
	dialTimeout     time.Duration
	maxRequestSize  int
	maxResponseSize int
}

func NewClient(host string, port int, password string, dialTimeout time.Duration, maxRequestSize, maxResponseSize int) *Client {
	return &Client{
		host:            host,
		port:            port,
		password:        password,
		dialTimeout:     dialTimeout,
		maxRequestSize:  maxRequestSize,
		maxResponseSize: maxResponseSize,
	}
}

// Connect establishes connection and authenticates
func (c *Client) Connect() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	addr := net.JoinHostPort(c.host, strconv.Itoa(c.port))
	slog.Debug("Connecting to RCON")

	conn, err := net.DialTimeout("tcp", addr, c.dialTimeout)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}
	c.conn = conn
	slog.Debug("TCP connection established")

	// Step 1: ServerConnect
	slog.Debug("Sending ServerConnect command")
	resp, err := c.exchangeUnlocked("ServerConnect", "")
	if err != nil {
		c.conn.Close()
		return fmt.Errorf("ServerConnect failed: %w", err)
	}

	if resp.StatusCode != 200 {
		c.conn.Close()
		return fmt.Errorf("ServerConnect failed: %s", resp.StatusMessage)
	}
	slog.Debug("ServerConnect successful")

	// Decode XOR key
	xorKeyStr, ok := resp.ContentBody.(string)
	if !ok {
		c.conn.Close()
		return fmt.Errorf("invalid XOR key type")
	}

	c.xorKey, err = DecodeXORKey(xorKeyStr)
	if err != nil {
		c.conn.Close()
		return fmt.Errorf("failed to decode XOR key: %w", err)
	}
	slog.Debug("XOR key decoded", "length", len(c.xorKey))

	// Step 2: Login
	slog.Debug("Sending Login command")
	resp, err = c.exchangeUnlocked("Login", c.password)
	if err != nil {
		c.conn.Close()
		return fmt.Errorf("login failed: %w", err)
	}

	if resp.StatusCode != 200 {
		c.conn.Close()
		return fmt.Errorf("login failed: %s", resp.StatusMessage)
	}

	// Save auth token
	authTokenStr, ok := resp.ContentBody.(string)
	if !ok {
		c.conn.Close()
		return fmt.Errorf("invalid auth token type")
	}
	c.authToken = authTokenStr
	slog.Info("RCON authentication successful")

	return nil
}

// Close closes the connection
func (c *Client) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

// Execute sends a command and returns the response
func (c *Client) Execute(command string, contentBody any) (*Response, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn == nil {
		return nil, fmt.Errorf("not connected")
	}

	slog.Debug("Executing RCON command", "command", command)
	resp, err := c.exchangeUnlocked(command, contentBody)
	if err != nil {
		slog.Error("RCON command failed", "command", command, "error", err)
		return nil, err
	}
	slog.Debug("RCON command completed", "command", command, "status", resp.StatusCode)
	return resp, nil
}

// exchangeUnlocked performs send/receive without locking (caller must hold lock)
func (c *Client) exchangeUnlocked(command string, contentBody any) (*Response, error) {
	// Pack request
	data, requestID, err := PackRequest(c.authToken, command, contentBody)
	if err != nil {
		return nil, err
	}

	// Validate request size
	if len(data) > c.maxRequestSize {
		return nil, fmt.Errorf("request size %d exceeds maximum %d bytes", len(data), c.maxRequestSize)
	}

	// XOR encrypt the body (not the header)
	if len(c.xorKey) > 0 {
		encryptedBody := XOR(data[HeaderSize:], c.xorKey)
		data = append(data[:HeaderSize], encryptedBody...)
	}

	// Send request
	if _, err := c.conn.Write(data); err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}

	// Receive response header
	header := make([]byte, HeaderSize)
	if _, err := c.conn.Read(header); err != nil {
		return nil, fmt.Errorf("failed to read response header: %w", err)
	}

	respID := binary.LittleEndian.Uint32(header[0:4])
	contentLength := binary.LittleEndian.Uint32(header[4:8])

	// Validate response size
	if int(contentLength) > c.maxResponseSize {
		return nil, fmt.Errorf("response size %d exceeds maximum %d bytes", contentLength, c.maxResponseSize)
	}

	// Receive response body
	body := make([]byte, contentLength)
	totalRead := 0
	for totalRead < int(contentLength) {
		n, err := c.conn.Read(body[totalRead:])
		if err != nil {
			return nil, fmt.Errorf("failed to read response body: %w", err)
		}
		totalRead += n
	}

	// XOR decrypt the body
	if len(c.xorKey) > 0 {
		body = XOR(body, c.xorKey)
	}

	// Unmarshal response
	var resp Response
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if respID != requestID {
		return nil, fmt.Errorf("response ID mismatch: expected %d, got %d", requestID, respID)
	}

	return &resp, nil
}
