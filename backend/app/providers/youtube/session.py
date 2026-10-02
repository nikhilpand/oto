from dataclasses import dataclass
from typing import Dict, Any, Optional


@dataclass(frozen=True)
class InnerTubeClientConfig:
    client_name: str
    client_version: str
    client_id: int
    user_agent: str
    referer: str
    origin: str


# Forensic client specs derived from VIVI, BitChord, and InnerTubeX
CLIENT_ANDROID_VR = InnerTubeClientConfig(
    client_name="ANDROID_VR",
    client_version="1.43.32",
    client_id=56,
    user_agent="Mozilla/5.0 (Linux; Android 12; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/34.0.0.15 SamsungBrowser/4.0 Chrome/124.0.6367.207 Mobile VR Safari/537.36",
    referer="https://www.youtube.com/",
    origin="https://www.youtube.com",
)

CLIENT_WEB_REMIX = InnerTubeClientConfig(
    client_name="WEB_REMIX",
    client_version="1.20250210.01.00",
    client_id=67,
    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    referer="https://music.youtube.com/",
    origin="https://music.youtube.com",
)

CLIENT_IOS = InnerTubeClientConfig(
    client_name="IOS",
    client_version="19.45.4",
    client_id=5,
    user_agent="com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X; en_US)",
    referer="https://www.youtube.com/",
    origin="https://www.youtube.com",
)

CLIENT_TVHTML5 = InnerTubeClientConfig(
    client_name="TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    client_version="2.0",
    client_id=85,
    user_agent="Mozilla/5.0 (PlayStation; PlayStation 4/11.00) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15",
    referer="https://www.youtube.com/tv",
    origin="https://www.youtube.com",
)


class InnerTubeSession:
    """Manages InnerTube request payloads, headers, and signature timestamps."""

    def __init__(self, signature_timestamp: int = 19842):
        self.signature_timestamp = signature_timestamp

    def build_headers(self, client: InnerTubeClientConfig) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "User-Agent": client.user_agent,
            "X-YouTube-Client-Name": str(client.client_id),
            "X-YouTube-Client-Version": client.client_version,
            "Origin": client.origin,
            "Referer": client.referer,
        }

    def build_player_payload(
        self,
        video_id: str,
        client: InnerTubeClientConfig,
        po_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "context": {
                "client": {
                    "clientName": client.client_name,
                    "clientVersion": client.client_version,
                    "hl": "en",
                    "gl": "US",
                    "userAgent": client.user_agent,
                },
                "user": {"lockedSafetyMode": False},
                "request": {"useSsl": True, "internalExperimentFlags": []},
            },
            "videoId": video_id,
            "playbackContext": {
                "contentPlaybackContext": {
                    "html5Preference": "HTML5_PREF_WANTS",
                    "signatureTimestamp": self.signature_timestamp,
                }
            },
        }
        if po_token:
            payload["serviceIntegrityDimensions"] = {"poToken": po_token}
        return payload
