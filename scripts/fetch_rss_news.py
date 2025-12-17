#!/usr/bin/env python3
"""
RSS News Fetcher for ACI Backend
Fetches cybersecurity news from RSS feeds and posts to the ACI webhook.
"""

import hashlib
import hmac
import json
import re
import sys
from datetime import datetime
from typing import Optional
from urllib.request import urlopen, Request
from urllib.error import URLError
from xml.etree import ElementTree as ET


WEBHOOK_URL = "http://localhost:8080/v1/webhooks/n8n"
WEBHOOK_SECRET = "dev_webhook_secret_local"

RSS_FEEDS = [
    {"url": "https://feeds.feedburner.com/TheHackersNews", "name": "The Hacker News"},
    {"url": "https://www.bleepingcomputer.com/feed/", "name": "BleepingComputer"},
]

CATEGORY_KEYWORDS = {
    "vulnerabilities": ["vulnerability", "cve", "exploit", "zero-day", "patch", "security flaw", "bug"],
    "ransomware": ["ransomware", "lockbit", "blackcat", "alphv", "conti", "ransom"],
    "data-breaches": ["breach", "leak", "exposed", "compromised", "stolen data"],
    "malware": ["malware", "trojan", "virus", "backdoor", "rat", "infostealer", "botnet"],
    "phishing": ["phishing", "scam", "social engineering", "bec", "email attack"],
    "threat-actors": ["apt", "threat actor", "hacker group", "nation-state", "lazarus", "apt29"],
    "compliance": ["compliance", "regulation", "gdpr", "hipaa", "pci"],
}

SEVERITY_KEYWORDS = {
    "critical": ["critical", "urgent", "emergency", "zero-day", "actively exploited", "rce"],
    "high": ["high", "severe", "major", "important", "exploit"],
    "low": ["low", "minor", "informational"],
}


def create_hmac_signature(payload: bytes, secret: str) -> str:
    """Create HMAC-SHA256 signature for webhook authentication."""
    mac = hmac.new(secret.encode(), payload, hashlib.sha256)
    return f"sha256={mac.hexdigest()}"


def categorize_article(title: str, content: str) -> str:
    """Determine article category based on keywords."""
    text = (title + " " + content).lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text:
                return category
    return "industry-news"


def determine_severity(title: str, content: str) -> str:
    """Determine article severity based on keywords."""
    text = (title + " " + content).lower()
    for severity, keywords in SEVERITY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text:
                return severity
    return "medium"


def extract_cves(text: str) -> list[str]:
    """Extract CVE identifiers from text."""
    pattern = r"CVE-\d{4}-\d+"
    matches = re.findall(pattern, text, re.IGNORECASE)
    return list(set(cve.upper() for cve in matches))


def generate_tags(title: str) -> list[str]:
    """Generate tags from article title."""
    stop_words = {"the", "a", "an", "is", "in", "on", "at", "for", "to", "of", "and", "or", "with", "by", "from"}
    words = re.findall(r"\b[a-zA-Z]{4,}\b", title.lower())
    tags = [w for w in words if w not in stop_words][:5]
    return tags


def parse_rss_item(item: ET.Element, source_name: str, namespaces: dict) -> Optional[dict]:
    """Parse an RSS item into article data."""
    title_elem = item.find("title")
    link_elem = item.find("link")
    desc_elem = item.find("description")
    pub_date_elem = item.find("pubDate")

    if title_elem is None or title_elem.text is None:
        return None

    title = title_elem.text.strip()
    link = link_elem.text.strip() if link_elem is not None and link_elem.text else ""
    description = ""

    if desc_elem is not None and desc_elem.text:
        # Remove CDATA and HTML tags
        description = re.sub(r"<!\[CDATA\[|\]\]>", "", desc_elem.text)
        description = re.sub(r"<[^>]+>", "", description)
        description = description.strip()

    pub_date = ""
    if pub_date_elem is not None and pub_date_elem.text:
        pub_date = pub_date_elem.text.strip()

    category = categorize_article(title, description)
    severity = determine_severity(title, description)
    cves = extract_cves(title + " " + description)
    tags = generate_tags(title)

    return {
        "title": title[:500],
        "content": description[:10000],
        "summary": description[:300],
        "category_slug": category,
        "severity": severity,
        "tags": tags,
        "source_url": link,
        "source_name": source_name,
        "cves": cves,
        "vendors": [],
        "skip_enrichment": False,
    }


def fetch_rss_feed(url: str) -> Optional[ET.Element]:
    """Fetch and parse an RSS feed."""
    try:
        req = Request(url, headers={"User-Agent": "ACI-RSS-Fetcher/1.0"})
        with urlopen(req, timeout=30) as response:
            content = response.read()
            return ET.fromstring(content)
    except (URLError, ET.ParseError) as e:
        print(f"Error fetching {url}: {e}")
        return None


def post_to_webhook(article_data: dict) -> bool:
    """Post article data to the ACI webhook."""
    payload = {
        "event_type": "article.created",
        "data": article_data,
        "metadata": {
            "workflow_id": "rss-fetcher",
            "execution_id": datetime.utcnow().isoformat(),
            "timestamp": datetime.utcnow().isoformat(),
        },
    }

    payload_bytes = json.dumps(payload).encode("utf-8")
    signature = create_hmac_signature(payload_bytes, WEBHOOK_SECRET)

    headers = {
        "Content-Type": "application/json",
        "X-N8N-Signature": signature,
    }

    try:
        req = Request(WEBHOOK_URL, data=payload_bytes, headers=headers, method="POST")
        with urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode())
            print(f"  Posted: {article_data['title'][:60]}... -> Status: {result.get('status', 'unknown')}")
            return True
    except URLError as e:
        print(f"  Error posting article: {e}")
        return False


def main():
    """Main entry point."""
    print("=" * 60)
    print("ACI RSS News Fetcher")
    print("=" * 60)
    print(f"Webhook URL: {WEBHOOK_URL}")
    print(f"Feeds to process: {len(RSS_FEEDS)}")
    print()

    total_articles = 0
    success_count = 0

    for feed_info in RSS_FEEDS:
        url = feed_info["url"]
        source_name = feed_info["name"]

        print(f"Processing: {source_name}")
        print(f"  URL: {url}")

        root = fetch_rss_feed(url)
        if root is None:
            print(f"  Failed to fetch feed")
            continue

        # Find items in various RSS structures
        items = root.findall(".//item")
        if not items:
            items = root.findall(".//{http://www.w3.org/2005/Atom}entry")

        print(f"  Found {len(items)} items")

        # Process up to 10 items per feed
        for item in items[:10]:
            article_data = parse_rss_item(item, source_name, {})
            if article_data:
                total_articles += 1
                if post_to_webhook(article_data):
                    success_count += 1

        print()

    print("=" * 60)
    print(f"Summary: {success_count}/{total_articles} articles posted successfully")
    print("=" * 60)

    return 0 if success_count > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
