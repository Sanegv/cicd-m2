FROM python:3.12-slim

# Dans le conteneur
WORKDIR /app

# backend -> conteneur
COPY requirements.txt requirements.txt

RUN pip install --upgrade pip \
 && pip install -r requirements.txt

# backend/.. -> conteneur
COPY ./app/ app/

# le port !
EXPOSE 80

CMD ["python", "app/app.py"]
