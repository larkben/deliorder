package jwtutil

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWTSecret is the signing key. Override via env in production.
var JWTSecret = []byte("change_this_to_an_env_var_in_production")

type Claims struct {
	Sub  string `json:"sub"`
	Role string `json:"role"`
	jwt.RegisteredClaims
}

// CreateToken mints an 8-hour JWT for the given username and role.
func CreateToken(username, role string) (string, error) {
	now := time.Now()
	claims := Claims{
		Sub:  username,
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(8 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWTSecret)
}

// VerifyToken parses and validates a JWT, returning the embedded claims.
func VerifyToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return JWTSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}
