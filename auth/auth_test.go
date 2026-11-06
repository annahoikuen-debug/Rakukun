package auth

import (
	"testing"
)

func TestPasswordPolicy(t *testing.T) {
	candidate := "short"
	got := CheckPasswordPolicy(candidate)
	if got != ErrPasswordTooShort {
		t.Fatalf("unexpected error received. expected %v got %v", ErrPasswordTooShort, got)
	}

	candidate = "ValidPass1!"
	got = CheckPasswordPolicy(candidate)
	if got != nil {
		t.Fatalf("unexpected error received. expected %v got %v", nil, got)
	}
}

func TestValidatePasswordChange(t *testing.T) {
	newPassword := "ValidPass1!"
	confirmPassword := "Different1!"
	currentPassword := "CurrentPass1!"
	currentHash, err := GeneratePasswordHash(currentPassword)
	if err != nil {
		t.Fatalf("unexpected error generating password hash: %v", err)
	}

	_, got := ValidatePasswordChange(currentHash, newPassword, confirmPassword)
	if got != ErrPasswordMismatch {
		t.Fatalf("unexpected error received. expected %v got %v", ErrPasswordMismatch, got)
	}

	newPassword = currentPassword
	confirmPassword = newPassword
	_, got = ValidatePasswordChange(currentHash, newPassword, confirmPassword)
	if got != ErrReusedPassword {
		t.Fatalf("unexpected error received. expected %v got %v", ErrReusedPassword, got)
	}
}
