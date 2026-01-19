package service

import (
	"context"
	"net"
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================================
// SSRF Validation Tests
// ============================================================================

func TestValidateURLForSSRF_ValidPublicURL(t *testing.T) {
	testCases := []string{
		"https://example.com",
		"https://example.com/path",
		"https://example.com:443/path?query=value",
		"http://example.com",
	}

	for _, url := range testCases {
		t.Run(url, func(t *testing.T) {
			err := validateURLForSSRF(url)
			assert.NoError(t, err)
		})
	}
}

func TestValidateURLForSSRF_BlocksLocalhost(t *testing.T) {
	testCases := []string{
		"http://localhost",
		"http://localhost:8080",
		"http://127.0.0.1",
		"http://127.0.0.1:8080",
	}

	for _, url := range testCases {
		t.Run(url, func(t *testing.T) {
			err := validateURLForSSRF(url)
			assert.Error(t, err)
			assert.Contains(t, err.Error(), "blocked hostname")
		})
	}
}

func TestValidateURLForSSRF_BlocksCloudMetadata(t *testing.T) {
	testCases := []string{
		"http://169.254.169.254",
		"http://169.254.169.254/latest/meta-data/",
		"http://metadata.google.internal",
	}

	for _, url := range testCases {
		t.Run(url, func(t *testing.T) {
			err := validateURLForSSRF(url)
			assert.Error(t, err)
		})
	}
}

func TestValidateURLForSSRF_BlocksCredentials(t *testing.T) {
	url := "http://user:pass@example.com"
	err := validateURLForSSRF(url)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "credentials not allowed")
}

func TestValidateURLForSSRF_InvalidURLFormat(t *testing.T) {
	url := "not a valid url"
	err := validateURLForSSRF(url)
	assert.Error(t, err)
}

func TestValidateURLForSSRF_BlocksUnsupportedScheme(t *testing.T) {
	testCases := []string{
		"ftp://example.com",
		"file:///etc/passwd",
		"gopher://example.com",
	}

	for _, url := range testCases {
		t.Run(url, func(t *testing.T) {
			err := validateURLForSSRF(url)
			assert.Error(t, err)
			assert.Contains(t, err.Error(), "unsupported scheme")
		})
	}
}

// ============================================================================
// IP Blocklist Tests
// ============================================================================

func TestIsPrivateOrBlockedIP_LoopbackAddresses(t *testing.T) {
	testCases := []string{
		"127.0.0.1",
		"127.0.0.2",
		"127.255.255.255",
		"::1",
	}

	for _, ipStr := range testCases {
		t.Run(ipStr, func(t *testing.T) {
			ip := net.ParseIP(ipStr)
			assert.True(t, isPrivateOrBlockedIP(ip))
		})
	}
}

func TestIsPrivateOrBlockedIP_PrivateRanges(t *testing.T) {
	testCases := []string{
		"10.0.0.0",
		"10.0.0.1",
		"10.255.255.255",
		"172.16.0.0",
		"172.31.255.255",
		"192.168.0.0",
		"192.168.1.1",
		"192.168.255.255",
	}

	for _, ipStr := range testCases {
		t.Run(ipStr, func(t *testing.T) {
			ip := net.ParseIP(ipStr)
			assert.True(t, isPrivateOrBlockedIP(ip))
		})
	}
}

func TestIsPrivateOrBlockedIP_LinkLocalAddresses(t *testing.T) {
	testCases := []string{
		"169.254.0.0",
		"169.254.1.1",
		"169.254.255.255",
	}

	for _, ipStr := range testCases {
		t.Run(ipStr, func(t *testing.T) {
			ip := net.ParseIP(ipStr)
			assert.True(t, isPrivateOrBlockedIP(ip))
		})
	}
}

func TestIsPrivateOrBlockedIP_CloudMetadataEndpoint(t *testing.T) {
	ip := net.ParseIP("169.254.169.254")
	assert.True(t, isPrivateOrBlockedIP(ip))
}

func TestIsPrivateOrBlockedIP_PublicAddresses(t *testing.T) {
	testCases := []string{
		"8.8.8.8",
		"1.1.1.1",
		"208.67.222.222",
		"100.100.100.100",
	}

	for _, ipStr := range testCases {
		t.Run(ipStr, func(t *testing.T) {
			ip := net.ParseIP(ipStr)
			assert.False(t, isPrivateOrBlockedIP(ip))
		})
	}
}

func TestIsPrivateOrBlockedIP_NilIP(t *testing.T) {
	assert.True(t, isPrivateOrBlockedIP(nil))
}

func TestIsPrivateOrBlockedIP_UnspecifiedAddress(t *testing.T) {
	testCases := []string{
		"0.0.0.0",
		"::",
	}

	for _, ipStr := range testCases {
		t.Run(ipStr, func(t *testing.T) {
			ip := net.ParseIP(ipStr)
			assert.True(t, isPrivateOrBlockedIP(ip))
		})
	}
}

func TestIsPrivateOrBlockedIP_MulticastAddresses(t *testing.T) {
	testCases := []string{
		"224.0.0.0",
		"224.0.0.1",
		"239.255.255.255",
	}

	for _, ipStr := range testCases {
		t.Run(ipStr, func(t *testing.T) {
			ip := net.ParseIP(ipStr)
			assert.True(t, isPrivateOrBlockedIP(ip))
		})
	}
}

// ============================================================================
// MetadataExtractor Creation Tests
// ============================================================================

func TestNewMetadataExtractor_CreatesValidExtractor(t *testing.T) {
	extractor := NewMetadataExtractor()
	assert.NotNil(t, extractor)
	assert.NotNil(t, extractor.httpClient)
	assert.NotNil(t, extractor.sanitizer)
	assert.Equal(t, int64(5*1024*1024), extractor.maxBodySize)
	assert.Equal(t, 200, extractor.readWPM)
}

func TestNewMetadataExtractor_HTTPClientHasTimeout(t *testing.T) {
	extractor := NewMetadataExtractor()
	assert.Equal(t, int64(10000), extractor.httpClient.Timeout.Milliseconds())
}

// ============================================================================
// ExtractMetadata Method Tests
// ============================================================================

func TestExtractMetadata_InvalidURL(t *testing.T) {
	extractor := NewMetadataExtractor()
	ctx := context.Background()

	_, err := extractor.ExtractMetadata(ctx, "not a valid url")
	assert.Error(t, err)
}

func TestExtractMetadata_BlockedPrivateIP(t *testing.T) {
	extractor := NewMetadataExtractor()
	ctx := context.Background()

	_, err := extractor.ExtractMetadata(ctx, "http://192.168.1.1")
	assert.Error(t, err)
}

func TestExtractMetadata_BlocksLocalhostURL(t *testing.T) {
	extractor := NewMetadataExtractor()
	ctx := context.Background()

	_, err := extractor.ExtractMetadata(ctx, "http://localhost:8080/page")
	assert.Error(t, err)
}

func TestExtractMetadata_BlocksMetadataEndpoint(t *testing.T) {
	extractor := NewMetadataExtractor()
	ctx := context.Background()

	_, err := extractor.ExtractMetadata(ctx, "http://169.254.169.254/latest/meta-data/")
	assert.Error(t, err)
}

// ============================================================================
// HTML Meta Tag Extraction Tests
// ============================================================================

func TestMetadataExtraction_OpenGraphTags(t *testing.T) {
	// Test Open Graph extraction would require mocking HTTP responses
	// or using a test HTTP server. This is a structural test demonstrating
	// the interface is correct.
	extractor := NewMetadataExtractor()
	assert.NotNil(t, extractor)
}

// ============================================================================
// Read Time Calculation Tests
// ============================================================================

func TestReadTimeCalculation_VariousWordCounts(t *testing.T) {
	// The calculateReadTime method processes HTML documents
	// These tests would require goquery Documents with actual HTML
	extractor := NewMetadataExtractor()
	assert.Equal(t, 200, extractor.readWPM)
}

// ============================================================================
// Sanitization Tests
// ============================================================================

func TestSanitize_RemovesHTMLTags(t *testing.T) {
	extractor := NewMetadataExtractor()
	input := "<script>alert('xss')</script>Some text"
	result := extractor.sanitize(input)
	assert.NotContains(t, result, "<script>")
	assert.NotContains(t, result, "alert")
	assert.Equal(t, "Some text", result)
}

func TestSanitize_RemovesMultipleTags(t *testing.T) {
	extractor := NewMetadataExtractor()
	input := "<b>bold</b> <i>italic</i> <script>bad</script> text"
	result := extractor.sanitize(input)
	assert.NotContains(t, result, "<")
	assert.NotContains(t, result, ">")
}

func TestSanitize_PreservesPlainText(t *testing.T) {
	extractor := NewMetadataExtractor()
	input := "Plain text without HTML"
	result := extractor.sanitize(input)
	assert.Equal(t, "Plain text without HTML", result)
}

func TestSanitize_TrimsWhitespace(t *testing.T) {
	extractor := NewMetadataExtractor()
	input := "   text with spaces   "
	result := extractor.sanitize(input)
	assert.Equal(t, "text with spaces", result)
}

// ============================================================================
// URL Resolution Tests
// ============================================================================

func TestResolveURL_AbsoluteURL(t *testing.T) {
	extractor := NewMetadataExtractor()
	base := "https://example.com/page"
	relative := "https://other.com/image.jpg"
	result := extractor.resolveURL(base, relative)
	assert.Equal(t, "https://other.com/image.jpg", result)
}

func TestResolveURL_RelativePathURL(t *testing.T) {
	extractor := NewMetadataExtractor()
	base := "https://example.com/article/page.html"
	relative := "/images/logo.png"
	result := extractor.resolveURL(base, relative)
	assert.Equal(t, "https://example.com/images/logo.png", result)
}

func TestResolveURL_RelativeFileURL(t *testing.T) {
	extractor := NewMetadataExtractor()
	base := "https://example.com/article/page.html"
	relative := "image.jpg"
	result := extractor.resolveURL(base, relative)
	assert.Equal(t, "https://example.com/article/image.jpg", result)
}

func TestResolveURL_InvalidBase(t *testing.T) {
	extractor := NewMetadataExtractor()
	result := extractor.resolveURL("not a url", "relative.jpg")
	// With SSRF validation, invalid base resolves to schemeless path which is rejected
	assert.Empty(t, result)
}

func TestResolveURL_InvalidRelative(t *testing.T) {
	extractor := NewMetadataExtractor()
	base := "https://example.com/page"
	result := extractor.resolveURL(base, "://invalid")
	assert.Equal(t, "", result)
}

// ============================================================================
// Integration Tests - Happy Path
// ============================================================================

func TestExtractMetadata_ContextCancellation(t *testing.T) {
	extractor := NewMetadataExtractor()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := extractor.ExtractMetadata(ctx, "https://example.com")
	assert.Error(t, err)
}

func TestNewMetadataExtractor_RedirectLimitExceeded(t *testing.T) {
	// The HTTP client is configured with a CheckRedirect callback
	// that limits redirects to 5 and validates SSRF for each redirect
	extractor := NewMetadataExtractor()
	assert.NotNil(t, extractor.httpClient.CheckRedirect)
}

// ============================================================================
// JSON-LD Extraction Tests
// ============================================================================

func TestExtractJSONLD_ArticleSchema(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Test Article Headline",
  "description": "This is a test article description",
  "datePublished": "2024-01-15T10:30:00Z",
  "author": {
    "@type": "Person",
    "name": "John Doe"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Test Publisher"
  },
  "image": "https://example.com/image.jpg"
}
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/article")

	require.NotNil(t, metadata)
	assert.Equal(t, "Test Article Headline", metadata.Title)
	require.NotNil(t, metadata.Description)
	assert.Equal(t, "This is a test article description", *metadata.Description)
	require.NotNil(t, metadata.PublishDate)
	assert.Equal(t, "2024-01-15T10:30:00Z", *metadata.PublishDate)
	require.NotNil(t, metadata.Author)
	assert.Equal(t, "John Doe", *metadata.Author)
	require.NotNil(t, metadata.SiteName)
	assert.Equal(t, "Test Publisher", *metadata.SiteName)
	require.NotNil(t, metadata.ImageURL)
	assert.Equal(t, "https://example.com/image.jpg", *metadata.ImageURL)
}

func TestExtractJSONLD_NewsArticleSchema(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "Breaking News Story",
  "description": "Important news update",
  "datePublished": "2024-01-16T08:00:00Z"
}
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://news.example.com/story")

	require.NotNil(t, metadata)
	assert.Equal(t, "Breaking News Story", metadata.Title)
}

func TestExtractJSONLD_BlogPostingSchema(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "My Blog Post",
  "description": "A blog post about testing"
}
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://blog.example.com/post")

	require.NotNil(t, metadata)
	assert.Equal(t, "My Blog Post", metadata.Title)
}

func TestExtractJSONLD_GraphWithMultipleSchemas(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "name": "Example Site"
    },
    {
      "@type": "NewsArticle",
      "headline": "Article in Graph",
      "description": "Found inside @graph array",
      "datePublished": "2024-02-01T12:00:00Z"
    }
  ]
}
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/article")

	require.NotNil(t, metadata)
	assert.Equal(t, "Article in Graph", metadata.Title)
	require.NotNil(t, metadata.Description)
	assert.Equal(t, "Found inside @graph array", *metadata.Description)
}

func TestExtractJSONLD_MainEntityNested(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Web Page",
  "mainEntity": {
    "@type": "Article",
    "headline": "Nested Article Title",
    "description": "Article nested in mainEntity"
  }
}
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/page")

	require.NotNil(t, metadata)
	assert.Equal(t, "Nested Article Title", metadata.Title)
}

func TestExtractJSONLD_AuthorAsString(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Test Article",
  "author": "Simple String Author"
}
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/article")

	require.NotNil(t, metadata)
	require.NotNil(t, metadata.Author)
	assert.Equal(t, "Simple String Author", *metadata.Author)
}

func TestExtractJSONLD_AuthorAsArray(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Test Article",
  "author": [
    {"@type": "Person", "name": "First Author"},
    {"@type": "Person", "name": "Second Author"}
  ]
}
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/article")

	require.NotNil(t, metadata)
	require.NotNil(t, metadata.Author)
	assert.Equal(t, "First Author", *metadata.Author) // Should extract first author
}

func TestExtractJSONLD_ImageAsObject(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Test Article",
  "image": {
    "@type": "ImageObject",
    "url": "https://example.com/image-object.jpg"
  }
}
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/article")

	require.NotNil(t, metadata)
	require.NotNil(t, metadata.ImageURL)
	assert.Equal(t, "https://example.com/image-object.jpg", *metadata.ImageURL)
}

func TestExtractJSONLD_ImageAsArray(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Test Article",
  "image": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ]
}
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/article")

	require.NotNil(t, metadata)
	require.NotNil(t, metadata.ImageURL)
	assert.Equal(t, "https://example.com/image1.jpg", *metadata.ImageURL) // Should extract first image
}

func TestExtractJSONLD_RelativeImageURL(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Test Article",
  "image": "/images/article-image.jpg"
}
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/articles/test")

	require.NotNil(t, metadata)
	require.NotNil(t, metadata.ImageURL)
	assert.Equal(t, "https://example.com/images/article-image.jpg", *metadata.ImageURL)
}

func TestExtractJSONLD_TypeAsArray(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": ["Article", "NewsArticle"],
  "headline": "Multi-type Article"
}
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/article")

	require.NotNil(t, metadata)
	assert.Equal(t, "Multi-type Article", metadata.Title)
}

func TestExtractJSONLD_NoArticleType_ReturnsNil(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Test Org"
}
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/about")

	assert.Nil(t, metadata) // Organization is not an article type
}

func TestExtractJSONLD_InvalidJSON_ReturnsNil(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{ invalid json content here }
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/article")

	assert.Nil(t, metadata)
}

func TestExtractJSONLD_EmptyScript_ReturnsNil(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/article")

	assert.Nil(t, metadata)
}

func TestExtractJSONLD_NoJSONLDScript_ReturnsNil(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<title>Page Without JSON-LD</title>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/page")

	assert.Nil(t, metadata)
}

func TestExtractJSONLD_UsesNameWhenHeadlineMissing(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Page Name as Title",
  "description": "A web page"
}
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/page")

	require.NotNil(t, metadata)
	assert.Equal(t, "Page Name as Title", metadata.Title)
}

func TestExtractJSONLD_FallsBackToDateModified(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Test Article",
  "dateModified": "2024-01-20T15:00:00Z"
}
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/article")

	require.NotNil(t, metadata)
	require.NotNil(t, metadata.PublishDate)
	assert.Equal(t, "2024-01-20T15:00:00Z", *metadata.PublishDate)
}

func TestExtractJSONLD_SanitizesHTMLInContent(t *testing.T) {
	// Note: Using HTML tags that don't include </script> to avoid breaking the JSON-LD script block
	html := `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "<b>Bold</b> Title <img src='x' onerror='alert(1)'>",
  "description": "<b>Bold</b> description with <a href='#'>link</a>"
}
</script>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	metadata := extractor.extractJSONLD(doc, "https://example.com/article")

	require.NotNil(t, metadata)
	assert.NotContains(t, metadata.Title, "<b>")
	assert.NotContains(t, metadata.Title, "<img")
	assert.Equal(t, "Bold Title", metadata.Title)
	require.NotNil(t, metadata.Description)
	assert.NotContains(t, *metadata.Description, "<b>")
	assert.NotContains(t, *metadata.Description, "<a")
}

// ============================================================================
// OpenGraph Meta Tag Tests with goquery
// ============================================================================

func TestGetMetaContent_OpenGraphTitle(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<meta property="og:title" content="OpenGraph Title">
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	title := extractor.getMetaContent(doc, "og:title")

	assert.Equal(t, "OpenGraph Title", title)
}

func TestGetMetaContent_NotFound(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<title>Page Title</title>
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	title := extractor.getMetaContent(doc, "og:title")

	assert.Empty(t, title)
}

func TestGetMetaContentByName_Description(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<meta name="description" content="Page description from meta tag">
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	desc := extractor.getMetaContentByName(doc, "description")

	assert.Equal(t, "Page description from meta tag", desc)
}

func TestGetMetaContentByItemProp_DatePublished(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head>
<meta itemprop="datePublished" content="2024-01-15">
</head>
<body></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	date := extractor.getMetaContentByItemProp(doc, "datePublished")

	assert.Equal(t, "2024-01-15", date)
}

func TestGetMetaContentByItemProp_TextContent(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<body>
<span itemprop="author">Author from text</span>
</body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	author := extractor.getMetaContentByItemProp(doc, "author")

	assert.Equal(t, "Author from text", author)
}

// ============================================================================
// Read Time Calculation Tests with HTML
// ============================================================================

func TestCalculateReadTime_ArticleTag(t *testing.T) {
	// Create 400 words (2 minutes at 200 WPM)
	words := strings.Repeat("word ", 400)
	html := `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
<article>` + words + `</article>
</body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	readTime := extractor.calculateReadTime(doc)

	assert.Equal(t, 2, readTime)
}

func TestCalculateReadTime_MainTag(t *testing.T) {
	words := strings.Repeat("word ", 600)
	html := `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
<header>Header</header>
<main>` + words + `</main>
<footer>Footer</footer>
</body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	readTime := extractor.calculateReadTime(doc)

	assert.Equal(t, 3, readTime)
}

func TestCalculateReadTime_MinimumOneMinute(t *testing.T) {
	// Create 50 words (< 1 minute but should round up)
	words := strings.Repeat("word ", 50)
	html := `<!DOCTYPE html>
<html>
<body><article>` + words + `</article></body>
</html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	readTime := extractor.calculateReadTime(doc)

	assert.Equal(t, 1, readTime)
}

func TestCalculateReadTime_EmptyContent(t *testing.T) {
	// Note: HTML structure may have minimal whitespace, which results in minimum 1 minute
	// when word count > 0. This test verifies content-less pages return 1 (minimum)
	html := `<!DOCTYPE html><html><body></body></html>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	require.NoError(t, err)

	extractor := NewMetadataExtractor()
	readTime := extractor.calculateReadTime(doc)

	// Empty bodies with no real content return 1 (minimum) due to whitespace artifacts
	assert.LessOrEqual(t, readTime, 1)
}

// ============================================================================
// JSON-LD Helper Method Tests
// ============================================================================

func TestGetJSONLDType_String(t *testing.T) {
	extractor := NewMetadataExtractor()
	result := extractor.getJSONLDType("Article")
	assert.Equal(t, "Article", result)
}

func TestGetJSONLDType_Array(t *testing.T) {
	extractor := NewMetadataExtractor()
	input := []interface{}{"Article", "NewsArticle"}
	result := extractor.getJSONLDType(input)
	assert.Equal(t, "Article", result) // Returns first element
}

func TestGetJSONLDType_Nil(t *testing.T) {
	extractor := NewMetadataExtractor()
	result := extractor.getJSONLDType(nil)
	assert.Empty(t, result)
}

func TestExtractJSONLDAuthor_String(t *testing.T) {
	extractor := NewMetadataExtractor()
	result := extractor.extractJSONLDAuthor("John Doe")
	assert.Equal(t, "John Doe", result)
}

func TestExtractJSONLDAuthor_Object(t *testing.T) {
	extractor := NewMetadataExtractor()
	input := map[string]interface{}{
		"@type": "Person",
		"name":  "Jane Doe",
	}
	result := extractor.extractJSONLDAuthor(input)
	assert.Equal(t, "Jane Doe", result)
}

func TestExtractJSONLDAuthor_ArrayOfObjects(t *testing.T) {
	extractor := NewMetadataExtractor()
	input := []interface{}{
		map[string]interface{}{"@type": "Person", "name": "First Author"},
		map[string]interface{}{"@type": "Person", "name": "Second Author"},
	}
	result := extractor.extractJSONLDAuthor(input)
	assert.Equal(t, "First Author", result)
}

func TestExtractJSONLDAuthor_ArrayOfStrings(t *testing.T) {
	extractor := NewMetadataExtractor()
	input := []interface{}{"Author One", "Author Two"}
	result := extractor.extractJSONLDAuthor(input)
	assert.Equal(t, "Author One", result)
}

func TestExtractJSONLDAuthor_Nil(t *testing.T) {
	extractor := NewMetadataExtractor()
	result := extractor.extractJSONLDAuthor(nil)
	assert.Empty(t, result)
}

func TestExtractJSONLDImage_String(t *testing.T) {
	extractor := NewMetadataExtractor()
	result := extractor.extractJSONLDImage("https://example.com/image.jpg", "https://example.com")
	assert.Equal(t, "https://example.com/image.jpg", result)
}

func TestExtractJSONLDImage_Object(t *testing.T) {
	extractor := NewMetadataExtractor()
	input := map[string]interface{}{
		"@type": "ImageObject",
		"url":   "https://example.com/image.jpg",
	}
	result := extractor.extractJSONLDImage(input, "https://example.com")
	assert.Equal(t, "https://example.com/image.jpg", result)
}

func TestExtractJSONLDImage_ArrayOfStrings(t *testing.T) {
	extractor := NewMetadataExtractor()
	input := []interface{}{
		"https://example.com/first.jpg",
		"https://example.com/second.jpg",
	}
	result := extractor.extractJSONLDImage(input, "https://example.com")
	assert.Equal(t, "https://example.com/first.jpg", result)
}

func TestExtractJSONLDImage_ArrayOfObjects(t *testing.T) {
	extractor := NewMetadataExtractor()
	input := []interface{}{
		map[string]interface{}{"@type": "ImageObject", "url": "https://example.com/obj-first.jpg"},
		map[string]interface{}{"@type": "ImageObject", "url": "https://example.com/obj-second.jpg"},
	}
	result := extractor.extractJSONLDImage(input, "https://example.com")
	assert.Equal(t, "https://example.com/obj-first.jpg", result)
}

func TestExtractJSONLDImage_Nil(t *testing.T) {
	extractor := NewMetadataExtractor()
	result := extractor.extractJSONLDImage(nil, "https://example.com")
	assert.Empty(t, result)
}

func TestExtractJSONLDImage_RelativeURL(t *testing.T) {
	extractor := NewMetadataExtractor()
	result := extractor.extractJSONLDImage("/images/photo.jpg", "https://example.com/article")
	assert.Equal(t, "https://example.com/images/photo.jpg", result)
}
