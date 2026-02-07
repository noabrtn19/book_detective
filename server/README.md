# About this server

This server uses Python FastAPI.

## Folder structure

This folder has the following structure:
```raw
app/
|
|── .venv/          # <--- Python modules
|
|── alembic/        # <--- SQL migration
|
|── core/
|   ├── config.py   # <--- Config file (edit to change default params, models paths, database credentials...)
│   ├── entities/       # <--- DATACLASSES (internal logic, RAM objects)
│   └── detection/      # <--- Detection pipeline
|
├── database/       # <--- SQLALCHEMY (Database structure)
│   ├── database.py     # <--- PostgreSQL connection
│   └── models/         # <--- SQLALCHEMY models
|
├── models_weights/ # <--- Models weights
│   ├── paddleocr/      # <--- OCR model
│   └── yolo/           # <--- Book segmentation model
|
├── routers/        # <--- CONTROLLERS (API routes)
|
├── schemas/        # <--- PYDANTIC DTOs
|
├── services/       # <--- SERVICES (BUSINESS LOGIC, CALLED BY CONTROLLERS)
|
├── main.py         # <--- Run this script to launch the server
|
|── requirements.txt
|
|── alembic.ini
|
|── dependencies.py     # <--- Useful dependencies to inject: database, get_current_user
```

## Setup

On Linux:

Install python packages:
```shell
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Set up the PostgreSQL database (no need to create the tables):
```shell
sudo -u postgres psql
CREATE USER book_detective_admin WITH PASSWORD 'a4fg86';
CREATE DATABASE book_detective_db;
GRANT ALL PRIVILEGES ON DATABASE book_detective_db TO book_detective_admin;
\c book_detective_db
GRANT ALL ON SCHEMA public TO book_detective_admin;
\l
\q
```

Create a JWT secret (for authentication):
```shell
cd server
echo JWT_SECRET_KEY=$(openssl rand -base64 32) > .env
```

## Launch server

On Linux:

```shell
cd server
source .venv/bin/activate
uvicorn main:app --reload # Run server with hot reload
```

## When adding/modifying SQL schema

We use Alembic to perform migrations.
Every time a files are edited in ./database/models, do the following:
```shell
cd server
python3 -m 
alembic revision --autogenerate -m "This is what I modified" # Generate migration
alembic upgrade head # Apply all unapplied migrations
```

Useful commands:
```shell
alembic downgrade -1 # Cancel last migration
alembic history # Display all applied migrations
```