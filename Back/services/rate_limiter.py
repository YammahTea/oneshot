from fastapi import HTTPException
import uuid

async def check_user_cooldown(user_id: uuid.UUID, redis_client):
  """
    Checks if a user is on cooldown.
    If YES: Raises an error (Blocks them).
    If NO: Sets a new cooldown and lets them pass.
    """

  # 1- Define the unique user's lock
  key = f"cooldown:user:{user_id}"

  # 2- Check with Redis if the key exists
  is_on_cooldown = await redis_client.exists(key)

  # 3- Check if the client is on cooldown, if not, set new expiry
  if is_on_cooldown:
    ttl = await redis_client.ttl(key)
    raise HTTPException(
      status_code=429,
      detail=f"Whoa, slow down! Try again in {ttl} seconds."
    )

  await redis_client.setex(name=key, time=5, value="locked")
  return True
