package main

import (
	"context"
	"log"
	"os"
	"time"

	"deliorder/handlers"
	"deliorder/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func main() {
	// Load .env file if present
	_ = godotenv.Load()

	// Connect to MongoDB
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("MONGODB_URI environment variable must be set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("MongoDB ping failed: %v", err)
	}
	handlers.DB = client

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	r := gin.Default()

	// CORS middleware — allow all origins (tighten in production)
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api := r.Group("/api")
	{
		// Public
		api.GET("/health", handlers.Health)
		api.POST("/admin/login", handlers.Login)
		api.GET("/menu", handlers.GetMenu)
		api.POST("/order", handlers.CreateOrder)
		api.GET("/orders", handlers.GetOrders)

		// Requires valid JWT
		api.GET("/profile", middleware.RequireAuth(), handlers.Profile)

		// Admin only
		admin := api.Group("", middleware.RequireAdmin())
		{
			admin.GET("/admin/users", handlers.ListUsers)
			admin.POST("/admin/reset-db", handlers.ResetDB)
			admin.POST("/orders/:id/confirm", handlers.ConfirmOrder)
			admin.POST("/orders/:id/complete", handlers.CompleteOrder)
			admin.POST("/menu/items", handlers.AddMenuItem)
			admin.GET("/analytics/sales", handlers.AnalyticsSales)
			admin.GET("/analytics/customizations", handlers.AnalyticsCustomizations)
			admin.GET("/analytics/menu-items", handlers.AnalyticsMenuItems)
			admin.GET("/completed-orders", handlers.GetCompletedOrders)
		}
	}

	log.Printf("Server listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
