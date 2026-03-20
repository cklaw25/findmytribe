"""
Run this during demos to animate attendees moving around the venue.
Usage: python simulate_locations.py
"""
import asyncio
import random
import os
import json
from dotenv import load_dotenv

load_dotenv()

ZONES = ["entrance", "main_hall", "workshop", "chill_zone", "outside"]

with open("mock_data.json") as f:
    ATTENDEES = json.load(f)

DEMO_USER_IDS = [a["id"] for a in ATTENDEES]


async def simulate():
    try:
        from supabase import create_client
        sb = create_client(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_SERVICE_KEY", ""))
        use_supabase = True
        print("Connected to Supabase — simulating live locations...")
    except Exception:
        use_supabase = False
        print("No Supabase — printing simulation only...")

    # Seed everyone in main_hall first
    for uid in DEMO_USER_IDS:
        zone = "main_hall"
        if use_supabase:
            sb.table("locations").upsert({"user_id": uid, "zone": zone}).execute()
        print(f"  INIT  {uid} → {zone}")

    await asyncio.sleep(2)

    while True:
        # Move 3 random people each tick
        movers = random.sample(DEMO_USER_IDS, min(3, len(DEMO_USER_IDS)))
        for uid in movers:
            zone = random.choice(ZONES)
            if use_supabase:
                sb.table("locations").upsert({"user_id": uid, "zone": zone}).execute()
            name = next(a["name"] for a in ATTENDEES if a["id"] == uid)
            print(f"  MOVE  {name:<20} → {zone}")
        await asyncio.sleep(8)


if __name__ == "__main__":
    asyncio.run(simulate())
