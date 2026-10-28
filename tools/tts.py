"""Voices every clip listed in tools/<id>-texts.json into docs/audio/<id>/<key>.mp3 (skips existing).
Usage: python tools/tts.py ja ja-JP-NanamiNeural"""
import asyncio, json, os, sys
import edge_tts

pack = sys.argv[1] if len(sys.argv) > 1 else "ja"
voice = sys.argv[2] if len(sys.argv) > 2 else "ja-JP-NanamiNeural"
root = os.path.dirname(os.path.abspath(__file__))
items = json.load(open(os.path.join(root, f"{pack}-texts.json"), encoding="utf-8"))
out = os.path.join(root, "..", "docs", "audio", pack)
os.makedirs(out, exist_ok=True)
sem = asyncio.Semaphore(4)
failed = []

async def one(text, key):
    path = os.path.join(out, key + ".mp3")
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return
    async with sem:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(text, voice, rate="-10%").save(path)
                return
            except Exception as e:
                await asyncio.sleep(2 + attempt * 3)
        failed.append(text)

async def main():
    await asyncio.gather(*(one(t, k) for t, k in items.items()))
    keep = set(v + ".mp3" for v in items.values())
    for f in os.listdir(out):
        if f not in keep:
            os.remove(os.path.join(out, f))
    print("done", len(items), "failed", len(failed), failed[:5])

asyncio.run(main())
