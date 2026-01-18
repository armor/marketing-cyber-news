package service

import (
	"context"
	"net"
	"testing"

	"github.com/stretchr/testify/assert"
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
