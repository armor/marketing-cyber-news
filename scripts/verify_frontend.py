#!/usr/bin/env python3
"""
Frontend Verification Script using Playwright
Checks the ACI frontend for proper data display and identifies missing features.
"""

import asyncio
import json
import os
from datetime import datetime
from playwright.async_api import async_playwright, Page

BASE_URL = "http://localhost:5173"
SCREENSHOT_DIR = "/Users/phillipboles/Development/n8n-cyber-news/scripts/screenshots"

# Ensure screenshot directory exists
os.makedirs(SCREENSHOT_DIR, exist_ok=True)


async def take_screenshot(page: Page, name: str) -> str:
    """Take a screenshot and return the path."""
    path = f"{SCREENSHOT_DIR}/{name}.png"
    await page.screenshot(path=path, full_page=True)
    print(f"  Screenshot saved: {path}")
    return path


async def check_page_content(page: Page, description: str) -> dict:
    """Analyze page content and return findings."""
    result = {
        "description": description,
        "url": page.url,
        "title": await page.title(),
        "findings": [],
        "issues": [],
        "elements": {}
    }

    # Check for common UI elements
    checks = [
        ("header", "header, [role='banner'], nav"),
        ("sidebar", "aside, [role='navigation'], .sidebar"),
        ("main_content", "main, [role='main'], .main-content"),
        ("footer", "footer, [role='contentinfo']"),
        ("loading_spinner", ".loading, .spinner, [aria-busy='true']"),
        ("error_message", ".error, [role='alert'], .alert-error"),
        ("empty_state", ".empty-state, .no-data, .no-results"),
        ("article_cards", "[data-testid*='article'], .article-card, .threat-card, .card"),
        ("data_table", "table, [role='grid'], .data-table"),
        ("charts", "canvas, svg.chart, .recharts-wrapper, [data-testid*='chart']"),
        ("filters", ".filter, [data-testid*='filter'], .search-input, input[type='search']"),
        ("pagination", ".pagination, [aria-label*='pagination'], nav[aria-label*='page']"),
        ("buttons", "button, [role='button']"),
        ("links", "a[href]"),
    ]

    for name, selector in checks:
        try:
            elements = await page.locator(selector).all()
            count = len(elements)
            result["elements"][name] = count
            if count > 0:
                result["findings"].append(f"Found {count} {name.replace('_', ' ')} element(s)")
        except Exception as e:
            result["elements"][name] = 0

    # Get visible text content
    try:
        body_text = await page.locator("body").inner_text()
        result["text_length"] = len(body_text)

        # Check for specific content patterns
        if "login" in body_text.lower() or "sign in" in body_text.lower():
            result["findings"].append("Login/Sign in form detected")
        if "error" in body_text.lower():
            result["issues"].append("Error text detected on page")
        if "loading" in body_text.lower():
            result["findings"].append("Loading state detected")
        if "no data" in body_text.lower() or "no results" in body_text.lower():
            result["issues"].append("Empty state / No data detected")

    except Exception as e:
        result["issues"].append(f"Could not read page text: {e}")

    return result


async def verify_frontend():
    """Main verification function."""
    print("=" * 70)
    print("ACI Frontend Verification")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 70)
    print()

    report = {
        "timestamp": datetime.now().isoformat(),
        "base_url": BASE_URL,
        "pages": [],
        "summary": {
            "working": [],
            "issues": [],
            "missing": []
        }
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1
        )
        page = await context.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"    [Console] {msg.type}: {msg.text}") if msg.type in ["error", "warning"] else None)

        # 1. Check Landing Page / Login
        print("1. Checking Landing Page...")
        try:
            await page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)
            result = await check_page_content(page, "Landing Page")
            await take_screenshot(page, "01_landing_page")
            report["pages"].append(result)

            # Check if we're redirected to login
            if "login" in page.url.lower() or "auth" in page.url.lower():
                report["summary"]["working"].append("Authentication redirect working")
                print(f"  Redirected to: {page.url}")
            else:
                print(f"  Current URL: {page.url}")
        except Exception as e:
            print(f"  ERROR: {e}")
            report["summary"]["issues"].append(f"Landing page error: {e}")
        print()

        # 2. Check Login Page
        print("2. Checking Login Page...")
        try:
            await page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(1000)
            result = await check_page_content(page, "Login Page")
            await take_screenshot(page, "02_login_page")
            report["pages"].append(result)

            # Check for login form elements
            email_input = await page.locator("input[type='email'], input[name='email'], #email").count()
            password_input = await page.locator("input[type='password']").count()
            submit_btn = await page.locator("button[type='submit'], input[type='submit']").count()

            if email_input > 0 and password_input > 0:
                report["summary"]["working"].append("Login form present with email and password fields")
            else:
                report["summary"]["issues"].append("Login form missing required fields")

        except Exception as e:
            print(f"  ERROR: {e}")
            report["summary"]["issues"].append(f"Login page error: {e}")
        print()

        # 3. Try to login with test credentials (if any exist)
        print("3. Attempting Login...")
        try:
            # Fill login form
            await page.fill("input[type='email'], input[name='email'], #email", "admin@example.com")
            await page.fill("input[type='password']", "admin123")
            await take_screenshot(page, "03_login_filled")

            # Click submit
            await page.click("button[type='submit'], input[type='submit']")
            await page.wait_for_timeout(3000)
            await take_screenshot(page, "04_after_login")

            result = await check_page_content(page, "After Login Attempt")
            report["pages"].append(result)

            # Check if login succeeded
            if "login" not in page.url.lower() and "auth" not in page.url.lower():
                report["summary"]["working"].append("Login succeeded - redirected to app")
                print(f"  Login successful, now at: {page.url}")
            else:
                report["summary"]["issues"].append("Login may have failed - still on login page")
                print(f"  Still on: {page.url}")

        except Exception as e:
            print(f"  Login attempt error: {e}")
            report["summary"]["issues"].append(f"Login attempt error: {e}")
        print()

        # 4. Check Dashboard
        print("4. Checking Dashboard...")
        try:
            await page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)
            result = await check_page_content(page, "Dashboard Page")
            await take_screenshot(page, "05_dashboard")
            report["pages"].append(result)

            # Check for dashboard components
            if result["elements"].get("charts", 0) > 0:
                report["summary"]["working"].append("Dashboard charts present")
            else:
                report["summary"]["missing"].append("Dashboard charts not found")

            if result["elements"].get("article_cards", 0) > 0:
                report["summary"]["working"].append(f"Dashboard shows {result['elements']['article_cards']} cards/items")
            else:
                report["summary"]["missing"].append("No data cards found on dashboard")

        except Exception as e:
            print(f"  ERROR: {e}")
            report["summary"]["issues"].append(f"Dashboard error: {e}")
        print()

        # 5. Check Threats/Articles Page
        print("5. Checking Threats/Articles Page...")
        for path in ["/threats", "/articles", "/"]:
            try:
                await page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(2000)

                if "login" not in page.url.lower():
                    result = await check_page_content(page, f"Threats Page ({path})")
                    await take_screenshot(page, f"06_threats_{path.replace('/', '_')}")
                    report["pages"].append(result)

                    if result["elements"].get("article_cards", 0) > 0:
                        report["summary"]["working"].append(f"Threats page ({path}) shows {result['elements']['article_cards']} items")
                        break
                    elif result["elements"].get("data_table", 0) > 0:
                        report["summary"]["working"].append(f"Threats page ({path}) has data table")
                        break

            except Exception as e:
                print(f"  Error on {path}: {e}")
        print()

        # 6. Check for API connectivity
        print("6. Checking Network Requests...")
        network_errors = []
        api_calls = []

        async def log_request(request):
            if "/api/" in request.url or "/v1/" in request.url:
                api_calls.append(request.url)

        async def log_response(response):
            if "/api/" in response.url or "/v1/" in response.url:
                if response.status >= 400:
                    network_errors.append(f"{response.status} on {response.url}")

        page.on("request", log_request)
        page.on("response", log_response)

        # Reload page to capture requests
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(3000)

        if api_calls:
            report["summary"]["working"].append(f"API calls detected: {len(api_calls)}")
            print(f"  API calls made: {api_calls[:5]}")
        else:
            report["summary"]["issues"].append("No API calls detected")

        if network_errors:
            report["summary"]["issues"].extend([f"Network error: {e}" for e in network_errors])
            print(f"  Network errors: {network_errors}")
        print()

        # 7. Check Navigation
        print("7. Checking Navigation...")
        try:
            nav_links = await page.locator("nav a, aside a, .sidebar a").all()
            link_texts = []
            for link in nav_links[:10]:
                try:
                    text = await link.inner_text()
                    href = await link.get_attribute("href")
                    if text.strip():
                        link_texts.append(f"{text.strip()} -> {href}")
                except:
                    pass

            if link_texts:
                report["summary"]["working"].append(f"Navigation has {len(link_texts)} links")
                print(f"  Navigation links: {link_texts[:5]}")
            else:
                report["summary"]["missing"].append("No navigation links found")
        except Exception as e:
            print(f"  Navigation check error: {e}")
        print()

        await browser.close()

    # Print Summary
    print("=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)

    print("\nWORKING:")
    for item in report["summary"]["working"]:
        print(f"  [OK] {item}")

    print("\nISSUES:")
    for item in report["summary"]["issues"]:
        print(f"  [!!] {item}")

    print("\nMISSING/NOT FOUND:")
    for item in report["summary"]["missing"]:
        print(f"  [??] {item}")

    print(f"\nScreenshots saved to: {SCREENSHOT_DIR}")

    # Save report
    report_path = f"{SCREENSHOT_DIR}/verification_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Full report saved to: {report_path}")

    return report


if __name__ == "__main__":
    asyncio.run(verify_frontend())
