package models

import "encoding/json"

// ── Auth ──────────────────────────────────────────────────────────────────────

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
}

type ApiResponse[T any] struct {
	Success bool    `json:"success"`
	Data    *T      `json:"data,omitempty"`
	Error   *string `json:"error,omitempty"`
}

func Ok[T any](data T) ApiResponse[T] {
	return ApiResponse[T]{Success: true, Data: &data}
}

func Err(msg string) ApiResponse[string] {
	return ApiResponse[string]{Success: false, Error: &msg}
}

// ── Order / Menu structs ──────────────────────────────────────────────────────

type CustomizationOption struct {
	Value string  `json:"value" bson:"value"`
	Label string  `json:"label" bson:"label"`
	Price float64 `json:"price" bson:"price"`
}

// CustomizationType is "single" or "multiple"
type CustomizationType string

const (
	CustomizationTypeSingle   CustomizationType = "single"
	CustomizationTypeMultiple CustomizationType = "multiple"
)

type Customization struct {
	ID       string                `json:"id"    bson:"id"`
	Label    string                `json:"label" bson:"label"`
	Kind     CustomizationType     `json:"type"  bson:"type"`
	Required bool                  `json:"required" bson:"required"`
	Options  []CustomizationOption `json:"options" bson:"options"`
}

// Selection holds either a single string or a slice of strings.
// JSON: "value" for Single, ["v1","v2"] for Multiple.
type Selection struct {
	Single   *string  // non-nil when single choice
	Multiple []string // non-nil when multiple
}

func (s Selection) MarshalJSON() ([]byte, error) {
	if s.Single != nil {
		return json.Marshal(*s.Single)
	}
	return json.Marshal(s.Multiple)
}

func (s *Selection) UnmarshalJSON(b []byte) error {
	// Try string first
	var str string
	if err := json.Unmarshal(b, &str); err == nil {
		s.Single = &str
		return nil
	}
	// Then array
	var arr []string
	if err := json.Unmarshal(b, &arr); err != nil {
		return err
	}
	s.Multiple = arr
	return nil
}

type CartItem struct {
	ID             string                `json:"id"`
	Name           string                `json:"name"`
	Price          float64               `json:"price"`
	Description    *string               `json:"description,omitempty"`
	Section        string                `json:"section"`
	Subsection     *string               `json:"subsection,omitempty"`
	Customizations []Customization       `json:"customizations,omitempty"`
	Note           *string               `json:"note,omitempty"`
	Selections     map[string]*Selection `json:"selections,omitempty"`
}

// ValidatedItem is stored in MongoDB.
type ValidatedItem struct {
	Name        string                `json:"name"        bson:"name"`
	BasePrice   float64               `json:"base_price"  bson:"base_price"`
	FinalPrice  float64               `json:"final_price" bson:"final_price"`
	Selections  map[string]*Selection `json:"selections"  bson:"selections"`
	Note        string                `json:"note"        bson:"note"`
	Section     string                `json:"section"     bson:"section"`
	Subsection  *string               `json:"subsection,omitempty" bson:"subsection,omitempty"`
	Completed   *bool                 `json:"completed,omitempty"  bson:"completed,omitempty"`
}

type Order struct {
	ID        interface{}     `json:"-"           bson:"_id,omitempty"`
	Name      string          `json:"name"        bson:"name"`
	Items     []ValidatedItem `json:"items"       bson:"items"`
	Total     float64         `json:"total"       bson:"total"`
	Status    string          `json:"status"      bson:"status"`
	CreatedAt interface{}     `json:"createdAt"   bson:"createdAt"`
	UpdatedAt interface{}     `json:"updatedAt,omitempty" bson:"updatedAt,omitempty"`
}

type MenuItem struct {
	ID             interface{}     `json:"-"                    bson:"_id,omitempty"`
	Name           string          `json:"name"                 bson:"name"`
	Description    *string         `json:"description,omitempty" bson:"description,omitempty"`
	Price          float64         `json:"price"                bson:"price"`
	Section        string          `json:"section"              bson:"section"`
	Subsection     *string         `json:"subsection,omitempty" bson:"subsection,omitempty"`
	CreatedAt      interface{}     `json:"createdAt,omitempty"  bson:"createdAt,omitempty"`
	Customizations []Customization `json:"customizations,omitempty" bson:"customizations,omitempty"`
}

// ── Request / Response structs ────────────────────────────────────────────────

type CreateOrderRequest struct {
	Name  string     `json:"name"`
	Items []CartItem `json:"items"`
}

type OrderResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

type CreateMenuItemRequest struct {
	Name           string          `json:"name"`
	Description    *string         `json:"description,omitempty"`
	Price          float64         `json:"price"`
	Section        string          `json:"section"`
	Subsection     *string         `json:"subsection,omitempty"`
	Customizations []Customization `json:"customizations,omitempty"`
}

type MenuItemResponse struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Description    string          `json:"description"`
	Price          float64         `json:"price"`
	Section        string          `json:"section"`
	Subsection     *string         `json:"subsection,omitempty"`
	CreatedAt      string          `json:"createdAt"`
	Customizations []Customization `json:"customizations"`
}

type OrderItemResponse struct {
	Name       string                `json:"name"`
	BasePrice  float64               `json:"base_price"`
	FinalPrice float64               `json:"final_price"`
	Selections map[string]*Selection `json:"selections"`
	Note       string                `json:"note"`
	Section    *string               `json:"section,omitempty"`
	Subsection *string               `json:"subsection,omitempty"`
	Completed  bool                  `json:"completed"`
}

type OrderQueryResponse struct {
	ID        string              `json:"id"`
	Name      string              `json:"name"`
	Items     []OrderItemResponse `json:"items"`
	Total     float64             `json:"total"`
	Status    string              `json:"status"`
	CreatedAt string              `json:"created_at"`
}

type OrderDetails struct {
	ID        string              `json:"id"`
	Name      string              `json:"name"`
	Items     []OrderItemResponse `json:"items"`
	Total     float64             `json:"total"`
	Status    string              `json:"status"`
	CreatedAt string              `json:"created_at"`
	UpdatedAt *string             `json:"updated_at,omitempty"`
}

// ── Analytics ─────────────────────────────────────────────────────────────────

type SalesData struct {
	Date               string  `json:"date"`
	TotalSales         float64 `json:"total_sales"`
	OrderCount         uint32  `json:"order_count"`
	AverageOrderValue  float64 `json:"average_order_value"`
}

type SalesAnalytics struct {
	TotalSales        float64     `json:"total_sales"`
	TotalOrders       uint32      `json:"total_orders"`
	AverageOrderValue float64     `json:"average_order_value"`
	DailySales        []SalesData `json:"daily_sales"`
}

type CustomizationPopularity struct {
	CustomizationID    string `json:"customization_id"`
	CustomizationLabel string `json:"customization_label"`
	TimesSelected      uint32 `json:"times_selected"`
	MostPopularOption  string `json:"most_popular_option"`
}

type MenuItemPopularity struct {
	ItemName          string  `json:"item_name"`
	TimesOrdered      uint32  `json:"times_ordered"`
	TotalRevenue      float64 `json:"total_revenue"`
	AverageFinalPrice float64 `json:"average_final_price"`
}
