package dto

import "github.com/google/uuid"

// BulkAddBlocksRequest represents a request to add multiple content items as newsletter blocks
type BulkAddBlocksRequest struct {
	ContentItemIDs []uuid.UUID `json:"content_item_ids" validate:"required,min=1,max=20,dive,required"`
	BlockType      string      `json:"block_type" validate:"required,oneof=hero news content events spotlight"`
}

// BulkAddBlocksResponse represents the response from bulk adding blocks
type BulkAddBlocksResponse struct {
	Blocks       []NewsletterBlockDTO `json:"blocks"`
	CreatedCount int                  `json:"created_count"`
	SkippedCount int                  `json:"skipped_count"`
	SkippedIDs   []uuid.UUID          `json:"skipped_ids,omitempty"`
}

// NewsletterBlockDTO represents a newsletter block in API responses
type NewsletterBlockDTO struct {
	ID            uuid.UUID  `json:"id"`
	IssueID       uuid.UUID  `json:"issue_id"`
	ContentItemID *uuid.UUID `json:"content_item_id,omitempty"`
	BlockType     string     `json:"block_type"`
	Position      int        `json:"position"`
	Title         *string    `json:"title,omitempty"`
	Teaser        *string    `json:"teaser,omitempty"`
	CTALabel      *string    `json:"cta_label,omitempty"`
	CTAURL        *string    `json:"cta_url,omitempty"`
	IsPromotional bool       `json:"is_promotional"`
	TopicTags     []string   `json:"topic_tags,omitempty"`
	Clicks        int        `json:"clicks"`
	CreatedAt     string     `json:"created_at"`
	UpdatedAt     string     `json:"updated_at"`
}
