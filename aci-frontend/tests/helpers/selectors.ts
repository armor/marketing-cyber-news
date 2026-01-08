/**
 * Centralized test selectors for E2E tests
 *
 * Purpose: Single source of truth for all UI selectors
 * Pattern: Organize by feature domain
 */

export const selectors = {
  auth: {
    emailInput: 'input[type="email"]',
    passwordInput: 'input[type="password"]',
    submitButton: 'button[type="submit"]',
    errorAlert: '[role="alert"]',
    loginForm: 'form',
    registerLink: 'a[href="/register"]',
    loginLink: 'a[href="/login"]',
    cancelButton: 'button:has-text("Cancel")',
  },

  newsletter: {
    // Config management
    configNameInput: 'input[name="name"]',
    configDescInput: 'textarea[name="description"]',
    senderNameInput: 'input[name="senderName"]',
    senderEmailInput: 'input[name="senderEmail"]',
    replyToInput: 'input[name="replyTo"]',
    saveButton: 'button:has-text("Save")',
    cancelButton: 'button:has-text("Cancel")',

    // Issue management
    issueTitle: 'input[name="title"]',
    issueSubject: 'input[name="subject"]',
    issuePreheader: 'input[name="preheader"]',
    generateButton: 'button:has-text("Generate")',
    scheduleButton: 'button:has-text("Schedule")',
    sendButton: 'button:has-text("Send")',

    // Content blocks
    contentBlocks: '[data-testid="content-block"]',
    addBlockButton: 'button:has-text("Add Block")',
    blockEditor: '[data-testid="block-editor"]',

    // Analytics
    analyticsCard: '[data-testid="analytics-card"]',
    metricsGrid: '[data-testid="metrics-grid"]',
    openRate: '[data-testid="metric-open-rate"]',
    clickRate: '[data-testid="metric-click-rate"]',

    // Approval flow
    approveButton: 'button:has-text("Approve")',
    rejectButton: 'button:has-text("Reject")',
    approvalStatus: '[data-testid="approval-status"]',
    approvalHistory: '[data-testid="approval-history"]',
  },

  marketing: {
    // Campaign management
    campaignNameInput: 'input[name="name"]',
    campaignDescInput: 'textarea[name="description"]',
    campaignTypeSelect: 'select[name="type"]',
    startDateInput: 'input[name="startDate"]',
    endDateInput: 'input[name="endDate"]',

    // Channel hub
    channelCards: '[data-testid="channel-card"]',
    channelStatus: '[data-testid="channel-status"]',
    connectButton: 'button:has-text("Connect")',
    disconnectButton: 'button:has-text("Disconnect")',
    testConnectionButton: 'button:has-text("Test Connection")',

    // Content studio
    contentItems: '[data-testid="content-item"]',
    contentEditor: '[data-testid="content-editor"]',
    contentTitleInput: 'input[name="title"]',
    contentBodyInput: 'textarea[name="body"]',
    publishButton: 'button:has-text("Publish")',

    // Calendar
    calendarView: '[data-testid="calendar-view"]',
    calendarEvent: '[data-testid="calendar-event"]',
    createEventButton: 'button:has-text("Create Event")',

    // Analytics
    analyticsOverview: '[data-testid="analytics-overview"]',
    performanceChart: '[data-testid="performance-chart"]',
    engagementMetrics: '[data-testid="engagement-metrics"]',

    // Brand center
    brandNameInput: 'input[name="brandName"]',
    brandLogoUpload: 'input[type="file"][accept*="image"]',
    brandColorPicker: 'input[type="color"]',
    brandVoiceTone: 'select[name="voiceTone"]',

    // Competitor monitoring
    competitorCards: '[data-testid="competitor-card"]',
    competitorNameInput: 'input[name="competitorName"]',
    competitorUrlInput: 'input[name="url"]',
    addCompetitorButton: 'button:has-text("Add Competitor")',

    // Segments
    segmentNameInput: 'input[name="segmentName"]',
    segmentCriteria: '[data-testid="segment-criteria"]',
    addCriteriaButton: 'button:has-text("Add Criteria")',
  },

  common: {
    // Navigation
    header: 'header',
    sidebar: '[data-testid="sidebar"]',
    mainContent: 'main',
    footer: 'footer',

    // UI elements
    toast: '[data-testid="toast"], [role="status"], .Toaster',
    modal: '[role="dialog"]',
    modalClose: 'button[aria-label*="Close"]',
    loadingSpinner: '[data-testid="loading"], [aria-label*="Loading"]',
    skeleton: '[data-testid="skeleton"]',

    // Forms
    submitButton: 'button[type="submit"]',
    cancelButton: 'button:has-text("Cancel")',
    deleteButton: 'button:has-text("Delete")',
    editButton: 'button:has-text("Edit")',

    // Tables
    table: 'table',
    tableRow: 'tr',
    tableHeader: 'th',
    tableCell: 'td',

    // Pagination
    nextPageButton: 'button:has-text("Next")',
    prevPageButton: 'button:has-text("Previous")',
    pageNumber: '[data-testid="page-number"]',

    // Search and filters
    searchInput: 'input[type="search"], input[placeholder*="Search"]',
    filterButton: 'button:has-text("Filter")',
    sortButton: 'button:has-text("Sort")',

    // Error states
    errorBoundary: '[data-testid="error-boundary"]',
    errorMessage: '[role="alert"], .text-destructive',
    validationError: '[data-testid="validation-error"], .text-destructive',
  },

  admin: {
    // Role management
    roleSelector: '[data-testid="role-selector"]',
    roleOption: '[data-testid="role-option"]',
    switchRoleButton: 'button:has-text("Switch Role")',

    // User management
    userList: '[data-testid="user-list"]',
    userRow: '[data-testid="user-row"]',
    inviteUserButton: 'button:has-text("Invite User")',
  },
} as const;

export type Selectors = typeof selectors;
export type SelectorKey = keyof Selectors;
