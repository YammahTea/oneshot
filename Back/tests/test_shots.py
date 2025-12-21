import pytest
import asyncio

@pytest.mark.asyncio
async def test_upload_shot(client):
  # 1- Create a user first
  await client.post("/auth/register", json={
    "username": "testuser",
    "password": "password123"
  })

  # 2- Login to get the token
  login_res = await client.post("/auth/login", data={"username":"testuser", "password":"password123"})
  token = login_res.json()["access_token"]
  headers = {"Authorization": f"Bearer {token}"}

  # 3- Post a Shot (Text Only) will add mock R2 later
  response = await client.post(
    "/post",
    data={"caption": "Hello World"}, # it's Form data, not JSON
    headers=headers
  )

  assert response.status_code == 200
  assert response.json()["content"] == "Hello World"

@pytest.mark.asyncio
async def test_daily_limit(client):
  """Test if it can't post twice"""

  # 1- Setup User & Token
  await client.post("/auth/register", json={"username": "limituser", "password": "thisisasecurepassMEOW"})

  login_res = await client.post("/auth/login", data={"username":"limituser", "password":"thisisasecurepassMEOW"})

  headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

  # 2- First Post (Should Succeed)
  res1 = await client.post("/post", data={"caption": "First"}, headers=headers)
  assert res1.status_code == 200

  # 2.5- Wait for Redis Cooldown (5s) to expire
  await asyncio.sleep(6)

  # 3- Second Post (Should Fail - 429 Too Many Requests)
  res2 = await client.post("/post", data={"caption": "Second"}, headers=headers)

  assert res2.status_code == 429
  assert "already made your post" in res2.json()["detail"]
