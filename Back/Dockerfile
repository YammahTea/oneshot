FROM python:3.14-slim

WORKDIR /app

RUN adduser --system --group appuser

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

USER appuser

EXPOSE 8000

CMD ["uvicorn", "Back.app:app", "--host", "0.0.0.0", "--port", "8000"]
