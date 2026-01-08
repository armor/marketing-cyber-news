package domain

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// PublishingStatus represents the state of a scheduled calendar entry.
type PublishingStatus string

const (
	StatusScheduled PublishingStatus = "scheduled"
	StatusPublished PublishingStatus = "published"
	StatusFailed    PublishingStatus = "failed"
	StatusCancelled PublishingStatus = "cancelled"
)

// IsValid checks if the publishing status is valid.
func (s PublishingStatus) IsValid() bool {
	switch s {
	case StatusScheduled, StatusPublished, StatusFailed, StatusCancelled:
		return true
	default:
		return false
	}
}

// CalendarEntry represents a scheduled content publishing event.
// Each entry corresponds to a single piece of content scheduled for a specific channel and time.
type CalendarEntry struct {
	ID          uuid.UUID        `json:"id" db:"id"`
	TenantID    uuid.UUID        `json:"tenant_id" db:"tenant_id"`
	CampaignID  *uuid.UUID       `json:"campaign_id,omitempty" db:"campaign_id"`
	ContentID   *uuid.UUID       `json:"content_id,omitempty" db:"content_id"`
	Channel     Channel          `json:"channel" db:"channel"`
	ScheduledAt time.Time        `json:"scheduled_at" db:"scheduled_at"`
	Status      PublishingStatus `json:"status" db:"status"`
	CreatedAt   time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at" db:"updated_at"`
	PublishedAt *time.Time       `json:"published_at,omitempty" db:"published_at"`

	// Relationships - not persisted, populated via joins
	Content  *ContentItem `json:"content,omitempty" db:"-"`
	Campaign *Campaign    `json:"campaign,omitempty" db:"-"`
}

// CalendarEntryWithContent includes denormalized content data for efficient queries.
type CalendarEntryWithContent struct {
	CalendarEntry
	ContentTitle   string `json:"content_title,omitempty"`
	ContentPreview string `json:"content_preview,omitempty"`
	BrandScore     int    `json:"brand_score,omitempty"`
}

// NewCalendarEntry creates a new calendar entry with defaults.
func NewCalendarEntry(tenantID uuid.UUID, channel Channel, scheduledAt time.Time) *CalendarEntry {
	now := time.Now()
	return &CalendarEntry{
		ID:          uuid.New(),
		TenantID:    tenantID,
		Channel:     channel,
		ScheduledAt: scheduledAt,
		Status:      StatusScheduled,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

// Validate validates the calendar entry fields.
func (e *CalendarEntry) Validate() error {
	if e.TenantID == uuid.Nil {
		return fmt.Errorf("tenant_id is required")
	}

	if e.ScheduledAt.IsZero() {
		return fmt.Errorf("scheduled_at is required")
	}

	if e.ScheduledAt.Before(time.Now().Add(-time.Minute)) {
		return fmt.Errorf("scheduled_at must be in the future or very recent past")
	}

	if !e.Channel.IsValid() {
		return fmt.Errorf("invalid channel: %s", e.Channel)
	}

	if !e.Status.IsValid() {
		return fmt.Errorf("invalid status: %s", e.Status)
	}

	if e.ContentID == nil && e.CampaignID == nil {
		return fmt.Errorf("either content_id or campaign_id must be set")
	}

	return nil
}

// CanReschedule checks if the entry can be rescheduled.
func (e *CalendarEntry) CanReschedule() bool {
	return e.Status == StatusScheduled
}

// CanCancel checks if the entry can be cancelled.
func (e *CalendarEntry) CanCancel() bool {
	return e.Status == StatusScheduled
}

// MarkPublished marks the entry as successfully published.
func (e *CalendarEntry) MarkPublished() error {
	if e.Status != StatusScheduled {
		return fmt.Errorf("cannot publish entry with status %s", e.Status)
	}

	now := time.Now()
	e.Status = StatusPublished
	e.PublishedAt = &now
	e.UpdatedAt = now

	return nil
}

// MarkFailed marks the entry as failed to publish.
func (e *CalendarEntry) MarkFailed() error {
	if e.Status != StatusScheduled {
		return fmt.Errorf("cannot mark entry as failed with status %s", e.Status)
	}

	e.Status = StatusFailed
	e.UpdatedAt = time.Now()

	return nil
}

// Cancel cancels the scheduled entry.
func (e *CalendarEntry) Cancel() error {
	if !e.CanCancel() {
		return fmt.Errorf("cannot cancel entry with status %s", e.Status)
	}

	e.Status = StatusCancelled
	e.UpdatedAt = time.Now()

	return nil
}

// Reschedule changes the scheduled time.
func (e *CalendarEntry) Reschedule(newTime time.Time) error {
	if !e.CanReschedule() {
		return fmt.Errorf("cannot reschedule entry with status %s", e.Status)
	}

	if newTime.IsZero() {
		return fmt.Errorf("new scheduled time is required")
	}

	if newTime.Before(time.Now().Add(-time.Minute)) {
		return fmt.Errorf("new scheduled time must be in the future")
	}

	e.ScheduledAt = newTime
	e.UpdatedAt = time.Now()

	return nil
}

// CalendarFilter represents query parameters for filtering calendar entries.
type CalendarFilter struct {
	TenantID   uuid.UUID
	CampaignID *uuid.UUID
	ContentID  *uuid.UUID
	Channel    *Channel
	Status     *PublishingStatus
	StartDate  *time.Time
	EndDate    *time.Time
	Page       int
	PageSize   int
}

// Validate validates the calendar filter parameters.
func (f *CalendarFilter) Validate() error {
	if f.TenantID == uuid.Nil {
		return fmt.Errorf("tenant_id is required")
	}

	if f.Page < 0 {
		return fmt.Errorf("page must be >= 0")
	}

	if f.PageSize < 0 {
		return fmt.Errorf("page_size must be >= 0")
	}

	if f.PageSize > 1000 {
		return fmt.Errorf("page_size must be <= 1000")
	}

	if f.StartDate != nil && f.EndDate != nil {
		if f.EndDate.Before(*f.StartDate) {
			return fmt.Errorf("end_date must be after start_date")
		}
	}

	if f.Channel != nil && !f.Channel.IsValid() {
		return fmt.Errorf("invalid channel: %s", *f.Channel)
	}

	if f.Status != nil && !f.Status.IsValid() {
		return fmt.Errorf("invalid status: %s", *f.Status)
	}

	return nil
}

// CalendarView represents a time range of calendar entries with aggregated statistics.
type CalendarView struct {
	StartDate time.Time                  `json:"start_date"`
	EndDate   time.Time                  `json:"end_date"`
	Entries   []CalendarEntryWithContent `json:"entries"`
	Summary   CalendarSummary            `json:"summary"`
}

// CalendarSummary provides aggregate statistics for a calendar view.
type CalendarSummary struct {
	TotalEntries     int                          `json:"total_entries"`
	ByChannel        map[Channel]int              `json:"by_channel"`
	ByStatus         map[PublishingStatus]int     `json:"by_status"`
	UpcomingToday    int                          `json:"upcoming_today"`
	UpcomingThisWeek int                          `json:"upcoming_this_week"`
}

// NewCalendarSummary creates an empty summary with initialized maps.
func NewCalendarSummary() CalendarSummary {
	return CalendarSummary{
		ByChannel: make(map[Channel]int),
		ByStatus:  make(map[PublishingStatus]int),
	}
}

// AddEntry updates the summary with a new entry.
func (s *CalendarSummary) AddEntry(entry CalendarEntryWithContent, now time.Time) {
	s.TotalEntries++

	s.ByChannel[entry.Channel]++
	s.ByStatus[entry.Status]++

	if entry.Status != StatusScheduled {
		return
	}

	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	todayEnd := todayStart.Add(24 * time.Hour)

	if entry.ScheduledAt.After(todayStart) && entry.ScheduledAt.Before(todayEnd) {
		s.UpcomingToday++
	}

	weekEnd := todayStart.Add(7 * 24 * time.Hour)
	if entry.ScheduledAt.After(todayStart) && entry.ScheduledAt.Before(weekEnd) {
		s.UpcomingThisWeek++
	}
}
