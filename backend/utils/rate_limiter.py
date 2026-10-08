import time
import threading


class LoginRateLimiter:
    """
    In-memory, thread-safe sliding window rate limiter for login attempts.
    Protects against brute force credential stuffing attacks.
    """
    def __init__(self, max_attempts=5, window_seconds=900):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.attempts = {}  # key -> list of float timestamps
        self.lock = threading.Lock()

    def _cleanup(self, now, timestamps):
        cutoff = now - self.window_seconds
        return [t for t in timestamps if t > cutoff]

    def _make_key(self, ip, identifier=""):
        clean_ip = (ip or "127.0.0.1").strip()
        clean_id = (identifier or "").strip().lower()
        return f"{clean_ip}:{clean_id}" if clean_id else clean_ip

    def is_rate_limited(self, ip, identifier=""):
        key = self._make_key(ip, identifier)
        now = time.time()
        with self.lock:
            timestamps = self._cleanup(now, self.attempts.get(key, []))
            self.attempts[key] = timestamps
            return len(timestamps) >= self.max_attempts

    def get_remaining_attempts(self, ip, identifier=""):
        key = self._make_key(ip, identifier)
        now = time.time()
        with self.lock:
            timestamps = self._cleanup(now, self.attempts.get(key, []))
            return max(0, self.max_attempts - len(timestamps))

    def get_retry_after(self, ip, identifier=""):
        key = self._make_key(ip, identifier)
        now = time.time()
        with self.lock:
            timestamps = self._cleanup(now, self.attempts.get(key, []))
            if not timestamps:
                return 0
            oldest = min(timestamps)
            return max(1, int((oldest + self.window_seconds) - now))

    def record_failure(self, ip, identifier=""):
        key = self._make_key(ip, identifier)
        now = time.time()
        with self.lock:
            timestamps = self._cleanup(now, self.attempts.get(key, []))
            timestamps.append(now)
            self.attempts[key] = timestamps

    def reset(self, ip, identifier=""):
        key = self._make_key(ip, identifier)
        with self.lock:
            if key in self.attempts:
                del self.attempts[key]


# Singleton instance for authentication routes
login_limiter = LoginRateLimiter(max_attempts=5, window_seconds=900)
