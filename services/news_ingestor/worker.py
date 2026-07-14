import asyncio
import hashlib
import logging
import xml.etree.ElementTree as ET
from datetime import datetime
import json
import httpx
from redis.asyncio import Redis

from znt_common.redis_keys import news_list_key, news_processed_set_key, news_stream_key

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}


class NewsIngestorWorker:
    def __init__(self, redis: Redis, feeds: dict[str, dict]):
        self.redis = redis
        self.feeds = feeds
        self.client = httpx.AsyncClient(timeout=10.0, headers=HEADERS)

    def _parse_rss(self, xml_content: str, source_name: str) -> list[dict]:
        """Parses RSS XML content and extracts news items."""
        items = []
        try:
            root = ET.fromstring(xml_content)
            channel = root.find("channel")
            if channel is None:
                return items

            for item_node in channel.findall("item"):
                title_node = item_node.find("title")
                link_node = item_node.find("link")
                pub_date_node = item_node.find("pubDate")
                desc_node = item_node.find("description")

                title = title_node.text.strip() if title_node is not None and title_node.text else "No Title"
                link = link_node.text.strip() if link_node is not None and link_node.text else ""
                pub_date = pub_date_node.text.strip() if pub_date_node is not None and pub_date_node.text else ""
                description = desc_node.text.strip() if desc_node is not None and desc_node.text else ""

                # Strip HTML tags from description if present
                if description and "<" in description:
                    # Basic clean up of HTML tags for terminal presentation
                    import re
                    description = re.sub(r"<[^>]*>", "", description).strip()

                if not link:
                    continue

                # Generate a deterministic unique ID based on the URL link
                article_id = hashlib.md5(link.encode("utf-8")).hexdigest()

                items.append({
                    "id": article_id,
                    "title": title,
                    "url": link,
                    "published_at": pub_date,
                    "description": description[:300],  # Truncate summary for terminal UI
                    "source": source_name,
                })
        except Exception as e:
            logger.error(f"Error parsing RSS XML for {source_name}: {e}")
        return items

    async def fetch_feed(self, name: str, url: str) -> list[dict]:
        """Fetches a single feed and returns its parsed items."""
        try:
            logger.info(f"[{name}] Fetching feed from: {url}")
            response = await self.client.get(url)
            if response.status_code == 200:
                return self._parse_rss(response.text, name)
            else:
                logger.error(f"[{name}] Failed to fetch feed, status code: {response.status_code}")
        except Exception as e:
            logger.error(f"[{name}] HTTP error fetching feed: {e}")
        return []

    async def process_feed_items(self, items: list[dict]) -> None:
        """Processes items, filters duplicates, and writes new items to Redis."""
        processed_count = 0
        for item in items:
            article_id = item["id"]
            
            # Check if this article has already been processed
            is_processed = await self.redis.sismember(news_processed_set_key(), article_id)
            if is_processed:
                continue

            # Add to processed set
            await self.redis.sadd(news_processed_set_key(), article_id)

            # JSON payload
            payload_str = json.dumps(item)

            # 1. Publish to Redis Stream for real-time WebSocket clients
            await self.redis.xadd(news_stream_key(), {"payload": payload_str}, maxlen=1000)

            # 2. Push to cache list (znt:news:latest) and trim to keep last 50
            await self.redis.lpush(news_list_key(), payload_str)
            await self.redis.ltrim(news_list_key(), 0, 49)

            processed_count += 1

        if processed_count > 0:
            logger.info(f"Processed and published {processed_count} new news items.")

    async def run_once(self) -> None:
        """Performs a single polling cycle over all active feeds."""
        tasks = []
        for name, config in self.feeds.items():
            if not config.get("enabled", False):
                continue
            tasks.append(self.fetch_feed(name, config["url"]))
        
        if not tasks:
            return

        results = await asyncio.gather(*tasks)
        all_items = []
        for items in results:
            all_items.extend(items)

        # Sort items if possible by pubDate, but simpler to just process them as they come
        await self.process_feed_items(all_items)

    async def run_forever(self, interval_seconds: int = 60) -> None:
        """Runs the polling loop indefinitely."""
        logger.info(f"Starting news ingestor worker. Polling interval: {interval_seconds}s")
        while True:
            try:
                await self.run_once()
            except Exception as e:
                logger.error(f"Error in news ingestor loop: {e}")
            await asyncio.sleep(interval_seconds)

    async def close(self) -> None:
        """Closes HTTP client resources."""
        await self.client.aclose()
