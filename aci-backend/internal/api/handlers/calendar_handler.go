package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// CalendarHandler handles calendar-related HTTP requests for the Content Calendar feature
type CalendarHandler struct {
	calendarRepo repository.CalendarEntryRepository
	contentRepo  repository.ContentItemRepository
}

// NewCalendarHandler creates a new calendar handler
func NewCalendarHandler(
	calendarRepo repository.CalendarEntryRepository,
	contentRepo repository.ContentItemRepository,
) *CalendarHandler {
	if calendarRepo == nil {
		panic("calendarRepo cannot be nil")
	}
	if contentRepo == nil {
		panic("contentRepo cannot be nil")
	}

	return &CalendarHandler{
		calendarRepo: calendarRepo,
		contentRepo:  contentRepo,
	}
}

// ============================================================================
// Request/Response DTOs
// ============================================================================

// CalendarEntryDTO represents a calendar entry in API responses
type CalendarEntryDTO struct {
	ID          string              `json:"id"`
	CampaignID  *string             `json:"campaign_id,omitempty"`
	ContentID   *string             `json:"content_id,omitempty"`
	Channel     string              `json:"channel"`
	ScheduledAt string              `json:"scheduled_at"`
	Status      string              `json:"status"`
	Content     *ContentSummaryDTO  `json:"content,omitempty"`
	CreatedAt   string              `json:"created_at"`
	UpdatedAt   string              `json:"updated_at"`
	PublishedAt *string             `json:"published_at,omitempty"`
}

// ContentSummaryDTO represents a summary of content for calendar display
type ContentSummaryDTO struct {
	Title      string `json:"title"`
	Preview    string `json:"preview"`
	BrandScore int    `json:"brand_score"`
}

// UpdateCalendarEntryRequest represents the request body for updating a calendar entry
type UpdateCalendarEntryRequest struct {
	ScheduledAt string `json:"scheduled_at"`
}

// CalendarViewResponse represents a calendar view with entries and summary
type CalendarViewResponse struct {
	StartDate string                  `json:"start_date"`
	EndDate   string                  `json:"end_date"`
	Entries   []CalendarEntryDTO      `json:"entries"`
	Summary   CalendarSummaryResponse `json:"summary"`
}

// CalendarSummaryResponse represents aggregate statistics for a calendar view
type CalendarSummaryResponse struct {
	TotalEntries     int            `json:"total_entries"`
	ByChannel        map[string]int `json:"by_channel"`
	ByStatus         map[string]int `json:"by_status"`
	UpcomingToday    int            `json:"upcoming_today"`
	UpcomingThisWeek int            `json:"upcoming_this_week"`
}

// ============================================================================
// Handlers
// ============================================================================

// GetCalendar returns calendar entries for a date range
// GET /api/v1/calendar
// Query params: start_date, end_date, channel (optional), status (optional), page, page_size
func (h *CalendarHandler) GetCalendar(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get tenant ID from context
	tenantID, err := getTenantID(ctx)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get tenant ID")
		response.Unauthorized(w, "Invalid authentication")
		return
	}

	// Parse query parameters
	startDateStr := r.URL.Query().Get("start_date")
	endDateStr := r.URL.Query().Get("end_date")
	channelStr := r.URL.Query().Get("channel")
	statusStr := r.URL.Query().Get("status")
	pageStr := r.URL.Query().Get("page")
	pageSizeStr := r.URL.Query().Get("page_size")

	// Validate and parse required date parameters
	if startDateStr == "" {
		response.BadRequest(w, "start_date is required")
		return
	}

	if endDateStr == "" {
		response.BadRequest(w, "end_date is required")
		return
	}

	startDate, err := time.Parse(time.RFC3339, startDateStr)
	if err != nil {
		response.BadRequest(w, "invalid start_date format (use ISO 8601)")
		return
	}

	endDate, err := time.Parse(time.RFC3339, endDateStr)
	if err != nil {
		response.BadRequest(w, "invalid end_date format (use ISO 8601)")
		return
	}

	// Validate date range
	if endDate.Before(startDate) {
		response.BadRequest(w, "end_date must be after start_date")
		return
	}

	// Build filter
	filter := &domain.CalendarFilter{
		TenantID:  tenantID,
		StartDate: &startDate,
		EndDate:   &endDate,
		Page:      0,
		PageSize:  100, // Default page size
	}

	// Parse optional channel filter
	if channelStr != "" {
		channel := domain.Channel(channelStr)
		if !channel.IsValid() {
			response.BadRequest(w, fmt.Sprintf("invalid channel: %s", channelStr))
			return
		}
		filter.Channel = &channel
	}

	// Parse optional status filter
	if statusStr != "" {
		status := domain.PublishingStatus(statusStr)
		if !status.IsValid() {
			response.BadRequest(w, fmt.Sprintf("invalid status: %s", statusStr))
			return
		}
		filter.Status = &status
	}

	// Parse pagination parameters
	if pageStr != "" {
		page, err := strconv.Atoi(pageStr)
		if err != nil || page < 0 {
			response.BadRequest(w, "invalid page parameter")
			return
		}
		filter.Page = page
	}

	if pageSizeStr != "" {
		pageSize, err := strconv.Atoi(pageSizeStr)
		if err != nil || pageSize <= 0 || pageSize > 1000 {
			response.BadRequest(w, "invalid page_size parameter (must be 1-1000)")
			return
		}
		filter.PageSize = pageSize
	}

	// Validate filter
	if err := filter.Validate(); err != nil {
		response.BadRequest(w, fmt.Sprintf("invalid filter: %v", err))
		return
	}

	// Get calendar entries
	entries, totalCount, err := h.calendarRepo.List(ctx, filter)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to list calendar entries")
		response.InternalError(w, "Failed to retrieve calendar entries", requestID)
		return
	}

	// Load content details for entries with content_id
	entryDTOs := make([]CalendarEntryDTO, 0, len(entries))
	for _, entry := range entries {
		dto := h.mapCalendarEntryToDTO(ctx, entry)
		entryDTOs = append(entryDTOs, dto)
	}

	// Build summary
	summary := h.buildCalendarSummary(entries, time.Now())

	// Build response with pagination
	viewResp := CalendarViewResponse{
		StartDate: startDate.Format(time.RFC3339),
		EndDate:   endDate.Format(time.RFC3339),
		Entries:   entryDTOs,
		Summary:   summary,
	}

	meta := &response.Meta{
		Page:       filter.Page,
		PageSize:   filter.PageSize,
		TotalCount: totalCount,
		TotalPages: (totalCount + filter.PageSize - 1) / filter.PageSize,
	}

	response.SuccessWithMeta(w, viewResp, meta)
}

// UpdateCalendarEntry reschedules a calendar entry
// PUT /api/v1/calendar/:id
// Body: { "scheduled_at": "2024-01-15T09:00:00Z" }
func (h *CalendarHandler) UpdateCalendarEntry(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse entry ID from URL
	entryIDStr := chi.URLParam(r, "id")
	entryID, err := uuid.Parse(entryIDStr)
	if err != nil {
		response.BadRequest(w, "invalid calendar entry ID format")
		return
	}

	// Parse request body
	var req UpdateCalendarEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate scheduled_at
	if req.ScheduledAt == "" {
		response.BadRequest(w, "scheduled_at is required")
		return
	}

	scheduledAt, err := time.Parse(time.RFC3339, req.ScheduledAt)
	if err != nil {
		response.BadRequest(w, "invalid scheduled_at format (use ISO 8601)")
		return
	}

	// Validate scheduled time is in the future
	if scheduledAt.Before(time.Now().Add(-time.Minute)) {
		response.BadRequest(w, "scheduled_at must be in the future")
		return
	}

	// Get existing entry to verify ownership and state
	entry, err := h.calendarRepo.GetByID(ctx, entryID)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get calendar entry")
		response.NotFound(w, "Calendar entry not found")
		return
	}

	// Verify tenant ownership
	tenantID, err := getTenantID(ctx)
	if err != nil || entry.TenantID != tenantID {
		log.Warn().
			Str("request_id", requestID).
			Str("entry_id", entryID.String()).
			Msg("Unauthorized calendar entry access attempt")
		response.Forbidden(w, "Access denied")
		return
	}

	// Verify entry can be rescheduled
	if !entry.CanReschedule() {
		response.BadRequest(w, fmt.Sprintf("cannot reschedule entry with status %s", entry.Status))
		return
	}

	// Reschedule the entry
	if err := entry.Reschedule(scheduledAt); err != nil {
		response.BadRequest(w, fmt.Sprintf("failed to reschedule: %v", err))
		return
	}

	// Update in repository
	if err := h.calendarRepo.Update(ctx, entry); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to update calendar entry")
		response.InternalError(w, "Failed to update calendar entry", requestID)
		return
	}

	// Build response
	dto := h.mapCalendarEntryToDTO(ctx, entry)
	response.Success(w, dto)
}

// CancelCalendarEntry cancels a scheduled entry
// DELETE /api/v1/calendar/:id
func (h *CalendarHandler) CancelCalendarEntry(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse entry ID from URL
	entryIDStr := chi.URLParam(r, "id")
	entryID, err := uuid.Parse(entryIDStr)
	if err != nil {
		response.BadRequest(w, "invalid calendar entry ID format")
		return
	}

	// Get existing entry to verify ownership and state
	entry, err := h.calendarRepo.GetByID(ctx, entryID)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get calendar entry")
		response.NotFound(w, "Calendar entry not found")
		return
	}

	// Verify tenant ownership
	tenantID, err := getTenantID(ctx)
	if err != nil || entry.TenantID != tenantID {
		log.Warn().
			Str("request_id", requestID).
			Str("entry_id", entryID.String()).
			Msg("Unauthorized calendar entry cancel attempt")
		response.Forbidden(w, "Access denied")
		return
	}

	// Verify entry can be cancelled
	if !entry.CanCancel() {
		response.BadRequest(w, fmt.Sprintf("cannot cancel entry with status %s", entry.Status))
		return
	}

	// Cancel the entry
	if err := entry.Cancel(); err != nil {
		response.BadRequest(w, fmt.Sprintf("failed to cancel: %v", err))
		return
	}

	// Update in repository
	if err := h.calendarRepo.Update(ctx, entry); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to cancel calendar entry")
		response.InternalError(w, "Failed to cancel calendar entry", requestID)
		return
	}

	// Return 204 No Content on successful cancellation
	response.NoContent(w)
}

// ============================================================================
// Helper Functions
// ============================================================================

// mapCalendarEntryToDTO converts a domain CalendarEntry to a DTO
func (h *CalendarHandler) mapCalendarEntryToDTO(ctx context.Context, entry *domain.CalendarEntry) CalendarEntryDTO {
	dto := CalendarEntryDTO{
		ID:          entry.ID.String(),
		Channel:     string(entry.Channel),
		ScheduledAt: entry.ScheduledAt.Format(time.RFC3339),
		Status:      string(entry.Status),
		CreatedAt:   entry.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   entry.UpdatedAt.Format(time.RFC3339),
	}

	// Add optional campaign ID
	if entry.CampaignID != nil {
		campaignIDStr := entry.CampaignID.String()
		dto.CampaignID = &campaignIDStr
	}

	// Add optional content ID
	if entry.ContentID != nil {
		contentIDStr := entry.ContentID.String()
		dto.ContentID = &contentIDStr

		// Load content details if available
		if content, err := h.contentRepo.GetByID(ctx, *entry.ContentID); err == nil && content != nil {
			preview := ""
			if content.Summary != nil {
				preview = truncateString(*content.Summary, 200)
			}

			dto.Content = &ContentSummaryDTO{
				Title:      content.Title,
				Preview:    preview,
				BrandScore: 0, // Content items don't have brand scores
			}
		}
	}

	// Add optional published timestamp
	if entry.PublishedAt != nil {
		publishedAtStr := entry.PublishedAt.Format(time.RFC3339)
		dto.PublishedAt = &publishedAtStr
	}

	return dto
}

// buildCalendarSummary creates aggregate statistics for calendar entries
func (h *CalendarHandler) buildCalendarSummary(entries []*domain.CalendarEntry, now time.Time) CalendarSummaryResponse {
	summary := CalendarSummaryResponse{
		TotalEntries: len(entries),
		ByChannel:    make(map[string]int),
		ByStatus:     make(map[string]int),
	}

	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	todayEnd := todayStart.Add(24 * time.Hour)
	weekEnd := todayStart.Add(7 * 24 * time.Hour)

	for _, entry := range entries {
		// Count by channel
		summary.ByChannel[string(entry.Channel)]++

		// Count by status
		summary.ByStatus[string(entry.Status)]++

		// Only count scheduled entries for upcoming stats
		if entry.Status != domain.StatusScheduled {
			continue
		}

		// Count upcoming today
		if entry.ScheduledAt.After(todayStart) && entry.ScheduledAt.Before(todayEnd) {
			summary.UpcomingToday++
		}

		// Count upcoming this week
		if entry.ScheduledAt.After(todayStart) && entry.ScheduledAt.Before(weekEnd) {
			summary.UpcomingThisWeek++
		}
	}

	return summary
}


