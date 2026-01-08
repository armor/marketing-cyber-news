package handlers

import (
	"context"

	"github.com/google/uuid"

	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/service"
)

// CampaignServiceAdapter adapts service.CampaignService to handlers.CampaignService interface
type CampaignServiceAdapter struct {
	svc *service.CampaignService
}

// NewCampaignServiceAdapter creates a new adapter
func NewCampaignServiceAdapter(svc *service.CampaignService) *CampaignServiceAdapter {
	return &CampaignServiceAdapter{svc: svc}
}

func (a *CampaignServiceAdapter) List(ctx context.Context, filter *domain.CampaignFilter) ([]*domain.Campaign, int, error) {
	return a.svc.List(ctx, filter)
}

func (a *CampaignServiceAdapter) GetByID(ctx context.Context, id uuid.UUID) (*domain.Campaign, error) {
	return a.svc.Get(ctx, id)
}

func (a *CampaignServiceAdapter) Create(ctx context.Context, campaign *domain.Campaign) error {
	description := ""
	if campaign.Description != nil {
		description = *campaign.Description
	}
	req := service.CreateCampaignRequest{
		TenantID:     campaign.TenantID,
		Name:         campaign.Name,
		Description:  description,
		Goal:         campaign.Goal,
		Channels:     campaign.Channels,
		Frequency:    campaign.Frequency,
		ContentStyle: campaign.ContentStyle,
		Topics:       campaign.Topics,
		StartDate:    campaign.StartDate,
		EndDate:      campaign.EndDate,
		CreatedBy:    campaign.CreatedBy,
	}
	created, err := a.svc.Create(ctx, req)
	if err != nil {
		return err
	}
	*campaign = *created
	return nil
}

func (a *CampaignServiceAdapter) Update(ctx context.Context, campaign *domain.Campaign) error {
	description := ""
	if campaign.Description != nil {
		description = *campaign.Description
	}
	req := service.UpdateCampaignRequest{
		Name:         &campaign.Name,
		Description:  &description,
		Goal:         &campaign.Goal,
		Channels:     campaign.Channels,
		Frequency:    &campaign.Frequency,
		ContentStyle: &campaign.ContentStyle,
		Topics:       campaign.Topics,
		StartDate:    campaign.StartDate,
		EndDate:      campaign.EndDate,
	}
	updated, err := a.svc.Update(ctx, campaign.ID, req)
	if err != nil {
		return err
	}
	*campaign = *updated
	return nil
}

func (a *CampaignServiceAdapter) Delete(ctx context.Context, id uuid.UUID) error {
	return a.svc.Delete(ctx, id)
}

func (a *CampaignServiceAdapter) Launch(ctx context.Context, id uuid.UUID) error {
	_, err := a.svc.Launch(ctx, id)
	return err
}

func (a *CampaignServiceAdapter) Pause(ctx context.Context, id uuid.UUID) error {
	_, err := a.svc.Pause(ctx, id)
	return err
}

func (a *CampaignServiceAdapter) Resume(ctx context.Context, id uuid.UUID) error {
	_, err := a.svc.Resume(ctx, id)
	return err
}

func (a *CampaignServiceAdapter) Stop(ctx context.Context, id uuid.UUID) error {
	_, err := a.svc.Stop(ctx, id)
	return err
}

func (a *CampaignServiceAdapter) GetStats(ctx context.Context, id uuid.UUID) (*domain.CampaignStats, error) {
	return a.svc.GetStats(ctx, id)
}

func (a *CampaignServiceAdapter) GetRecommendations(ctx context.Context, req *RecommendationsRequest) ([]AIRecommendation, error) {
	// Convert handler request to service request
	var channels []domain.Channel
	for _, ch := range req.Channels {
		channels = append(channels, domain.Channel(ch))
	}

	svcReq := service.CreateCampaignRequest{
		Goal:     domain.CampaignGoal(req.Goal),
		Channels: channels,
		Topics:   req.Topics,
	}
	svcRecs, err := a.svc.GetRecommendations(ctx, svcReq)
	if err != nil {
		return nil, err
	}

	// Convert service recommendations to handler recommendations
	recs := make([]AIRecommendation, len(svcRecs))
	for i, r := range svcRecs {
		recs[i] = AIRecommendation{
			Type:       r.Type,
			Category:   r.Type, // Use type as category
			Suggestion: r.Title,
			Reasoning:  r.Description,
			Confidence: r.Confidence,
		}
	}
	return recs, nil
}

func (a *CampaignServiceAdapter) GetCompetitors(ctx context.Context, campaignID uuid.UUID) ([]*domain.Competitor, error) {
	return a.svc.GetCompetitors(ctx, campaignID)
}

func (a *CampaignServiceAdapter) AddCompetitor(ctx context.Context, competitor *domain.Competitor) error {
	competitors := []service.CompetitorInput{
		{
			Name:     competitor.Name,
			LinkedIn: competitor.LinkedIn,
			Twitter:  competitor.Twitter,
			Blog:     competitor.Blog,
			Website:  competitor.Website,
		},
	}
	return a.svc.AddCompetitors(ctx, competitor.CampaignID, competitors)
}

func (a *CampaignServiceAdapter) RemoveCompetitor(ctx context.Context, campaignID, competitorID uuid.UUID) error {
	return a.svc.RemoveCompetitor(ctx, campaignID, competitorID)
}

// Verify interface compliance
var _ CampaignService = (*CampaignServiceAdapter)(nil)
