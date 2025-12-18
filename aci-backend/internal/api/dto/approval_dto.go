package dto

import (
	"time"

	"github.com/phillipboles/aci-backend/internal/domain"
)

// Request DTOs

// ApproveRequest represents the request body for approving an article
type ApproveRequest struct {
	Notes string `json:"notes,omitempty" validate:"max=1000"`
}

// RejectRequest represents the request body for rejecting an article
type RejectRequest struct {
	Reason string `json:"reason" validate:"required,min=10,max=2000"`
}

// UpdateRoleRequest represents the request body for updating a user's role
type UpdateRoleRequest struct {
	Role domain.UserRole `json:"role" validate:"required"`
}

// Response DTOs

// ApprovalQueueResponse represents the paginated approval queue response
type ApprovalQueueResponse struct {
	Data       []ArticleForApprovalDTO `json:"data"`
	Pagination PaginationDTO           `json:"pagination"`
	Meta       ApprovalQueueMetaDTO    `json:"meta"`
}

// ApprovalQueueMetaDTO provides metadata about the approval queue
type ApprovalQueueMetaDTO struct {
	UserRole   string `json:"userRole"`
	TargetGate string `json:"targetGate,omitempty"`
	QueueCount int    `json:"queueCount"`
}

// PaginationDTO represents pagination metadata
type PaginationDTO struct {
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
	TotalItems int `json:"totalItems"`
	TotalPages int `json:"totalPages"`
}

// ArticleForApprovalDTO represents an article in the approval queue
type ArticleForApprovalDTO struct {
	ID               string               `json:"id"`
	Title            string               `json:"title"`
	Slug             string               `json:"slug"`
	Summary          string               `json:"summary,omitempty"`
	Content          string               `json:"content,omitempty"`
	Category         *CategoryDTO         `json:"category,omitempty"`
	Source           *SourceDTO           `json:"source,omitempty"`
	Severity         string               `json:"severity,omitempty"`
	Tags             []string             `json:"tags,omitempty"`
	CVEs             []string             `json:"cves,omitempty"`
	Vendors          []string             `json:"vendors,omitempty"`
	ApprovalStatus   string               `json:"approvalStatus"`
	Rejected         bool                 `json:"rejected"`
	CreatedAt        string               `json:"createdAt"`
	PublishedAt      string               `json:"publishedAt,omitempty"`
	ApprovalProgress *ApprovalProgressDTO `json:"approvalProgress,omitempty"`
}

// CategoryDTO represents a minimal category in responses
type CategoryDTO struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Slug  string  `json:"slug"`
	Color string  `json:"color"`
	Icon  *string `json:"icon,omitempty"`
}

// SourceDTO represents a minimal source in responses
type SourceDTO struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	URL  string `json:"url"`
}

// ApprovalProgressDTO represents the progress through approval gates
type ApprovalProgressDTO struct {
	CompletedGates []string `json:"completedGates"`
	CurrentGate    string   `json:"currentGate,omitempty"`
	PendingGates   []string `json:"pendingGates"`
	TotalGates     int      `json:"totalGates"`
	CompletedCount int      `json:"completedCount"`
}

// ArticleApprovalDTO represents a single approval event
type ArticleApprovalDTO struct {
	ID            string `json:"id"`
	ArticleID     string `json:"articleId"`
	Gate          string `json:"gate"`
	ApprovedBy    string `json:"approvedBy"`
	ApproverName  string `json:"approverName,omitempty"`
	ApproverEmail string `json:"approverEmail,omitempty"`
	ApprovedAt    string `json:"approvedAt"`
	Notes         string `json:"notes,omitempty"`
}

// RejectionDetailsDTO represents details about article rejection
type RejectionDetailsDTO struct {
	Reason       string `json:"reason"`
	RejectedBy   string `json:"rejectedBy"`
	RejectorName string `json:"rejectorName,omitempty"`
	RejectedAt   string `json:"rejectedAt"`
}

// ReleaseDetailsDTO represents details about article release
type ReleaseDetailsDTO struct {
	ReleasedBy   string `json:"releasedBy"`
	ReleaserName string `json:"releaserName,omitempty"`
	ReleasedAt   string `json:"releasedAt"`
}

// ApprovalHistoryResponse represents the full approval history of an article
type ApprovalHistoryResponse struct {
	ArticleID        string               `json:"articleId"`
	CurrentStatus    string               `json:"currentStatus"`
	Rejected         bool                 `json:"rejected"`
	RejectionDetails *RejectionDetailsDTO `json:"rejectionDetails,omitempty"`
	ReleaseDetails   *ReleaseDetailsDTO   `json:"releaseDetails,omitempty"`
	Approvals        []ArticleApprovalDTO `json:"approvals"`
	Progress         ApprovalProgressDTO  `json:"progress"`
}

// ArticleStatusDTO represents minimal article status after an action
type ArticleStatusDTO struct {
	ID             string `json:"id"`
	ApprovalStatus string `json:"approvalStatus"`
	Rejected       bool   `json:"rejected"`
}

// ApprovalActionResponse represents the response for approval actions
type ApprovalActionResponse struct {
	Success bool              `json:"success"`
	Message string            `json:"message"`
	Article *ArticleStatusDTO `json:"article,omitempty"`
}

// UserResponseDTO represents a user in responses
type UserResponseDTO struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Role      string `json:"role"`
	UpdatedAt string `json:"updatedAt"`
}

// Converter Functions

// ArticleToApprovalDTO converts a domain Article to ArticleForApprovalDTO
// Note: approvalStatus and rejected are separate parameters since they're not yet
// part of the base Article struct. They will be added in the schema migration.
func ArticleToApprovalDTO(
	article *domain.Article,
	approvalStatus domain.ApprovalStatus,
	rejected bool,
	approvals []domain.ArticleApproval,
) ArticleForApprovalDTO {
	if article == nil {
		return ArticleForApprovalDTO{}
	}

	dto := ArticleForApprovalDTO{
		ID:             article.ID.String(),
		Title:          article.Title,
		Slug:           article.Slug,
		Severity:       string(article.Severity),
		Tags:           article.Tags,
		CVEs:           article.CVEs,
		Vendors:        article.Vendors,
		ApprovalStatus: string(approvalStatus),
		Rejected:       rejected,
		CreatedAt:      article.CreatedAt.Format(time.RFC3339),
	}

	// Optional summary
	if article.Summary != nil {
		dto.Summary = *article.Summary
	}

	// Optional content (may be omitted in list views)
	dto.Content = article.Content

	// Category
	if article.Category != nil {
		dto.Category = &CategoryDTO{
			ID:    article.Category.ID.String(),
			Name:  article.Category.Name,
			Slug:  article.Category.Slug,
			Color: article.Category.Color,
			Icon:  article.Category.Icon,
		}
	}

	// Source
	if article.Source != nil {
		dto.Source = &SourceDTO{
			ID:   article.Source.ID.String(),
			Name: article.Source.Name,
			URL:  article.Source.URL,
		}
	}

	// Published date
	if !article.PublishedAt.IsZero() {
		dto.PublishedAt = article.PublishedAt.Format(time.RFC3339)
	}

	// Approval progress
	progress := BuildApprovalProgress(approvalStatus, approvals)
	dto.ApprovalProgress = &progress

	return dto
}

// ApprovalToDTO converts a domain ArticleApproval to ArticleApprovalDTO
func ApprovalToDTO(approval *domain.ArticleApproval) ArticleApprovalDTO {
	if approval == nil {
		return ArticleApprovalDTO{}
	}

	dto := ArticleApprovalDTO{
		ID:         approval.ID.String(),
		ArticleID:  approval.ArticleID.String(),
		Gate:       string(approval.Gate),
		ApprovedBy: approval.ApprovedBy.String(),
		ApprovedAt: approval.ApprovedAt.Format(time.RFC3339),
	}

	// Optional fields
	if approval.ApproverName != "" {
		dto.ApproverName = approval.ApproverName
	}

	if approval.ApproverEmail != "" {
		dto.ApproverEmail = approval.ApproverEmail
	}

	if approval.Notes != nil {
		dto.Notes = *approval.Notes
	}

	return dto
}

// BuildApprovalProgress builds approval progress based on status and completed approvals
func BuildApprovalProgress(status domain.ApprovalStatus, approvals []domain.ArticleApproval) ApprovalProgressDTO {
	// Build map of completed gates
	completedGateMap := make(map[domain.ApprovalGate]bool)
	for _, approval := range approvals {
		completedGateMap[approval.Gate] = true
	}

	// Build progress
	var completedGates []string
	var pendingGates []string
	var currentGate string

	for _, gate := range domain.GateOrder {
		gateStr := string(gate)

		if completedGateMap[gate] {
			completedGates = append(completedGates, gateStr)
		} else {
			// First non-completed gate is the current gate (if status is pending)
			if currentGate == "" && status != domain.StatusApproved && status != domain.StatusRejected && status != domain.StatusReleased {
				currentGate = gateStr
			} else {
				pendingGates = append(pendingGates, gateStr)
			}
		}
	}

	// Handle edge cases
	if completedGates == nil {
		completedGates = []string{}
	}
	if pendingGates == nil {
		pendingGates = []string{}
	}

	// If article is rejected, clear current gate
	if status == domain.StatusRejected {
		currentGate = ""
	}

	return ApprovalProgressDTO{
		CompletedGates: completedGates,
		CurrentGate:    currentGate,
		PendingGates:   pendingGates,
		TotalGates:     len(domain.GateOrder),
		CompletedCount: len(completedGates),
	}
}

// UserToResponseDTO converts a domain User to UserResponseDTO
func UserToResponseDTO(user *domain.User) UserResponseDTO {
	if user == nil {
		return UserResponseDTO{}
	}

	return UserResponseDTO{
		ID:        user.ID.String(),
		Email:     user.Email,
		Name:      user.Name,
		Role:      string(user.Role),
		UpdatedAt: user.UpdatedAt.Format(time.RFC3339),
	}
}
