package middleware

import (
	"net/http"
	"strings"

	"deliorder/jwt"

	"github.com/gin-gonic/gin"
)

const (
	UserKey = "user"
)

type AuthenticatedUser struct {
	Username string
	Role     string
}

// RequireAuth validates the Bearer JWT and stores the user in context.
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Missing Authorization header"})
			return
		}
		tokenStr := header[7:]
		claims, err := jwtutil.VerifyToken(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Invalid or expired token"})
			return
		}
		c.Set(UserKey, &AuthenticatedUser{Username: claims.Sub, Role: claims.Role})
		c.Next()
	}
}

// RequireAdmin validates the JWT and ensures the role is "admin".
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Missing Authorization header"})
			return
		}
		tokenStr := header[7:]
		claims, err := jwtutil.VerifyToken(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Invalid or expired token"})
			return
		}
		if claims.Role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"success": false, "error": "Admin role required"})
			return
		}
		c.Set(UserKey, &AuthenticatedUser{Username: claims.Sub, Role: claims.Role})
		c.Next()
	}
}
