package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"deliorder/middleware"
	"deliorder/models"
	jwtutil "deliorder/jwt"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const (
	adminUsername = "admin"
	adminPassword = "secret123"
	dbName        = "food_order"
)

// DB is the shared MongoDB client set by main.go.
var DB *mongo.Client

func ordersCol() *mongo.Collection {
	return DB.Database(dbName).Collection("orders")
}

func menuCol() *mongo.Collection {
	return DB.Database(dbName).Collection("menu_items")
}

// bsonTimeToRFC3339 converts a bson.DateTime value (milliseconds) to an RFC3339 string.
func bsonTimeToRFC3339(v interface{}) string {
	switch t := v.(type) {
	case bson.DateTime:
		return t.Time().UTC().Format(time.RFC3339)
	case time.Time:
		return t.UTC().Format(time.RFC3339)
	}
	return ""
}

// ── Public endpoints ──────────────────────────────────────────────────────────

// Health godoc
// GET /api/health
func Health(c *gin.Context) {
	data := "ok"
	c.JSON(http.StatusOK, models.ApiResponse[string]{Success: true, Data: &data})
}

// Login godoc
// POST /api/admin/login
func Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		msg := "Invalid request body"
		c.JSON(http.StatusBadRequest, models.ApiResponse[string]{Success: false, Error: &msg})
		return
	}
	if req.Username != adminUsername || req.Password != adminPassword {
		msg := "Invalid credentials"
		c.JSON(http.StatusUnauthorized, models.ApiResponse[string]{Success: false, Error: &msg})
		return
	}
	token, err := jwtutil.CreateToken(req.Username, "admin")
	if err != nil {
		msg := "Token generation failed"
		c.JSON(http.StatusInternalServerError, models.ApiResponse[string]{Success: false, Error: &msg})
		return
	}
	resp := models.LoginResponse{Token: token}
	c.JSON(http.StatusOK, models.ApiResponse[models.LoginResponse]{Success: true, Data: &resp})
}

// Profile godoc
// GET /api/profile  (requires valid JWT)
func Profile(c *gin.Context) {
	user := c.MustGet(middleware.UserKey).(*middleware.AuthenticatedUser)
	msg := "Hello, " + user.Username + "! Role: " + user.Role
	c.JSON(http.StatusOK, models.ApiResponse[string]{Success: true, Data: &msg})
}

// ListUsers godoc
// GET /api/admin/users  (admin only)
func ListUsers(c *gin.Context) {
	users := []string{"alice", "bob", "charlie"}
	c.JSON(http.StatusOK, models.ApiResponse[[]string]{Success: true, Data: &users})
}

// ResetDB godoc
// POST /api/admin/reset-db  (admin only)
func ResetDB(c *gin.Context) {
	msg := "DB reset triggered"
	c.JSON(http.StatusOK, models.ApiResponse[string]{Success: true, Data: &msg})
}

// ── GET /api/menu ─────────────────────────────────────────────────────────────

func GetMenu(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := menuCol().Find(ctx, bson.D{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer cursor.Close(ctx)

	var items []models.MenuItemResponse
	for cursor.Next(ctx) {
		var item models.MenuItem
		if err := cursor.Decode(&item); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Decode error"})
			return
		}
		desc := ""
		if item.Description != nil {
			desc = *item.Description
		}
		createdAt := ""
		if item.CreatedAt != nil {
			createdAt = bsonTimeToRFC3339(item.CreatedAt)
		}
		customizations := item.Customizations
		if customizations == nil {
			customizations = []models.Customization{}
		}
		id := ""
		if oid, ok := item.ID.(bson.ObjectID); ok {
			id = oid.Hex()
		}
		items = append(items, models.MenuItemResponse{
			ID:             id,
			Name:           item.Name,
			Description:    desc,
			Price:          item.Price,
			Section:        item.Section,
			Subsection:     item.Subsection,
			CreatedAt:      createdAt,
			Customizations: customizations,
		})
	}
	if items == nil {
		items = []models.MenuItemResponse{}
	}
	c.JSON(http.StatusOK, items)
}

// ── POST /api/order ───────────────────────────────────────────────────────────

func CreateOrder(c *gin.Context) {
	var req models.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.OrderResponse{Success: false, Message: "Invalid request body"})
		return
	}

	trimmedName := strings.TrimSpace(req.Name)
	if trimmedName == "" {
		c.JSON(http.StatusBadRequest, models.OrderResponse{Success: false, Message: "Name is required and cannot be empty"})
		return
	}
	if len(trimmedName) < 2 {
		c.JSON(http.StatusBadRequest, models.OrderResponse{Success: false, Message: "Name must be at least 2 characters long"})
		return
	}
	if len(trimmedName) > 100 {
		c.JSON(http.StatusBadRequest, models.OrderResponse{Success: false, Message: "Name cannot exceed 100 characters"})
		return
	}
	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, models.OrderResponse{Success: false, Message: "No items in order"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check for existing active order
	existingCount, err := ordersCol().CountDocuments(ctx, bson.D{
		{Key: "name", Value: trimmedName},
		{Key: "status", Value: bson.D{{Key: "$in", Value: bson.A{"confirmed", "prepared"}}}},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.OrderResponse{Success: false, Message: "Database error"})
		return
	}
	if existingCount > 0 {
		c.JSON(http.StatusConflict, models.OrderResponse{
			Success: false,
			Message: "You already have an active order. Please wait for it to be completed before placing a new order.",
		})
		return
	}

	// Server-side price validation
	validated := make([]models.ValidatedItem, 0, len(req.Items))
	for _, item := range req.Items {
		calculatedPrice := item.Price
		for _, customization := range item.Customizations {
			switch customization.Kind {
			case models.CustomizationTypeSingle:
				if sel, ok := item.Selections[customization.ID]; ok && sel != nil && sel.Single != nil {
					for _, opt := range customization.Options {
						if opt.Value == *sel.Single {
							calculatedPrice += opt.Price
							break
						}
					}
				}
			case models.CustomizationTypeMultiple:
				if sel, ok := item.Selections[customization.ID]; ok && sel != nil && len(sel.Multiple) > 0 {
					for _, chosen := range sel.Multiple {
						for _, opt := range customization.Options {
							if opt.Value == chosen {
								calculatedPrice += opt.Price
								break
							}
						}
					}
				}
			}
		}
		note := ""
		if item.Note != nil {
			note = *item.Note
		}
		sels := item.Selections
		if sels == nil {
			sels = map[string]*models.Selection{}
		}
		completed := false
		validated = append(validated, models.ValidatedItem{
			Name:       item.Name,
			BasePrice:  item.Price,
			FinalPrice: calculatedPrice,
			Selections: sels,
			Note:       note,
			Section:    item.Section,
			Subsection: item.Subsection,
			Completed:  &completed,
		})
	}

	var total float64
	for _, v := range validated {
		total += v.FinalPrice
	}

	now := bson.NewDateTimeFromTime(time.Now().UTC())
	order := bson.D{
		{Key: "name", Value: trimmedName},
		{Key: "items", Value: validated},
		{Key: "total", Value: total},
		{Key: "status", Value: "new"},
		{Key: "createdAt", Value: now},
		{Key: "updatedAt", Value: now},
	}

	if _, err := ordersCol().InsertOne(ctx, order); err != nil {
		c.JSON(http.StatusInternalServerError, models.OrderResponse{Success: false, Message: "DB insert failed"})
		return
	}

	c.JSON(http.StatusOK, models.OrderResponse{Success: true, Message: "Order created"})
}

// ── GET /api/orders ───────────────────────────────────────────────────────────

func GetOrders(c *gin.Context) {
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	filter := bson.D{
		{Key: "status", Value: bson.D{{Key: "$in", Value: bson.A{"confirmed", "prepared"}}}},
	}
	filter = applyDateFilter(filter, "createdAt", dateFrom, dateTo)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := ordersCol().Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer cursor.Close(ctx)

	var orders []models.OrderQueryResponse
	for cursor.Next(ctx) {
		var raw bson.M
		if err := cursor.Decode(&raw); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Decode error"})
			return
		}
		orders = append(orders, rawToOrderQueryResponse(raw))
	}
	if orders == nil {
		orders = []models.OrderQueryResponse{}
	}
	c.JSON(http.StatusOK, orders)
}

// ── POST /api/orders/:id/confirm (admin) ──────────────────────────────────────

func ConfirmOrder(c *gin.Context) {
	updateOrderStatus(c, "confirmed", "Order confirmed")
}

// ── POST /api/orders/:id/complete (admin) ─────────────────────────────────────

func CompleteOrder(c *gin.Context) {
	updateOrderStatus(c, "prepared", "Order marked as prepared")
}

func updateOrderStatus(c *gin.Context, status, message string) {
	orderID := c.Param("id")
	oid, err := bson.ObjectIDFromHex(orderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.OrderResponse{Success: false, Message: "Invalid order ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err = ordersCol().UpdateOne(ctx,
		bson.D{{Key: "_id", Value: oid}},
		bson.D{{Key: "$set", Value: bson.D{
			{Key: "status", Value: status},
			{Key: "updatedAt", Value: bson.NewDateTimeFromTime(time.Now().UTC())},
		}}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.OrderResponse{Success: false, Message: "Failed to update order"})
		return
	}
	c.JSON(http.StatusOK, models.OrderResponse{Success: true, Message: message})
}

// ── POST /api/menu/items (admin) ──────────────────────────────────────────────

func AddMenuItem(c *gin.Context) {
	var req models.CreateMenuItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.OrderResponse{Success: false, Message: "Invalid request body"})
		return
	}
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, models.OrderResponse{Success: false, Message: "Menu item name is required"})
		return
	}
	if req.Price < 0 {
		c.JSON(http.StatusBadRequest, models.OrderResponse{Success: false, Message: "Price cannot be negative"})
		return
	}
	if req.Section == "" {
		c.JSON(http.StatusBadRequest, models.OrderResponse{Success: false, Message: "Section is required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	item := bson.D{
		{Key: "name", Value: req.Name},
		{Key: "description", Value: req.Description},
		{Key: "price", Value: req.Price},
		{Key: "section", Value: req.Section},
		{Key: "subsection", Value: req.Subsection},
		{Key: "createdAt", Value: bson.NewDateTimeFromTime(time.Now().UTC())},
		{Key: "customizations", Value: req.Customizations},
	}
	if _, err := menuCol().InsertOne(ctx, item); err != nil {
		c.JSON(http.StatusInternalServerError, models.OrderResponse{Success: false, Message: "Failed to insert menu item"})
		return
	}
	c.JSON(http.StatusOK, models.OrderResponse{Success: true, Message: "Menu item created successfully"})
}

// ── Analytics ─────────────────────────────────────────────────────────────────

// AnalyticsSales godoc
// GET /api/analytics/sales (admin)
func AnalyticsSales(c *gin.Context) {
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	matchDoc := bson.D{
		{Key: "status", Value: bson.D{{Key: "$in", Value: bson.A{"confirmed", "prepared"}}}},
	}
	matchDoc = applyDateFilter(matchDoc, "createdAt", dateFrom, dateTo)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: matchDoc}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: nil},
			{Key: "total_sales", Value: bson.D{{Key: "$sum", Value: "$total"}}},
			{Key: "order_count", Value: bson.D{{Key: "$sum", Value: 1}}},
		}}},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := ordersCol().Aggregate(ctx, pipeline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer cursor.Close(ctx)

	var totalSales float64
	var totalOrders uint32
	if cursor.Next(ctx) {
		var result bson.M
		if err := cursor.Decode(&result); err == nil {
			if v, ok := result["total_sales"]; ok {
				switch val := v.(type) {
				case float64:
					totalSales = val
				case int32:
					totalSales = float64(val)
				case int64:
					totalSales = float64(val)
				}
			}
			if v, ok := result["order_count"]; ok {
				switch val := v.(type) {
				case int32:
					totalOrders = uint32(val)
				case int64:
					totalOrders = uint32(val)
				case float64:
					totalOrders = uint32(val)
				}
			}
		}
	}

	avg := 0.0
	if totalOrders > 0 {
		avg = totalSales / float64(totalOrders)
	}

	c.JSON(http.StatusOK, models.SalesAnalytics{
		TotalSales:        totalSales,
		TotalOrders:       totalOrders,
		AverageOrderValue: avg,
		DailySales:        []models.SalesData{},
	})
}

// AnalyticsCustomizations godoc
// GET /api/analytics/customizations (admin)
func AnalyticsCustomizations(c *gin.Context) {
	c.JSON(http.StatusOK, []models.CustomizationPopularity{})
}

// AnalyticsMenuItems godoc
// GET /api/analytics/menu-items (admin)
func AnalyticsMenuItems(c *gin.Context) {
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	matchDoc := bson.D{
		{Key: "status", Value: bson.D{{Key: "$in", Value: bson.A{"confirmed", "prepared"}}}},
	}
	matchDoc = applyDateFilter(matchDoc, "createdAt", dateFrom, dateTo)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: matchDoc}},
		{{Key: "$unwind", Value: "$items"}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$items.name"},
			{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
			{Key: "total_revenue", Value: bson.D{{Key: "$sum", Value: "$items.final_price"}}},
			{Key: "avg_price", Value: bson.D{{Key: "$avg", Value: "$items.final_price"}}},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "total_revenue", Value: -1}}}},
		{{Key: "$limit", Value: 10}},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := ordersCol().Aggregate(ctx, pipeline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer cursor.Close(ctx)

	var items []models.MenuItemPopularity
	for cursor.Next(ctx) {
		var result bson.M
		if err := cursor.Decode(&result); err != nil {
			continue
		}
		name, _ := result["_id"].(string)
		if name == "" {
			continue
		}
		item := models.MenuItemPopularity{ItemName: name}
		if v, ok := result["count"]; ok {
			switch val := v.(type) {
			case int32:
				item.TimesOrdered = uint32(val)
			case int64:
				item.TimesOrdered = uint32(val)
			}
		}
		if v, ok := result["total_revenue"].(float64); ok {
			item.TotalRevenue = v
		}
		if v, ok := result["avg_price"].(float64); ok {
			item.AverageFinalPrice = v
		}
		items = append(items, item)
	}
	if items == nil {
		items = []models.MenuItemPopularity{}
	}
	c.JSON(http.StatusOK, items)
}

// ── GET /api/completed-orders (admin) ─────────────────────────────────────────

func GetCompletedOrders(c *gin.Context) {
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	filter := bson.D{{Key: "status", Value: "prepared"}}
	filter = applyDateFilter(filter, "createdAt", dateFrom, dateTo)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := ordersCol().Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer cursor.Close(ctx)

	var orders []models.OrderDetails
	for cursor.Next(ctx) {
		var raw bson.M
		if err := cursor.Decode(&raw); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Decode error"})
			return
		}
		qr := rawToOrderQueryResponse(raw)
		od := models.OrderDetails{
			ID:        qr.ID,
			Name:      qr.Name,
			Items:     qr.Items,
			Total:     qr.Total,
			Status:    qr.Status,
			CreatedAt: qr.CreatedAt,
		}
		if updatedAt, ok := raw["updatedAt"]; ok && updatedAt != nil {
			s := bsonTimeToRFC3339(updatedAt)
			if s != "" {
				od.UpdatedAt = &s
			}
		}
		orders = append(orders, od)
	}
	if orders == nil {
		orders = []models.OrderDetails{}
	}
	c.JSON(http.StatusOK, orders)
}

// ── helpers ───────────────────────────────────────────────────────────────────

// applyDateFilter appends a date range condition to an existing bson.D filter.
func applyDateFilter(filter bson.D, field, dateFrom, dateTo string) bson.D {
	if dateFrom == "" && dateTo == "" {
		return filter
	}
	dateDoc := bson.D{}
	if dateFrom != "" {
		if t, err := time.Parse(time.RFC3339, dateFrom); err == nil {
			dateDoc = append(dateDoc, bson.E{Key: "$gte", Value: bson.NewDateTimeFromTime(t)})
		}
	}
	if dateTo != "" {
		if t, err := time.Parse(time.RFC3339, dateTo); err == nil {
			dateDoc = append(dateDoc, bson.E{Key: "$lte", Value: bson.NewDateTimeFromTime(t)})
		}
	}
	if len(dateDoc) > 0 {
		filter = append(filter, bson.E{Key: field, Value: dateDoc})
	}
	return filter
}

// rawToOrderQueryResponse converts a raw bson.M order document to an OrderQueryResponse.
func rawToOrderQueryResponse(raw bson.M) models.OrderQueryResponse {
	id := ""
	if oid, ok := raw["_id"].(bson.ObjectID); ok {
		id = oid.Hex()
	}
	name, _ := raw["name"].(string)
	total, _ := raw["total"].(float64)
	status, _ := raw["status"].(string)

	createdAt := ""
	if v, ok := raw["createdAt"]; ok {
		createdAt = bsonTimeToRFC3339(v)
	}

	var items []models.OrderItemResponse
	if rawItems, ok := raw["items"].(bson.A); ok {
		for _, ri := range rawItems {
			if itemMap, ok := ri.(bson.M); ok {
				items = append(items, rawToOrderItemResponse(itemMap))
			}
		}
	}
	if items == nil {
		items = []models.OrderItemResponse{}
	}

	return models.OrderQueryResponse{
		ID:        id,
		Name:      name,
		Items:     items,
		Total:     total,
		Status:    status,
		CreatedAt: createdAt,
	}
}

func rawToOrderItemResponse(m bson.M) models.OrderItemResponse {
	name, _ := m["name"].(string)
	basePrice, _ := m["base_price"].(float64)
	finalPrice, _ := m["final_price"].(float64)
	note, _ := m["note"].(string)

	completed := false
	if v, ok := m["completed"]; ok && v != nil {
		if b, ok := v.(bool); ok {
			completed = b
		}
	}

	var section *string
	if s, ok := m["section"].(string); ok && s != "" {
		section = &s
	}
	var subsection *string
	if s, ok := m["subsection"].(string); ok && s != "" {
		subsection = &s
	}

	return models.OrderItemResponse{
		Name:       name,
		BasePrice:  basePrice,
		FinalPrice: finalPrice,
		Selections: map[string]*models.Selection{},
		Note:       note,
		Section:    section,
		Subsection: subsection,
		Completed:  completed,
	}
}
