import os
import shutil
from fastapi import UploadFile
import boto3
from botocore.exceptions import NoCredentialsError
from dotenv import load_dotenv

load_dotenv()

# Configuration
ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
ACCESS_KEY = os.getenv("R2_ACCESS_KEY_ID")
SECRET_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
PUBLIC_URL = os.getenv("R2_PUBLIC_URL")

def get_s3_client():
  """Create a Boto3 client for Cloudflare R2"""
  if not all([ACCOUNT_ID, ACCESS_KEY, SECRET_KEY]):
    return None

  return boto3.client(
    service_name="s3",
    endpoint_url=f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
  )

def save_file(file: UploadFile, unique_name: str) -> str:
  """
  Saves file to Cloudflare R2 if keys exist.
  Fallback: Saves to local 'uploads' folder.
  """
  s3_client = get_s3_client()

  # --- STRATEGY 1: CLOUD UPLOAD ---
  if s3_client and BUCKET_NAME and PUBLIC_URL:
    try:
      # Upload the file
      # ExtraArgs={'ContentType': ...} ensures browser displays it as image, not download
      s3_client.upload_fileobj(
        file.file,
        BUCKET_NAME,
        unique_name,
        ExtraArgs={'ContentType': file.content_type}
      )

      # Return the Public Cloud URL
      return f"{PUBLIC_URL}/{unique_name}"

    except Exception as e:
      print(f"⚠️ Cloud Upload Failed: {e}")
      print("Falling back to local storage...")

  # --- STRATEGY 2: LOCAL FALLBACK ---
  # This runs if keys are missing OR if cloud upload fails
  os.makedirs("Back/uploads", exist_ok=True)
  local_path = f"Back/uploads/{unique_name}"

  # Reset file pointer to 0 (crucial if upload_fileobj read some of it!)
  file.file.seek(0)

  with open(local_path, "wb") as buffer:
    shutil.copyfileobj(file.file, buffer)

  return f"/uploads/{unique_name}"
