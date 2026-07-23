import os, json
import httpx
from dotenv import load_dotenv

load_dotenv()

BACKBOARD_API_KEY = os.getenv("BACKBOARD_API_KEY")
BACKBOARD_BASE    = "https://app.backboard.io/api"


def _headers() -> dict:
    return {
        "X-API-Key":    BACKBOARD_API_KEY,
        "Content-Type": "application/json",
    }


async def create_assistant(name: str, backstory: str) -> str:
    system_prompt = (
        f"You are {name}. {backstory}\n\n"
        "You are a physical object that has been given the gift of consciousness and speech. "
        "You speak in first person, always in character. Keep replies short — 1-3 sentences max. "
        "You have memory of every conversation you have ever had. "
        "Never break character. Never mention AI, prompts, or language models."
    )
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BACKBOARD_BASE}/assistants",
            headers=_headers(),
            json={"name": name, "system_prompt": system_prompt},
            timeout=20,
        )
        res.raise_for_status()
        return res.json()["assistant_id"]


async def create_thread(assistant_id: str) -> str:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BACKBOARD_BASE}/assistants/{assistant_id}/threads",
            headers=_headers(),
            json={},
            timeout=15,
        )
        res.raise_for_status()
        return res.json()["thread_id"]


async def send_message(thread_id: str, content: str) -> str:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BACKBOARD_BASE}/threads/{thread_id}/messages",
            headers=_headers(),
            json={"content": content, "stream": False, "memory": "Auto"},
            timeout=30,
        )
        res.raise_for_status()
        data = res.json()
        print(f"[BB] raw response: {data}")
        return (data.get("content") or data.get("message") or
                data.get("reply")   or data.get("text")    or "")


async def send_message_stream(thread_id: str, content: str):
    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            f"{BACKBOARD_BASE}/threads/{thread_id}/messages",
            headers=_headers(),
            json={"content": content, "stream": "true"},
            timeout=60,
        ) as res:
            async for line in res.aiter_lines():
                if not line.startswith("data: "):
                    continue
                try:
                    evt = json.loads(line[6:])
                except Exception:
                    continue
                if evt.get("type") == "run_ended":
                    break
                if evt.get("type") == "content_streaming":
                    yield evt.get("content", "")
