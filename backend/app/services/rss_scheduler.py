import os
import asyncio
from typing import Optional
from .ingestion_job_manager import ingestion_job_manager

class RSSBackgroundScheduler:
    """
    Recurring background task for automated RSS feed synchronization.
    Runs every N minutes (configurable via RSS_POLL_INTERVAL_MINUTES).
    Can be enabled/disabled via ENABLE_RSS_SCHEDULER environment variable.
    """
    def __init__(self, interval_seconds: int = 5 * 60):
        self.interval_seconds = interval_seconds
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()

    async def start(self):
        enabled = os.getenv("ENABLE_RSS_SCHEDULER", "true").lower() in ("1", "true", "yes")
        if not enabled:
            print("RSS Scheduler: Disabled via configuration.")
            return

        interval_min = int(os.getenv("RSS_POLL_INTERVAL_MINUTES", "5"))
        self.interval_seconds = max(interval_min * 60, 60)
        self._stop_event.clear()
        self._task = asyncio.create_task(self._run_loop())
        print(f"RSS Scheduler: Initialized background polling loop every {interval_min} minutes.")

    async def stop(self):
        self._stop_event.set()
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        print("RSS Scheduler: Stopped gracefully.")

    async def _run_loop(self):
        # Initial wait before starting first background cycle (30 seconds post-boot)
        try:
            await asyncio.wait_for(self._stop_event.wait(), timeout=30.0)
            return
        except asyncio.TimeoutError:
            pass

        while not self._stop_event.is_set():
            try:
                job, is_new = await ingestion_job_manager.start_job()
                if is_new:
                    print(f"RSS Scheduler: Scheduled feed polling pass initiated ({job.job_id}).")
            except Exception as e:
                print(f"RSS Scheduler: Error during background polling trigger: {e}")

            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=float(self.interval_seconds))
            except asyncio.TimeoutError:
                continue

rss_scheduler = RSSBackgroundScheduler()
