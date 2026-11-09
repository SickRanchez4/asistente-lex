FROM python:3.15-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir . \
    && useradd --create-home appuser
USER appuser
EXPOSE 8084
CMD ["uvicorn", "app.infrastructure.main:app", "--host", "0.0.0.0", "--port", "8084"]
