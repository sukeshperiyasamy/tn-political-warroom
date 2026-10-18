import urllib.request
import urllib.parse
import urllib.error
import ssl
import time
import html
import re
import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import feedparser

from .source_registry import source_registry
from .ai_intelligence import AIIntelligenceService

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Query parameters that do not alter article content and should be stripped during canonicalization
TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "utm_id", "utm_reader", "fbclid", "gclid", "igshid", "mc_cid", "mc_eid",
    "ref", "ref_src", "at_medium", "at_campaign", "campaign", "from",
    "_hsenc", "_hsmi", "feature"
}

class RSSIngestionEngine:
    def __init__(self):
        self.ai_service = AIIntelligenceService()
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE

    def clean_html(self, raw_html: str) -> str:
        if not raw_html:
            return ""
        # Remove script and style tags
        cleaned = re.sub(r'<script.*?</script>', '', raw_html, flags=re.DOTALL | re.IGNORECASE)
        cleaned = re.sub(r'<style.*?</style>', '', cleaned, flags=re.DOTALL | re.IGNORECASE)
        # Remove html tags
        cleaned = re.sub(r'<[^>]+>', ' ', cleaned)
        # Unescape HTML entities
        cleaned = html.unescape(cleaned)
        # Remove consecutive whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def normalize_url(self, raw_url: str) -> str:
        """
        Normalizes a URL to a stable canonical form for deduplication:
        - Lowercases scheme and netloc
        - Drops default ports
        - Strips tracking query parameters while preserving meaningful identifiers
        - Deterministically sorts remaining query parameters
        - Drops trailing slash on paths (except root /)
        - Drops fragment identifiers
        """
        if not raw_url:
            return ""
        try:
            parsed = urllib.parse.urlparse(raw_url.strip())
            if not parsed.netloc:
                return raw_url.strip()

            # Filter tracking query parameters
            query_params = urllib.parse.parse_qs(parsed.query, keep_blank_values=False)
            filtered_params = {
                k: v for k, v in query_params.items()
                if k.lower() not in TRACKING_PARAMS
            }

            # Deterministic parameter ordering
            sorted_query = urllib.parse.urlencode(
                sorted(filtered_params.items()),
                doseq=True
            )

            # Strip trailing slash from path
            clean_path = parsed.path.rstrip("/")
            if not clean_path:
                clean_path = "/"

            # Normalize hostname (lowercase, drop default port)
            netloc = parsed.netloc.lower()
            if netloc.endswith(":80") and parsed.scheme.lower() == "http":
                netloc = netloc[:-3]
            elif netloc.endswith(":443") and parsed.scheme.lower() == "https":
                netloc = netloc[:-4]

            normalized = urllib.parse.urlunparse((
                parsed.scheme.lower(),
                netloc,
                clean_path,
                "", # params
                sorted_query,
                ""  # fragment stripped
            ))
            return normalized
        except Exception:
            return raw_url.strip()

    def parse_pubdate(self, date_str: str) -> str:
        if not date_str:
            return datetime.now(timezone.utc).isoformat()
        try:
            dt = parsedate_to_datetime(date_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat()
        except Exception:
            pass

        try:
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat()
        except Exception:
            pass

        return datetime.now(timezone.utc).isoformat()

    def test_feed(self, rss_url: str) -> Dict[str, Any]:
        """
        Tests a feed URL without persisting. Returns health status, item count, sample items, latency.
        """
        start_time = time.time()
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
        }

        try:
            req = urllib.request.Request(rss_url, headers=headers)
            with urllib.request.urlopen(req, context=self.ssl_context, timeout=8) as resp:
                status_code = resp.status
                raw_data = resp.read()
                latency_ms = int((time.time() - start_time) * 1000)
                etag = resp.headers.get("ETag") or resp.headers.get("etag")
                last_modified = resp.headers.get("Last-Modified") or resp.headers.get("last-modified")

                feed = feedparser.parse(raw_data)
                entries = feed.entries or []

                items_data = []
                for entry in entries[:5]:
                    title = self.clean_html(entry.get("title", ""))
                    link = self.normalize_url(entry.get("link", ""))
                    pub_date = entry.get("published", "") or entry.get("updated", "")
                    items_data.append({
                        "title": title,
                        "link": link,
                        "published_at": pub_date
                    })

                return {
                    "status": "success",
                    "status_code": status_code,
                    "latency_ms": latency_ms,
                    "items_count": len(entries),
                    "sample_items": items_data,
                    "etag": etag,
                    "last_modified": last_modified,
                    "error": None
                }
        except urllib.error.HTTPError as e:
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "status": "error",
                "status_code": e.code,
                "latency_ms": latency_ms,
                "items_count": 0,
                "sample_items": [],
                "error": f"HTTP {e.code}: {e.reason}"
            }
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "status": "error",
                "status_code": 0,
                "latency_ms": latency_ms,
                "items_count": 0,
                "sample_items": [],
                "error": str(e)
            }

    async def ingest_source(self, source: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fetches, parses, enriches with political AI, and persists articles from one source.
        Supports conditional HTTP requests (ETag & Last-Modified) with HTTP 304 Not Modified handling.
        """
        source_id = source["id"]
        source_name = source["name"]
        rss_url = source["rss_url"]
        saved_etag = source.get("etag")
        saved_last_modified = source.get("last_modified")
        start_time = time.time()

        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
        }
        if saved_etag:
            headers["If-None-Match"] = saved_etag
        if saved_last_modified:
            headers["If-Modified-Since"] = saved_last_modified

        # 1. Fetch feed with conditional validation
        try:
            req = urllib.request.Request(rss_url, headers=headers)
            with urllib.request.urlopen(req, context=self.ssl_context, timeout=12) as resp:
                status_code = resp.status
                resp_etag = resp.headers.get("ETag") or resp.headers.get("etag") or saved_etag
                resp_last_modified = resp.headers.get("Last-Modified") or resp.headers.get("last-modified") or saved_last_modified
                xml_data = resp.read()

        except urllib.error.HTTPError as e:
            duration_ms = int((time.time() - start_time) * 1000)
            if e.code == 304:
                # HTTP 304 Not Modified: Feed is healthy and unchanged
                source_registry.update_source_fetch_status(
                    source_id=source_id,
                    health_status="healthy",
                    fetch_status="not_modified_304",
                    last_error=None,
                    new_articles_count=0,
                    skipped_duplicates_count=0,
                    etag=saved_etag,
                    last_modified=saved_last_modified
                )
                source_registry.record_log(
                    source_id=source_id,
                    source_name=source_name,
                    status="not_modified_304",
                    items_found=0,
                    new_items_added=0,
                    skipped_duplicates=0,
                    http_status=304,
                    duration_ms=duration_ms,
                    error_message=None
                )
                return {
                    "source_id": source_id,
                    "source_name": source_name,
                    "status": "not_modified_304",
                    "http_status": 304,
                    "items_found": 0,
                    "new_items_added": 0,
                    "skipped_duplicates": 0,
                    "duration_ms": duration_ms,
                    "error": None
                }
            else:
                err_msg = f"HTTP {e.code}: {e.reason}"
                source_registry.update_source_fetch_status(
                    source_id=source_id,
                    health_status="error",
                    fetch_status="http_error",
                    last_error=err_msg,
                    new_articles_count=0,
                    skipped_duplicates_count=0
                )
                source_registry.record_log(
                    source_id=source_id,
                    source_name=source_name,
                    status="error",
                    items_found=0,
                    new_items_added=0,
                    skipped_duplicates=0,
                    http_status=e.code,
                    duration_ms=duration_ms,
                    error_message=err_msg
                )
                return {
                    "source_id": source_id,
                    "source_name": source_name,
                    "status": "error",
                    "http_status": e.code,
                    "items_found": 0,
                    "new_items_added": 0,
                    "skipped_duplicates": 0,
                    "duration_ms": duration_ms,
                    "error": err_msg
                }

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            err_msg = str(e)
            source_registry.update_source_fetch_status(
                source_id=source_id,
                health_status="error",
                fetch_status="connection_error",
                last_error=err_msg,
                new_articles_count=0,
                skipped_duplicates_count=0
            )
            source_registry.record_log(
                source_id=source_id,
                source_name=source_name,
                status="error",
                items_found=0,
                new_items_added=0,
                skipped_duplicates=0,
                http_status=0,
                duration_ms=duration_ms,
                error_message=err_msg
            )
            return {
                "source_id": source_id,
                "source_name": source_name,
                "status": "error",
                "http_status": 0,
                "items_found": 0,
                "new_items_added": 0,
                "skipped_duplicates": 0,
                "duration_ms": duration_ms,
                "error": err_msg
            }

        # 2. Parse feed with feedparser
        feed = feedparser.parse(xml_data)
        entries = feed.entries or []

        new_articles_count = 0
        skipped_duplicates_count = 0
        updated_articles_count = 0
        latest_pub_date: Optional[str] = None

        # 3. Process entries with canonical deduplication & content versioning
        for entry in entries:
            raw_title = entry.get("title", "")
            raw_link = entry.get("link", "")
            publisher_guid = entry.get("id") or entry.get("guid") or ""

            canonical_url = self.normalize_url(raw_link)
            if not canonical_url and publisher_guid.startswith("http"):
                canonical_url = self.normalize_url(publisher_guid)

            if not raw_title or not canonical_url:
                continue

            # Publication date extraction
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                pub_date = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
            elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                pub_date = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc).isoformat()
            else:
                pub_date = self.parse_pubdate(entry.get("published", "") or entry.get("updated", ""))

            if latest_pub_date is None or pub_date > latest_pub_date:
                latest_pub_date = pub_date

            # Description / content extraction
            raw_desc = entry.get("summary", "") or entry.get("description", "")
            if hasattr(entry, "content") and entry.content:
                raw_desc = entry.content[0].get("value", raw_desc)

            title = self.clean_html(raw_title)
            description = self.clean_html(raw_desc) or title

            # Compute content hashes using AI configuration version
            content_hash = hashlib.sha256(f"{title}|{description}".encode("utf-8")).hexdigest()
            processing_version = getattr(self.ai_service, "CONFIG_VERSION", "v1.1-tamil-nlp")
            processing_hash = hashlib.sha256(f"{processing_version}|{content_hash}".encode("utf-8")).hexdigest()

            # Deduplication check against SQLite
            existing = source_registry.find_existing_article(
                canonical_url=canonical_url,
                source_url=raw_link,
                publisher_guid=publisher_guid
            )

            if existing:
                # Case A: Article already exists
                is_content_same = existing.get("content_hash") == content_hash
                is_proc_hash_same = existing.get("processing_hash") == processing_hash
                is_proc_success = existing.get("processing_status") == "processed"

                if is_content_same and is_proc_hash_same and is_proc_success:
                    # Content & analysis version unchanged and valid: touch last_seen_at WITHOUT invoking AI
                    source_registry.touch_article_seen(existing["id"])
                    skipped_duplicates_count += 1
                    continue
                else:
                    # Case B: Content was updated by publisher OR analysis config bumped OR prior processing failed
                    claimed = source_registry.claim_article_processing(existing["id"])
                    if not claimed and existing.get("processing_status") == "processing":
                        # Concurrently claimed by another worker; avoid duplicate execution
                        skipped_duplicates_count += 1
                        continue

                    try:
                        ai_intel = await self.ai_service.analyze_article(
                            text=description,
                            headline=title,
                            source=source_name
                        )
                        has_tamil_chars = any("\u0B80" <= c <= "\u0BFF" for c in title)
                        tamil_title = title if has_tamil_chars else ai_intel.tamil_variations[0].headline

                        updated_dict = {
                            "title": title,
                            "tamil_title": tamil_title,
                            "summary": description[:280] + ("..." if len(description) > 280 else ""),
                            "tamil_summary": ai_intel.tamil_summary,
                            "party_codes": ai_intel.identified_parties,
                            "leader_names": ai_intel.identified_leaders,
                            "sentiment": ai_intel.sentiment.value,
                            "sentiment_score": ai_intel.sentiment_score,
                            "topics": ai_intel.topics,
                            "tamil_variations": [v.model_dump() for v in ai_intel.tamil_variations],
                            "content_hash": content_hash,
                            "processing_hash": processing_hash,
                            "processing_status": "processed"
                        }
                        source_registry.update_article_content(existing["id"], updated_dict)
                        updated_articles_count += 1
                    except Exception:
                        # If AI fails on reprocess, preserve existing analysis without corrupting data
                        pass
                    continue

            # Case C: New article!
            article_id = "live-" + hashlib.sha256(canonical_url.encode("utf-8")).hexdigest()[:12]

            try:
                ai_intel = await self.ai_service.analyze_article(
                    text=description,
                    headline=title,
                    source=source_name
                )
                processing_status = "processed"
                has_tamil_chars = any("\u0B80" <= c <= "\u0BFF" for c in title)
                tamil_title = title if has_tamil_chars else ai_intel.tamil_variations[0].headline
                tamil_summary = ai_intel.tamil_summary
                party_codes = ai_intel.identified_parties
                leader_names = ai_intel.identified_leaders
                sentiment = ai_intel.sentiment.value
                sentiment_score = ai_intel.sentiment_score
                topics = ai_intel.topics
                variations = [v.model_dump() for v in ai_intel.tamil_variations]
            except Exception:
                # Never mark an article as processed if AI failed
                processing_status = "failed"
                has_tamil_chars = any("\u0B80" <= c <= "\u0BFF" for c in title)
                tamil_title = title
                tamil_summary = description[:280]
                party_codes = []
                leader_names = []
                sentiment = "neutral"
                sentiment_score = 0.0
                topics = ["State Politics"]
                variations = []

            # Deterministic estimated reach from URL hash
            hash_int = int(hashlib.md5(canonical_url.encode("utf-8")).hexdigest()[:6], 16)
            base_reach = 8500 + (hash_int % 14000)
            base_shares = 150 + (hash_int % 450)

            now_iso = datetime.now(timezone.utc).isoformat()
            article_dict = {
                "id": article_id,
                "source_id": source_id,
                "source_name": source_name,
                "title": title,
                "tamil_title": tamil_title,
                "summary": description[:280] + ("..." if len(description) > 280 else ""),
                "tamil_summary": tamil_summary,
                "source_url": raw_link,
                "canonical_url": canonical_url,
                "publisher_guid": publisher_guid or article_id,
                "published_at": pub_date,
                "party_codes": party_codes,
                "leader_names": leader_names,
                "sentiment": sentiment,
                "sentiment_score": sentiment_score,
                "topics": topics,
                "tamil_variations": variations,
                "engagement_estimated": {
                    "reach": base_reach,
                    "shares": base_shares
                },
                "data_status": "live_rss",
                "analysis_provider": "tamil_nlp_engine",
                "content_hash": content_hash,
                "processing_hash": processing_hash,
                "processing_status": processing_status,
                "processed_at": now_iso if processing_status == "processed" else None,
                "processing_attempts": 1,
                "last_seen_at": now_iso,
                "first_seen_at": now_iso
            }

            inserted = source_registry.save_article(article_dict)
            if inserted:
                new_articles_count += 1
            else:
                skipped_duplicates_count += 1

        # 4. Determine fetch health condition
        duration_ms = int((time.time() - start_time) * 1000)
        if len(entries) == 0:
            fetch_status = "empty_feed"
            health_status = "warning"
        elif new_articles_count > 0:
            fetch_status = "new_articles"
            health_status = "healthy"
        else:
            fetch_status = "no_new_articles"
            health_status = "healthy"

        # Check if the newest article is stale (older than 72 hours)
        if latest_pub_date:
            try:
                dt_pub = datetime.fromisoformat(latest_pub_date.replace("Z", "+00:00"))
                age_hours = (datetime.now(timezone.utc) - dt_pub).total_seconds() / 3600
                if age_hours > 72:
                    fetch_status = "stale_feed"
            except Exception:
                pass

        # 5. Persist source metadata and ingestion log
        source_registry.update_source_fetch_status(
            source_id=source_id,
            health_status=health_status,
            fetch_status=fetch_status,
            last_error=None,
            new_articles_count=new_articles_count,
            skipped_duplicates_count=skipped_duplicates_count,
            last_publication_at=latest_pub_date,
            etag=resp_etag,
            last_modified=resp_last_modified
        )

        source_registry.record_log(
            source_id=source_id,
            source_name=source_name,
            status=fetch_status,
            items_found=len(entries),
            new_items_added=new_articles_count,
            skipped_duplicates=skipped_duplicates_count,
            http_status=200,
            duration_ms=duration_ms,
            error_message=None
        )

        return {
            "source_id": source_id,
            "source_name": source_name,
            "status": fetch_status,
            "http_status": 200,
            "items_found": len(entries),
            "new_items_added": new_articles_count,
            "skipped_duplicates": skipped_duplicates_count,
            "updated_articles": updated_articles_count,
            "duration_ms": duration_ms,
            "error": None
        }

    async def ingest_all_enabled(self) -> List[Dict[str, Any]]:
        """
        Ingests all active, enabled sources in the registry.
        """
        sources = source_registry.get_all_sources()
        results = []
        for src in sources:
            if src.get("is_enabled"):
                res = await self.ingest_source(src)
                results.append(res)
        return results

rss_engine = RSSIngestionEngine()
