package rcon

import (
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"sync/atomic"
)

const (
	HeaderSize = 8
	Version    = 2
)

var requestIDCounter uint32

// Request represents an RCON request
type Request struct {
	AuthToken   string `json:"authToken"`
	Version     int    `json:"version"`
	Name        string `json:"name"`
	ContentBody string `json:"contentBody"`
}

// Response represents an RCON response
type Response struct {
	StatusCode    int    `json:"statusCode"`
	StatusMessage string `json:"statusMessage"`
	Version       int    `json:"version"`
	Name          string `json:"name"`
	ContentBody   any    `json:"contentBody"`
}

// PackRequest serializes a request into bytes with header
func PackRequest(authToken, command string, contentBody any) ([]byte, uint32, error) {
	requestID := atomic.AddUint32(&requestIDCounter, 1)

	// ContentBody must always be a string
	// If it's not a string, JSON-encode it to a string first
	var contentBodyStr string
	switch v := contentBody.(type) {
	case string:
		contentBodyStr = v
	case nil:
		contentBodyStr = ""
	default:
		// JSON-encode non-string content to a string
		encoded, err := json.Marshal(contentBody)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to marshal contentBody: %w", err)
		}
		contentBodyStr = string(encoded)
	}

	req := Request{
		AuthToken:   authToken,
		Version:     Version,
		Name:        command,
		ContentBody: contentBodyStr,
	}

	jsonBody, err := json.Marshal(req)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create header: [requestID (4 bytes)][contentLength (4 bytes)]
	header := make([]byte, HeaderSize)
	binary.LittleEndian.PutUint32(header[0:4], requestID)
	binary.LittleEndian.PutUint32(header[4:8], uint32(len(jsonBody)))

	return append(header, jsonBody...), requestID, nil
}

// UnpackResponse deserializes a response from bytes
func UnpackResponse(data []byte) (*Response, uint32, error) {
	if len(data) < HeaderSize {
		return nil, 0, fmt.Errorf("response too short: %d bytes", len(data))
	}

	requestID := binary.LittleEndian.Uint32(data[0:4])
	contentLength := binary.LittleEndian.Uint32(data[4:8])

	if len(data) < HeaderSize+int(contentLength) {
		return nil, 0, fmt.Errorf("incomplete response body")
	}

	var resp Response
	if err := json.Unmarshal(data[HeaderSize:HeaderSize+contentLength], &resp); err != nil {
		return nil, 0, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &resp, requestID, nil
}

// XOR encrypts/decrypts data with the given key
func XOR(data []byte, key []byte) []byte {
	if len(key) == 0 {
		return data
	}

	result := make([]byte, len(data))
	for i := 0; i < len(data); i++ {
		result[i] = data[i] ^ key[i%len(key)]
	}
	return result
}

// DecodeXORKey decodes the base64 XOR key from ServerConnect
func DecodeXORKey(encodedKey string) ([]byte, error) {
	return base64.StdEncoding.DecodeString(encodedKey)
}
