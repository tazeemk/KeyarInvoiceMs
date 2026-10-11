FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN addgroup --system django \
    && adduser --system --ingroup django django \
    && mkdir -p /app/staticfiles \
    && chown django:django /app /app/staticfiles
COPY --chown=django:django . .

EXPOSE 8000
USER django
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py bootstrap_data && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3"]
