package session

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"

	"github.com/Sledro/hllrcon/rcon"
)

type Session struct {
	ID        string
	Client    *rcon.Client
	Host      string
	Port      int
	CreatedAt time.Time
	LastUsed  time.Time
}

type Manager struct {
	sessions map[string]*Session
	mu       sync.RWMutex
	timeout  time.Duration
}

func NewManager(timeout time.Duration) *Manager {
	m := &Manager{
		sessions: make(map[string]*Session),
		timeout:  timeout,
	}

	// Start cleanup goroutine
	go m.cleanupLoop()

	return m
}

func (m *Manager) Create(host string, port int, password string, dialTimeout, maxRequestSize, maxResponseSize int) (*Session, error) {
	client := rcon.NewClient(host, port, password, time.Duration(dialTimeout)*time.Second, maxRequestSize, maxResponseSize)

	if err := client.Connect(); err != nil {
		return nil, err
	}

	sessionID := generateSessionID()
	session := &Session{
		ID:        sessionID,
		Client:    client,
		Host:      host,
		Port:      port,
		CreatedAt: time.Now(),
		LastUsed:  time.Now(),
	}

	m.mu.Lock()
	m.sessions[sessionID] = session
	m.mu.Unlock()

	return session, nil
}

func (m *Manager) Get(sessionID string) (*Session, bool) {
	m.mu.Lock() // Use write lock to safely update LastUsed
	defer m.mu.Unlock()

	session, exists := m.sessions[sessionID]
	if exists {
		session.LastUsed = time.Now()
	}
	return session, exists
}

func (m *Manager) Remove(sessionID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if session, exists := m.sessions[sessionID]; exists {
		session.Client.Close()
		delete(m.sessions, sessionID)
	}
}

func (m *Manager) cleanupLoop() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		m.cleanup()
	}
}

func (m *Manager) cleanup() {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	for id, session := range m.sessions {
		if now.Sub(session.LastUsed) > m.timeout {
			session.Client.Close()
			delete(m.sessions, id)
		}
	}
}

func generateSessionID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
