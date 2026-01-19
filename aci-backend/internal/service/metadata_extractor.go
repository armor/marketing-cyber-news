package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/microcosm-cc/bluemonday"
	"github.com/rs/zerolog/log"
)

// MetadataExtractor extracts metadata from URLs with SSRF protection
type MetadataExtractor struct {
	httpClient  *http.Client
	sanitizer   *bluemonday.Policy
	maxBodySize int64
	readWPM     int // words per minute for read time calculation
}

// ExtractedMetadata contains metadata extracted from a URL
type ExtractedMetadata struct {
	URL             string  `json:"url"`
	Title           string  `json:"title"`
	Description     *string `json:"description,omitempty"`
	ImageURL        *string `json:"image_url,omitempty"`
	PublishDate     *string `json:"publish_date,omitempty"`
	Author          *string `json:"author,omitempty"`
	ReadTimeMinutes *int    `json:"read_time_minutes,omitempty"`
	SiteName        *string `json:"site_name,omitempty"`
}

// jsonLDSchema represents Schema.org JSON-LD structured data.
// Supports Article, NewsArticle, BlogPosting, and WebPage types.
type jsonLDSchema struct {
	Context     interface{}    `json:"@context"`
	Type        interface{}    `json:"@type"`
	Headline    string         `json:"headline"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Image       interface{}    `json:"image"`
	DatePublished  string      `json:"datePublished"`
	DateModified   string      `json:"dateModified"`
	Author      interface{}    `json:"author"`
	Publisher   *jsonLDEntity  `json:"publisher"`
	MainEntity  *jsonLDSchema  `json:"mainEntity"`
	Graph       []jsonLDSchema `json:"@graph"`
}

// jsonLDEntity represents an author or publisher entity in JSON-LD
type jsonLDEntity struct {
	Type string `json:"@type"`
	Name string `json:"name"`
	URL  string `json:"url"`
}

// jsonLDImage represents an image in JSON-LD (can be string, object, or array)
type jsonLDImage struct {
	Type string `json:"@type"`
	URL  string `json:"url"`
}

// NewMetadataExtractor creates a new metadata extractor with SSRF-safe HTTP client
func NewMetadataExtractor() *MetadataExtractor {
	// Create HTTP client with SSRF protection
	transport := &http.Transport{
		DialContext: ssrfSafeDialer,
		// Disable following redirects to potentially unsafe hosts
		DisableKeepAlives: true,
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Limit redirects to 5
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects")
			}
			// Validate redirect URL for SSRF
			if err := validateURLForSSRF(req.URL.String()); err != nil {
				return fmt.Errorf("redirect to unsafe URL: %w", err)
			}
			return nil
		},
	}

	// Create strict HTML sanitizer for text content
	sanitizer := bluemonday.StrictPolicy()

	return &MetadataExtractor{
		httpClient:  client,
		sanitizer:   sanitizer,
		maxBodySize: 5 * 1024 * 1024, // 5MB max
		readWPM:     200,             // Average reading speed
	}
}

// ssrfSafeDialer wraps the default dialer with SSRF checks
func ssrfSafeDialer(ctx context.Context, network, addr string) (net.Conn, error) {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		// Might not have port, try the address directly
		host = addr
	}

	// Resolve the hostname to IPs
	ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return nil, fmt.Errorf("DNS resolution failed: %w", err)
	}

	// Check each resolved IP
	for _, ip := range ips {
		if isPrivateOrBlockedIP(ip.IP) {
			return nil, fmt.Errorf("connection to private/blocked IP not allowed: %s", ip.IP.String())
		}
	}

	// Safe to connect
	dialer := &net.Dialer{
		Timeout:   5 * time.Second,
		KeepAlive: 0, // No keep-alive for security
	}
	return dialer.DialContext(ctx, network, addr)
}

// isPrivateOrBlockedIP checks if an IP is private, loopback, or otherwise blocked
func isPrivateOrBlockedIP(ip net.IP) bool {
	// Check for nil
	if ip == nil {
		return true
	}

	// Loopback addresses (127.0.0.0/8, ::1)
	if ip.IsLoopback() {
		return true
	}

	// Private addresses
	if ip.IsPrivate() {
		return true
	}

	// Link-local addresses (169.254.0.0/16, fe80::/10)
	if ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return true
	}

	// Unspecified (0.0.0.0, ::)
	if ip.IsUnspecified() {
		return true
	}

	// Multicast
	if ip.IsMulticast() {
		return true
	}

	// Cloud metadata endpoints (common patterns)
	// AWS: 169.254.169.254
	// GCP: metadata.google.internal resolves to 169.254.169.254
	// Azure: 169.254.169.254
	if ip.Equal(net.ParseIP("169.254.169.254")) {
		return true
	}

	// Check for IPv4 private ranges explicitly
	ip4 := ip.To4()
	if ip4 != nil {
		// 10.0.0.0/8
		if ip4[0] == 10 {
			return true
		}
		// 172.16.0.0/12
		if ip4[0] == 172 && ip4[1] >= 16 && ip4[1] <= 31 {
			return true
		}
		// 192.168.0.0/16
		if ip4[0] == 192 && ip4[1] == 168 {
			return true
		}
		// 127.0.0.0/8 (additional check)
		if ip4[0] == 127 {
			return true
		}
	}

	return false
}

// validateURLForSSRF validates a URL string for SSRF vulnerabilities
func validateURLForSSRF(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}

	// Only allow http and https
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("unsupported scheme: %s", parsed.Scheme)
	}

	// Block common internal hostnames
	hostname := strings.ToLower(parsed.Hostname())
	blockedHostnames := []string{
		"localhost",
		"127.0.0.1",
		"::1",
		"0.0.0.0",
		"metadata.google.internal",
		"metadata",
		"169.254.169.254",
	}
	for _, blocked := range blockedHostnames {
		if hostname == blocked {
			return fmt.Errorf("blocked hostname: %s", hostname)
		}
	}

	// Block URLs with username/password
	if parsed.User != nil {
		return fmt.Errorf("URLs with credentials not allowed")
	}

	return nil
}

// ExtractMetadata fetches a URL and extracts metadata
func (m *MetadataExtractor) ExtractMetadata(ctx context.Context, targetURL string) (*ExtractedMetadata, error) {
	// Validate URL for SSRF
	if err := validateURLForSSRF(targetURL); err != nil {
		return nil, fmt.Errorf("URL validation failed: %w", err)
	}

	// Create request
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set user agent to appear as a regular browser
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; ArmorNewsletter/1.0; +https://armor.security)")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")

	// Execute request
	resp, err := m.httpClient.Do(req)
	if err != nil {
		log.Warn().Err(err).Str("url", targetURL).Msg("Failed to fetch URL for metadata")
		return nil, fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	// Check content type
	contentType := resp.Header.Get("Content-Type")
	if !strings.Contains(contentType, "text/html") && !strings.Contains(contentType, "application/xhtml") {
		return nil, fmt.Errorf("unsupported content type: %s", contentType)
	}

	// Limit body size
	limitedReader := io.LimitReader(resp.Body, m.maxBodySize)

	// Parse HTML
	doc, err := goquery.NewDocumentFromReader(limitedReader)
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	// Try JSON-LD extraction first (most structured and reliable)
	metadata := m.extractJSONLD(doc, targetURL)

	// Fall back to OG/meta tag extraction if JSON-LD didn't provide data
	if metadata == nil {
		metadata = &ExtractedMetadata{
			URL: targetURL,
		}
	}

	// Extract title (prefer JSON-LD, then og:title, then title tag)
	if metadata.Title == "" {
		if ogTitle := m.getMetaContent(doc, "og:title"); ogTitle != "" {
			metadata.Title = m.sanitize(ogTitle)
		} else {
			metadata.Title = m.sanitize(doc.Find("title").First().Text())
		}
	}

	// Extract description (prefer JSON-LD, then og:description, then meta description)
	if metadata.Description == nil {
		if desc := m.getMetaContent(doc, "og:description"); desc != "" {
			sanitized := m.sanitize(desc)
			metadata.Description = &sanitized
		} else if desc := m.getMetaContentByName(doc, "description"); desc != "" {
			sanitized := m.sanitize(desc)
			metadata.Description = &sanitized
		}
	}

	// Extract image (prefer JSON-LD, then og:image)
	if metadata.ImageURL == nil {
		if img := m.getMetaContent(doc, "og:image"); img != "" {
			// Resolve relative URLs
			if resolved := m.resolveURL(targetURL, img); resolved != "" {
				metadata.ImageURL = &resolved
			}
		}
	}

	// Extract publish date (prefer JSON-LD, then article:published_time, datePublished, or pubdate)
	if metadata.PublishDate == nil {
		if pubDate := m.getMetaContent(doc, "article:published_time"); pubDate != "" {
			metadata.PublishDate = &pubDate
		} else if pubDate := m.getMetaContentByName(doc, "pubdate"); pubDate != "" {
			metadata.PublishDate = &pubDate
		} else if pubDate := m.getMetaContentByItemProp(doc, "datePublished"); pubDate != "" {
			metadata.PublishDate = &pubDate
		}
	}

	// Extract author (prefer JSON-LD, then article:author, author, or byline)
	if metadata.Author == nil {
		if author := m.getMetaContent(doc, "article:author"); author != "" {
			sanitized := m.sanitize(author)
			metadata.Author = &sanitized
		} else if author := m.getMetaContentByName(doc, "author"); author != "" {
			sanitized := m.sanitize(author)
			metadata.Author = &sanitized
		} else if author := m.getMetaContentByItemProp(doc, "author"); author != "" {
			sanitized := m.sanitize(author)
			metadata.Author = &sanitized
		}
	}

	// Extract site name (prefer JSON-LD, then og:site_name)
	if metadata.SiteName == nil {
		if siteName := m.getMetaContent(doc, "og:site_name"); siteName != "" {
			sanitized := m.sanitize(siteName)
			metadata.SiteName = &sanitized
		}
	}

	// Calculate read time from article content (always calculated from DOM)
	if readTime := m.calculateReadTime(doc); readTime > 0 {
		metadata.ReadTimeMinutes = &readTime
	}

	log.Debug().
		Str("url", targetURL).
		Str("title", metadata.Title).
		Msg("Successfully extracted metadata")

	return metadata, nil
}

// getMetaContent extracts content from og: meta tags
func (m *MetadataExtractor) getMetaContent(doc *goquery.Document, property string) string {
	var content string
	doc.Find(fmt.Sprintf("meta[property='%s']", property)).Each(func(_ int, s *goquery.Selection) {
		if c, exists := s.Attr("content"); exists {
			content = c
		}
	})
	return content
}

// getMetaContentByName extracts content from meta tags by name attribute
func (m *MetadataExtractor) getMetaContentByName(doc *goquery.Document, name string) string {
	var content string
	doc.Find(fmt.Sprintf("meta[name='%s']", name)).Each(func(_ int, s *goquery.Selection) {
		if c, exists := s.Attr("content"); exists {
			content = c
		}
	})
	return content
}

// getMetaContentByItemProp extracts content from meta tags by itemprop attribute (schema.org)
func (m *MetadataExtractor) getMetaContentByItemProp(doc *goquery.Document, itemProp string) string {
	var content string
	doc.Find(fmt.Sprintf("[itemprop='%s']", itemProp)).Each(func(_ int, s *goquery.Selection) {
		if c, exists := s.Attr("content"); exists {
			content = c
		} else {
			content = s.Text()
		}
	})
	return content
}

// resolveURL resolves a relative URL against a base URL with SSRF protection
func (m *MetadataExtractor) resolveURL(base, relative string) string {
	baseURL, err := url.Parse(base)
	if err != nil {
		return ""
	}
	relURL, err := url.Parse(relative)
	if err != nil {
		return ""
	}
	resolved := baseURL.ResolveReference(relURL)
	resolvedStr := resolved.String()

	// Validate resolved URL against SSRF to prevent path traversal attacks
	// that could resolve to internal endpoints (e.g., ../../169.254.169.254/)
	if err := validateURLForSSRF(resolvedStr); err != nil {
		log.Debug().
			Str("base", base).
			Str("relative", relative).
			Str("resolved", resolvedStr).
			Err(err).
			Msg("Rejected resolved URL due to SSRF validation failure")
		return ""
	}

	return resolvedStr
}

// sanitize removes potentially dangerous HTML/script content
func (m *MetadataExtractor) sanitize(input string) string {
	// Use bluemonday strict policy to strip all HTML
	cleaned := m.sanitizer.Sanitize(input)
	// Trim whitespace
	cleaned = strings.TrimSpace(cleaned)
	return cleaned
}

// calculateReadTime estimates reading time based on word count
func (m *MetadataExtractor) calculateReadTime(doc *goquery.Document) int {
	// Try to find main content areas
	var text string

	// Try article tag first
	if article := doc.Find("article").First(); article.Length() > 0 {
		text = article.Text()
	} else if main := doc.Find("main").First(); main.Length() > 0 {
		text = main.Text()
	} else if content := doc.Find(".content, .post-content, .article-content, .entry-content").First(); content.Length() > 0 {
		text = content.Text()
	} else {
		// Fall back to body, excluding scripts and styles
		body := doc.Find("body").Clone()
		body.Find("script, style, nav, footer, header, aside").Remove()
		text = body.Text()
	}

	// Count words (simple whitespace split)
	words := regexp.MustCompile(`\s+`).Split(strings.TrimSpace(text), -1)
	wordCount := len(words)

	if wordCount == 0 {
		return 0
	}

	// Calculate read time in minutes, minimum 1 minute
	readTime := wordCount / m.readWPM
	if readTime < 1 && wordCount > 0 {
		readTime = 1
	}

	return readTime
}

// extractJSONLD extracts metadata from JSON-LD script tags
// It parses Schema.org structured data which is commonly used by news sites
func (m *MetadataExtractor) extractJSONLD(doc *goquery.Document, targetURL string) *ExtractedMetadata {
	var metadata *ExtractedMetadata

	doc.Find("script[type='application/ld+json']").Each(func(_ int, s *goquery.Selection) {
		if metadata != nil {
			return // Already found valid data
		}

		jsonText := strings.TrimSpace(s.Text())
		if jsonText == "" {
			return
		}

		var schema jsonLDSchema
		if err := json.Unmarshal([]byte(jsonText), &schema); err != nil {
			log.Debug().Err(err).Msg("Failed to parse JSON-LD, trying to parse @graph")
			// Some sites may have invalid JSON, continue to next script
			return
		}

		// Handle @graph array (common pattern where multiple schemas are in a graph)
		if len(schema.Graph) > 0 {
			for _, item := range schema.Graph {
				if extracted := m.extractFromJSONLDItem(&item, targetURL); extracted != nil {
					metadata = extracted
					return
				}
			}
		}

		// Handle mainEntity (nested article within WebPage)
		if schema.MainEntity != nil {
			if extracted := m.extractFromJSONLDItem(schema.MainEntity, targetURL); extracted != nil {
				metadata = extracted
				return
			}
		}

		// Try direct extraction from root
		if extracted := m.extractFromJSONLDItem(&schema, targetURL); extracted != nil {
			metadata = extracted
		}
	})

	return metadata
}

// extractFromJSONLDItem extracts metadata from a single JSON-LD schema item
func (m *MetadataExtractor) extractFromJSONLDItem(schema *jsonLDSchema, targetURL string) *ExtractedMetadata {
	// Check if this is an article type
	schemaType := m.getJSONLDType(schema.Type)
	articleTypes := []string{"Article", "NewsArticle", "BlogPosting", "WebPage", "TechArticle", "ReportageNewsArticle"}

	isArticle := false
	for _, t := range articleTypes {
		if strings.EqualFold(schemaType, t) {
			isArticle = true
			break
		}
	}

	if !isArticle {
		return nil
	}

	metadata := &ExtractedMetadata{
		URL: targetURL,
	}

	// Extract title (prefer headline, fall back to name)
	if schema.Headline != "" {
		metadata.Title = m.sanitize(schema.Headline)
	} else if schema.Name != "" {
		metadata.Title = m.sanitize(schema.Name)
	}

	// If no title found, this isn't useful
	if metadata.Title == "" {
		return nil
	}

	// Extract description
	if schema.Description != "" {
		desc := m.sanitize(schema.Description)
		metadata.Description = &desc
	}

	// Extract publish date (prefer datePublished, fall back to dateModified)
	if schema.DatePublished != "" {
		metadata.PublishDate = &schema.DatePublished
	} else if schema.DateModified != "" {
		metadata.PublishDate = &schema.DateModified
	}

	// Extract author
	if author := m.extractJSONLDAuthor(schema.Author); author != "" {
		sanitizedAuthor := m.sanitize(author)
		metadata.Author = &sanitizedAuthor
	}

	// Extract publisher/site name
	if schema.Publisher != nil && schema.Publisher.Name != "" {
		siteName := m.sanitize(schema.Publisher.Name)
		metadata.SiteName = &siteName
	}

	// Extract image
	if imageURL := m.extractJSONLDImage(schema.Image, targetURL); imageURL != "" {
		metadata.ImageURL = &imageURL
	}

	return metadata
}

// getJSONLDType extracts the @type value which can be string or array
func (m *MetadataExtractor) getJSONLDType(typeVal interface{}) string {
	if typeVal == nil {
		return ""
	}

	// Can be a simple string
	if str, ok := typeVal.(string); ok {
		return str
	}

	// Can be an array of types
	if arr, ok := typeVal.([]interface{}); ok && len(arr) > 0 {
		if str, ok := arr[0].(string); ok {
			return str
		}
	}

	return ""
}

// extractJSONLDAuthor extracts author name from various JSON-LD author formats
func (m *MetadataExtractor) extractJSONLDAuthor(author interface{}) string {
	if author == nil {
		return ""
	}

	// Can be a simple string
	if str, ok := author.(string); ok {
		return str
	}

	// Can be an object with a name field
	if obj, ok := author.(map[string]interface{}); ok {
		if name, exists := obj["name"]; exists {
			if str, ok := name.(string); ok {
				return str
			}
		}
	}

	// Can be an array of authors
	if arr, ok := author.([]interface{}); ok && len(arr) > 0 {
		// Get first author
		if obj, ok := arr[0].(map[string]interface{}); ok {
			if name, exists := obj["name"]; exists {
				if str, ok := name.(string); ok {
					return str
				}
			}
		}
		// Or first item could be a string
		if str, ok := arr[0].(string); ok {
			return str
		}
	}

	return ""
}

// extractJSONLDImage extracts image URL from various JSON-LD image formats
func (m *MetadataExtractor) extractJSONLDImage(image interface{}, baseURL string) string {
	if image == nil {
		return ""
	}

	var imageURL string

	// Can be a simple string URL
	if str, ok := image.(string); ok {
		imageURL = str
	}

	// Can be an object with url field
	if obj, ok := image.(map[string]interface{}); ok {
		if url, exists := obj["url"]; exists {
			if str, ok := url.(string); ok {
				imageURL = str
			}
		}
	}

	// Can be an array
	if arr, ok := image.([]interface{}); ok && len(arr) > 0 {
		// First item could be string
		if str, ok := arr[0].(string); ok {
			imageURL = str
		}
		// Or first item could be an object
		if obj, ok := arr[0].(map[string]interface{}); ok {
			if url, exists := obj["url"]; exists {
				if str, ok := url.(string); ok {
					imageURL = str
				}
			}
		}
	}

	// Resolve and validate the URL
	if imageURL != "" {
		return m.resolveURL(baseURL, imageURL)
	}

	return ""
}
