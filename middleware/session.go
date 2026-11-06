package middleware

import (
	"encoding/gob"
	"net/http"
	"os"

	"github.com/gophish/gophish/models"
	"github.com/gorilla/sessions"
)

// init registers the necessary models to be saved in the session later.
func init() {
	gob.Register(&models.User{})
	gob.Register(&models.Flash{})

	// AUTH_SECRET is mandatory: without it the cookie store cannot sign or
	// encrypt session values, so fail fast at startup rather than silently
	// breaking every login/session save at runtime.
	secret := os.Getenv("AUTH_SECRET")
	if secret == "" {
		panic("AUTH_SECRET environment variable is required")
	}
	secretBytes := []byte(secret)

	// AES block key must be 16, 24, or 32 bytes. Derive a fixed 32-byte block
	// key from AUTH_SECRET so the store is usable regardless of the exact
	// length of the secret (e.g. openssl rand -base64 32 yields 44 bytes).
	blockKey := make([]byte, 32)
	copy(blockKey, secretBytes)

	// Store contains the session information for the request.
	// The signing/encryption keys are loaded from AUTH_SECRET at startup so they
	// survive restarts.
	Store = sessions.NewCookieStore(secretBytes, blockKey)
	Store.Options.HttpOnly = true
	Store.Options.Secure = true
	Store.Options.SameSite = http.SameSiteStrictMode
	// This sets the maxAge to 5 days for all cookies
	Store.MaxAge(86400 * 5)
}

var Store *sessions.CookieStore
