package dto

import (
	"time"

	"github.com/phillipboles/aci-backend/internal/domain"
)

// Request DTOs

// CreateNewsletterConfigRequest represents the request body for creating a newsletter configuration
type CreateNewsletterConfigRequest struct {
	Name                 string                      `json:"name" validate:"required,min=1,max=200"`
	Description          *string                     `json:"description,omitempty" validate:"omitempty,max=1000"`
	SegmentID            *string                     `json:"segment_id,omitempty" validate:"omitempty,uuid"`
	Cadence              string                      `json:"cadence" validate:"required,oneof=weekly bi-weekly monthly"`
	SendDayOfWeek        *int                        `json:"send_day_of_week,omitempty" validate:"omitempty,min=0,max=6"`
	SendTimeUTC          *string                     `json:"send_time_utc,omitempty" validate:"omitempty"`
	Timezone             string                      `json:"timezone" validate:"required"`
	MaxBlocks            int                         `json:"max_blocks" validate:"required,min=1,max=10"`
	EducationRatioMin    float64                     `json:"education_ratio_min" validate:"required,min=0,max=1"`
	ContentFreshnessDays int                         `json:"content_freshness_days" validate:"required,min=1"`
	HeroTopicPriority    *string                     `json:"hero_topic_priority,omitempty" validate:"omitempty,max=200"`
	FrameworkFocus       *string                     `json:"framework_focus,omitempty" validate:"omitempty,max=200"`
	SubjectLineStyle     string                      `json:"subject_line_style" validate:"required,oneof=pain_first opportunity_first visionary"`
	MaxMetaphors         int                         `json:"max_metaphors" validate:"required,min=0"`
	BannedPhrases        []string                    `json:"banned_phrases,omitempty"`
	ApprovalTier         string                      `json:"approval_tier" validate:"required,oneof=tier1 tier2"`
	RiskLevel            string                      `json:"risk_level" validate:"required,oneof=standard high experimental"`
	AIProvider           string                      `json:"ai_provider" validate:"required,min=1,max=100"`
	AIModel              string                      `json:"ai_model" validate:"required,min=1,max=100"`
	PromptVersion        int                         `json:"prompt_version" validate:"required,min=1"`
}

// UpdateNewsletterConfigRequest represents the request body for updating a newsletter configuration
type UpdateNewsletterConfigRequest struct {
	Name                 *string  `json:"name,omitempty" validate:"omitempty,min=1,max=200"`
	Description          *string  `json:"description,omitempty" validate:"omitempty,max=1000"`
	SegmentID            *string  `json:"segment_id,omitempty" validate:"omitempty,uuid"`
	Cadence              *string  `json:"cadence,omitempty" validate:"omitempty,oneof=weekly bi-weekly monthly"`
	SendDayOfWeek        *int     `json:"send_day_of_week,omitempty" validate:"omitempty,min=0,max=6"`
	SendTimeUTC          *string  `json:"send_time_utc,omitempty"`
	Timezone             *string  `json:"timezone,omitempty" validate:"omitempty,min=1"`
	MaxBlocks            *int     `json:"max_blocks,omitempty" validate:"omitempty,min=1,max=10"`
	EducationRatioMin    *float64 `json:"education_ratio_min,omitempty" validate:"omitempty,min=0,max=1"`
	ContentFreshnessDays *int     `json:"content_freshness_days,omitempty" validate:"omitempty,min=1"`
	HeroTopicPriority    *string  `json:"hero_topic_priority,omitempty" validate:"omitempty,max=200"`
	FrameworkFocus       *string  `json:"framework_focus,omitempty" validate:"omitempty,max=200"`
	SubjectLineStyle     *string  `json:"subject_line_style,omitempty" validate:"omitempty,oneof=pain_first opportunity_first visionary"`
	MaxMetaphors         *int     `json:"max_metaphors,omitempty" validate:"omitempty,min=0"`
	BannedPhrases        []string `json:"banned_phrases,omitempty"`
	ApprovalTier         *string  `json:"approval_tier,omitempty" validate:"omitempty,oneof=tier1 tier2"`
	RiskLevel            *string  `json:"risk_level,omitempty" validate:"omitempty,oneof=standard high experimental"`
	AIProvider           *string  `json:"ai_provider,omitempty" validate:"omitempty,min=1,max=100"`
	AIModel              *string  `json:"ai_model,omitempty" validate:"omitempty,min=1,max=100"`
	PromptVersion        *int     `json:"prompt_version,omitempty" validate:"omitempty,min=1"`
}

// CloneNewsletterConfigRequest represents the request body for cloning a configuration
type CloneNewsletterConfigRequest struct {
	Name string `json:"name" validate:"required,min=1,max=200"`
}

// Response DTOs

// NewsletterConfigResponse represents a newsletter configuration in API responses
type NewsletterConfigResponse struct {
	ID                   string   `json:"id"`
	Name                 string   `json:"name"`
	Description          *string  `json:"description,omitempty"`
	SegmentID            *string  `json:"segment_id,omitempty"`
	Cadence              string   `json:"cadence"`
	SendDayOfWeek        *int     `json:"send_day_of_week,omitempty"`
	SendTimeUTC          *string  `json:"send_time_utc,omitempty"`
	Timezone             string   `json:"timezone"`
	MaxBlocks            int      `json:"max_blocks"`
	EducationRatioMin    float64  `json:"education_ratio_min"`
	ContentFreshnessDays int      `json:"content_freshness_days"`
	HeroTopicPriority    *string  `json:"hero_topic_priority,omitempty"`
	FrameworkFocus       *string  `json:"framework_focus,omitempty"`
	SubjectLineStyle     string   `json:"subject_line_style"`
	MaxMetaphors         int      `json:"max_metaphors"`
	BannedPhrases        []string `json:"banned_phrases,omitempty"`
	ApprovalTier         string   `json:"approval_tier"`
	RiskLevel            string   `json:"risk_level"`
	AIProvider           string   `json:"ai_provider"`
	AIModel              string   `json:"ai_model"`
	PromptVersion        int      `json:"prompt_version"`
	IsActive             bool     `json:"is_active"`
	CreatedBy            string   `json:"created_by"`
	CreatedAt            string   `json:"created_at"`
	UpdatedAt            string   `json:"updated_at"`
}

// NewsletterConfigListResponse represents a paginated list of newsletter configurations
type NewsletterConfigListResponse struct {
	Data       []NewsletterConfigResponse `json:"data"`
	Pagination PaginationDTO              `json:"pagination"`
}

// Converter Functions

// NewsletterConfigToResponse converts a domain NewsletterConfiguration to NewsletterConfigResponse
func NewsletterConfigToResponse(config *domain.NewsletterConfiguration) NewsletterConfigResponse {
	if config == nil {
		return NewsletterConfigResponse{}
	}

	resp := NewsletterConfigResponse{
		ID:                   config.ID.String(),
		Name:                 config.Name,
		Description:          config.Description,
		Cadence:              string(config.Cadence),
		SendDayOfWeek:        config.SendDayOfWeek,
		Timezone:             config.Timezone,
		MaxBlocks:            config.MaxBlocks,
		EducationRatioMin:    config.EducationRatioMin,
		ContentFreshnessDays: config.ContentFreshnessDays,
		HeroTopicPriority:    config.HeroTopicPriority,
		FrameworkFocus:       config.FrameworkFocus,
		SubjectLineStyle:     string(config.SubjectLineStyle),
		MaxMetaphors:         config.MaxMetaphors,
		BannedPhrases:        config.BannedPhrases,
		ApprovalTier:         string(config.ApprovalTier),
		RiskLevel:            string(config.RiskLevel),
		AIProvider:           config.AIProvider,
		AIModel:              config.AIModel,
		PromptVersion:        config.PromptVersion,
		IsActive:             config.IsActive,
		CreatedBy:            config.CreatedBy.String(),
		CreatedAt:            config.CreatedAt.Format(time.RFC3339),
		UpdatedAt:            config.UpdatedAt.Format(time.RFC3339),
	}

	// Optional segment ID
	if config.SegmentID != nil {
		segmentIDStr := config.SegmentID.String()
		resp.SegmentID = &segmentIDStr
	}

	// Optional send time UTC
	if config.SendTimeUTC != nil {
		sendTimeStr := config.SendTimeUTC.Format(time.RFC3339)
		resp.SendTimeUTC = &sendTimeStr
	}

	// Ensure empty arrays are returned as empty arrays, not nil
	if resp.BannedPhrases == nil {
		resp.BannedPhrases = []string{}
	}

	return resp
}

// NewsletterConfigsToResponse converts multiple domain configs to response DTOs
func NewsletterConfigsToResponse(configs []*domain.NewsletterConfiguration) []NewsletterConfigResponse {
	if configs == nil {
		return []NewsletterConfigResponse{}
	}

	responses := make([]NewsletterConfigResponse, len(configs))
	for i, config := range configs {
		responses[i] = NewsletterConfigToResponse(config)
	}

	return responses
}

// Segment Request DTOs

// CreateSegmentRequest represents the request body for creating a segment
type CreateSegmentRequest struct {
	Name        string  `json:"name" validate:"required,min=1,max=255"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=2000"`

	// Segmentation Criteria - Firmographic
	RoleCluster          *string  `json:"role_cluster,omitempty" validate:"omitempty,max=100"`
	Industries           []string `json:"industries,omitempty"`
	Regions              []string `json:"regions,omitempty"`
	CompanySizeBands     []string `json:"company_size_bands,omitempty"`
	ComplianceFrameworks []string `json:"compliance_frameworks,omitempty"`
	PartnerTags          []string `json:"partner_tags,omitempty"`

	// Behavioral
	MinEngagementScore *float64 `json:"min_engagement_score,omitempty" validate:"omitempty,min=0,max=100"`
	TopicInterests     []string `json:"topic_interests,omitempty"`

	// Exclusions
	ExcludeUnsubscribed bool `json:"exclude_unsubscribed"`
	ExcludeBounced      bool `json:"exclude_bounced"`
	ExcludeHighTouch    bool `json:"exclude_high_touch"`

	// Frequency
	MaxNewslettersPer30Days int `json:"max_newsletters_per_30_days" validate:"required,min=0,max=100"`

	// Metadata
	IsActive bool `json:"is_active"`
}

// UpdateSegmentRequest represents the request body for updating a segment
type UpdateSegmentRequest struct {
	Name        string  `json:"name" validate:"required,min=1,max=255"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=2000"`

	// Segmentation Criteria - Firmographic
	RoleCluster          *string  `json:"role_cluster,omitempty" validate:"omitempty,max=100"`
	Industries           []string `json:"industries,omitempty"`
	Regions              []string `json:"regions,omitempty"`
	CompanySizeBands     []string `json:"company_size_bands,omitempty"`
	ComplianceFrameworks []string `json:"compliance_frameworks,omitempty"`
	PartnerTags          []string `json:"partner_tags,omitempty"`

	// Behavioral
	MinEngagementScore *float64 `json:"min_engagement_score,omitempty" validate:"omitempty,min=0,max=100"`
	TopicInterests     []string `json:"topic_interests,omitempty"`

	// Exclusions
	ExcludeUnsubscribed bool `json:"exclude_unsubscribed"`
	ExcludeBounced      bool `json:"exclude_bounced"`
	ExcludeHighTouch    bool `json:"exclude_high_touch"`

	// Frequency
	MaxNewslettersPer30Days int `json:"max_newsletters_per_30_days" validate:"required,min=0,max=100"`

	// Metadata
	IsActive bool `json:"is_active"`
}

// Segment Response DTOs

// SegmentResponse represents a segment in API responses
type SegmentResponse struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`

	// Segmentation Criteria - Firmographic
	RoleCluster          *string  `json:"role_cluster,omitempty"`
	Industries           []string `json:"industries,omitempty"`
	Regions              []string `json:"regions,omitempty"`
	CompanySizeBands     []string `json:"company_size_bands,omitempty"`
	ComplianceFrameworks []string `json:"compliance_frameworks,omitempty"`
	PartnerTags          []string `json:"partner_tags,omitempty"`

	// Behavioral
	MinEngagementScore *float64 `json:"min_engagement_score,omitempty"`
	TopicInterests     []string `json:"topic_interests,omitempty"`

	// Exclusions
	ExcludeUnsubscribed bool `json:"exclude_unsubscribed"`
	ExcludeBounced      bool `json:"exclude_bounced"`
	ExcludeHighTouch    bool `json:"exclude_high_touch"`

	// Frequency
	MaxNewslettersPer30Days int `json:"max_newsletters_per_30_days"`

	// Metadata
	ContactCount int    `json:"contact_count"`
	IsActive     bool   `json:"is_active"`
	CreatedBy    string `json:"created_by"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

// SegmentListResponse represents a paginated list of segments
type SegmentListResponse struct {
	Data       []SegmentResponse `json:"data"`
	Pagination PaginationDTO     `json:"pagination"`
}

// Contact Response DTOs

// InteractionDTO represents a single contact interaction event
type InteractionDTO struct {
	Type      string `json:"type"`
	Topic     string `json:"topic"`
	Timestamp string `json:"timestamp"`
}

// ContactResponse represents a contact in API responses
type ContactResponse struct {
	ID         string  `json:"id"`
	ExternalID *string `json:"external_id,omitempty"`
	Email      string  `json:"email"`

	// Firmographic
	FirstName       *string `json:"first_name,omitempty"`
	LastName        *string `json:"last_name,omitempty"`
	Company         *string `json:"company,omitempty"`
	JobTitle        *string `json:"job_title,omitempty"`
	RoleCategory    *string `json:"role_category,omitempty"`
	SeniorityBand   *string `json:"seniority_band,omitempty"`
	Industry        *string `json:"industry,omitempty"`
	Region          *string `json:"region,omitempty"`
	CompanySizeBand *string `json:"company_size_band,omitempty"`

	// Compliance
	PrimaryFramework    *string  `json:"primary_framework,omitempty"`
	SecondaryFrameworks []string `json:"secondary_frameworks,omitempty"`

	// Partner
	PartnerTags []string `json:"partner_tags,omitempty"`

	// Behavioral
	EngagementScore       float64            `json:"engagement_score"`
	Last10Interactions    []InteractionDTO   `json:"last_10_interactions,omitempty"`
	LastWebinarAttendance *string            `json:"last_webinar_attendance,omitempty"`
	TopicScores           map[string]float64 `json:"topic_scores,omitempty"`

	// Subscription
	IsSubscribed   bool    `json:"is_subscribed"`
	UnsubscribedAt *string `json:"unsubscribed_at,omitempty"`
	IsBounced      bool    `json:"is_bounced"`
	BouncedAt      *string `json:"bounced_at,omitempty"`
	IsHighTouch    bool    `json:"is_high_touch"`

	// Newsletter Tracking
	LastNewsletterSent    *string `json:"last_newsletter_sent,omitempty"`
	NewslettersSent30Days int     `json:"newsletters_sent_30_days"`

	// Segment
	PrimarySegmentID *string `json:"primary_segment_id,omitempty"`

	// Metadata
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// ContactListResponse represents a paginated list of contacts
type ContactListResponse struct {
	Data       []ContactResponse `json:"data"`
	Pagination PaginationDTO     `json:"pagination"`
}

// Segment Converter Functions

// SegmentToResponse converts a domain Segment to SegmentResponse
func SegmentToResponse(segment *domain.Segment) SegmentResponse {
	if segment == nil {
		return SegmentResponse{}
	}

	response := SegmentResponse{
		ID:                      segment.ID.String(),
		Name:                    segment.Name,
		ExcludeUnsubscribed:     segment.ExcludeUnsubscribed,
		ExcludeBounced:          segment.ExcludeBounced,
		ExcludeHighTouch:        segment.ExcludeHighTouch,
		MaxNewslettersPer30Days: segment.MaxNewslettersPer30Days,
		ContactCount:            segment.ContactCount,
		IsActive:                segment.IsActive,
		CreatedBy:               segment.CreatedBy.String(),
		CreatedAt:               segment.CreatedAt.Format(time.RFC3339),
		UpdatedAt:               segment.UpdatedAt.Format(time.RFC3339),
	}

	// Optional string fields
	if segment.Description != nil {
		response.Description = segment.Description
	}

	if segment.RoleCluster != nil {
		response.RoleCluster = segment.RoleCluster
	}

	if segment.MinEngagementScore != nil {
		response.MinEngagementScore = segment.MinEngagementScore
	}

	// Ensure empty slices are returned as empty arrays, not null
	if segment.Industries != nil {
		response.Industries = segment.Industries
	} else {
		response.Industries = []string{}
	}

	if segment.Regions != nil {
		response.Regions = segment.Regions
	} else {
		response.Regions = []string{}
	}

	if segment.CompanySizeBands != nil {
		response.CompanySizeBands = segment.CompanySizeBands
	} else {
		response.CompanySizeBands = []string{}
	}

	if segment.ComplianceFrameworks != nil {
		response.ComplianceFrameworks = segment.ComplianceFrameworks
	} else {
		response.ComplianceFrameworks = []string{}
	}

	if segment.PartnerTags != nil {
		response.PartnerTags = segment.PartnerTags
	} else {
		response.PartnerTags = []string{}
	}

	if segment.TopicInterests != nil {
		response.TopicInterests = segment.TopicInterests
	} else {
		response.TopicInterests = []string{}
	}

	return response
}

// SegmentsToResponse converts multiple domain segments to response DTOs
func SegmentsToResponse(segments []*domain.Segment) []SegmentResponse {
	if segments == nil {
		return []SegmentResponse{}
	}

	responses := make([]SegmentResponse, len(segments))
	for i, segment := range segments {
		responses[i] = SegmentToResponse(segment)
	}

	return responses
}

// Contact Converter Functions

// ContactToResponse converts a domain Contact to ContactResponse
func ContactToResponse(contact *domain.Contact) ContactResponse {
	if contact == nil {
		return ContactResponse{}
	}

	response := ContactResponse{
		ID:                    contact.ID.String(),
		Email:                 contact.Email,
		EngagementScore:       contact.EngagementScore,
		IsSubscribed:          contact.IsSubscribed,
		IsBounced:             contact.IsBounced,
		IsHighTouch:           contact.IsHighTouch,
		NewslettersSent30Days: contact.NewslettersSent30Days,
		CreatedAt:             contact.CreatedAt.Format(time.RFC3339),
		UpdatedAt:             contact.UpdatedAt.Format(time.RFC3339),
	}

	// Optional string fields
	if contact.ExternalID != nil {
		response.ExternalID = contact.ExternalID
	}

	if contact.FirstName != nil {
		response.FirstName = contact.FirstName
	}

	if contact.LastName != nil {
		response.LastName = contact.LastName
	}

	if contact.Company != nil {
		response.Company = contact.Company
	}

	if contact.JobTitle != nil {
		response.JobTitle = contact.JobTitle
	}

	if contact.RoleCategory != nil {
		response.RoleCategory = contact.RoleCategory
	}

	if contact.SeniorityBand != nil {
		response.SeniorityBand = contact.SeniorityBand
	}

	if contact.Industry != nil {
		response.Industry = contact.Industry
	}

	if contact.Region != nil {
		response.Region = contact.Region
	}

	if contact.CompanySizeBand != nil {
		response.CompanySizeBand = contact.CompanySizeBand
	}

	if contact.PrimaryFramework != nil {
		response.PrimaryFramework = contact.PrimaryFramework
	}

	// Optional slices
	if contact.SecondaryFrameworks != nil {
		response.SecondaryFrameworks = contact.SecondaryFrameworks
	} else {
		response.SecondaryFrameworks = []string{}
	}

	if contact.PartnerTags != nil {
		response.PartnerTags = contact.PartnerTags
	} else {
		response.PartnerTags = []string{}
	}

	// Convert interactions
	if contact.Last10Interactions != nil {
		response.Last10Interactions = make([]InteractionDTO, 0, len(contact.Last10Interactions))
		for _, interaction := range contact.Last10Interactions {
			response.Last10Interactions = append(response.Last10Interactions, InteractionDTO{
				Type:      interaction.Type,
				Topic:     interaction.Topic,
				Timestamp: interaction.Timestamp.Format(time.RFC3339),
			})
		}
	} else {
		response.Last10Interactions = []InteractionDTO{}
	}

	// Optional time fields
	if contact.LastWebinarAttendance != nil {
		lastWebinar := contact.LastWebinarAttendance.Format(time.RFC3339)
		response.LastWebinarAttendance = &lastWebinar
	}

	if contact.UnsubscribedAt != nil {
		unsubscribed := contact.UnsubscribedAt.Format(time.RFC3339)
		response.UnsubscribedAt = &unsubscribed
	}

	if contact.BouncedAt != nil {
		bounced := contact.BouncedAt.Format(time.RFC3339)
		response.BouncedAt = &bounced
	}

	if contact.LastNewsletterSent != nil {
		lastNewsletter := contact.LastNewsletterSent.Format(time.RFC3339)
		response.LastNewsletterSent = &lastNewsletter
	}

	if contact.PrimarySegmentID != nil {
		segmentID := contact.PrimarySegmentID.String()
		response.PrimarySegmentID = &segmentID
	}

	// Optional map
	if contact.TopicScores != nil {
		response.TopicScores = contact.TopicScores
	} else {
		response.TopicScores = map[string]float64{}
	}

	return response
}

// ContactsToResponse converts multiple domain contacts to response DTOs
func ContactsToResponse(contacts []*domain.Contact) []ContactResponse {
	if contacts == nil {
		return []ContactResponse{}
	}

	responses := make([]ContactResponse, len(contacts))
	for i, contact := range contacts {
		responses[i] = ContactToResponse(contact)
	}

	return responses
}
