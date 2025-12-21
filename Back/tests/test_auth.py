import pytest

@pytest.mark.asyncio
async def test_register_user(client):
  response = await client.post("/auth/register", json={
    "username": "newuser",
    "password": "isThisASecurePassword?"
  })

  assert response.status_code == 200
  data = response.json()

  assert "access_token" in data
  assert data["username"] == "newuser"


@pytest.mark.asyncio
async def test_login_user(client):

  # 1- register
  await client.post("/auth/register", json={
    "username": "loginuser",
    "password": "IDontthinkthisisagoodpass"
  })

  # 2- login
  response = await client.post("/auth/login", data={
    "username": "loginuser",
    "password": "IDontthinkthisisagoodpass"
  })

  assert response.status_code == 200
  assert "access_token" in response.json()
