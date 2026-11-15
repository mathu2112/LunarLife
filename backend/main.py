
import csv
import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import HealthInput, TaskUpdate
from recommendation_engine import generate

app = FastAPI(title='LunarLife Health Recommendations API', version='1.0.0')

# Local React/Vite development origins. Configure production origins separately.
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
    allow_methods=['GET', 'POST', 'PATCH'],
    allow_headers=['Content-Type'],
)

DB_PATH = Path(
    os.environ.get(
        'LUNARLIFE_DB_PATH',
        str(Path(__file__).parent / 'recommendations.db')
    )
)

# Dataset folders
DATASETS_DIR = Path(__file__).resolve().parent.parent / 'Datasets'

DATASET_DIRECTORIES = {
    'simulated': DATASETS_DIR / 'Simulated Datasets',
    'nasa': DATASETS_DIR / 'NASA Real Data'
}


@contextmanager
def db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row

    try:
        con.execute(
            'CREATE TABLE IF NOT EXISTS recommendations '
            '(id TEXT PRIMARY KEY, astronaut_id TEXT NOT NULL, payload TEXT NOT NULL)'
        )

        con.execute(
            'CREATE TABLE IF NOT EXISTS tasks '
            '(id TEXT PRIMARY KEY, astronaut_id TEXT NOT NULL, title TEXT NOT NULL, '
            'reason TEXT NOT NULL, priority TEXT NOT NULL, status TEXT NOT NULL, due TEXT NOT NULL)'
        )

        yield con
        con.commit()

    finally:
        con.close()


# --------------------------------------------------
# Health Check
# --------------------------------------------------

@app.get('/health')
def health():
    return {'status': 'ok'}


# --------------------------------------------------
# Dataset API
# --------------------------------------------------

@app.get('/datasets/{dataset_group}/{filename}')
def get_dataset(dataset_group: str, filename: str):

    if dataset_group not in DATASET_DIRECTORIES:
        raise HTTPException(status_code=404, detail='Dataset folder not found')

    directory = DATASET_DIRECTORIES[dataset_group].resolve()

    if not directory.is_dir():
        raise HTTPException(status_code=404, detail='Dataset directory not found')

    # Prevent access outside the selected dataset folder
    if Path(filename).name != filename:
        raise HTTPException(status_code=400, detail='Invalid filename')

    file_path = (directory / filename).resolve()

    if file_path.parent != directory or not file_path.is_file():
        raise HTTPException(status_code=404, detail=f'{filename} not found')

    try:
        if file_path.suffix.lower() == '.csv':
            with open(file_path, 'r', encoding='utf-8-sig', newline='') as file:
                reader = csv.DictReader(file)
                return list(reader)

        if file_path.suffix.lower() == '.json':
            with open(file_path, 'r', encoding='utf-8-sig') as file:
                return json.load(file)

        raise HTTPException(status_code=400, detail='Unsupported dataset format')

    except HTTPException:
        raise

    except (OSError, csv.Error, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=500,
            detail=f'Unable to read dataset: {str(error)}'
        )


# --------------------------------------------------
# Health Recommendations
# --------------------------------------------------

@app.post('/recommendations/generate')
def create_recommendations(data: HealthInput):
    result = generate(data)

    with db() as con:
        con.execute(
            'INSERT INTO recommendations VALUES (?, ?, ?)',
            (
                str(uuid4()),
                data.astronaut_id,
                json.dumps(result['recommendations'])
            )
        )

        saved = []

        for task in result['follow_up_tasks']:
            task_id = str(uuid4())

            con.execute(
                'INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?)',
                (
                    task_id,
                    data.astronaut_id,
                    task['title'],
                    task['reason'],
                    task['priority'],
                    task['status'],
                    task['due']
                )
            )

            saved.append({'id': task_id, **task})

    return {**result, 'follow_up_tasks': saved}


@app.get('/recommendations/{astronaut_id}')
def get_recommendations(astronaut_id: str):
    with db() as con:
        rows = con.execute(
            'SELECT payload FROM recommendations '
            'WHERE astronaut_id=? ORDER BY rowid DESC LIMIT 1',
            (astronaut_id,)
        ).fetchall()

    return {
        'astronaut_id': astronaut_id,
        'recommendations': json.loads(rows[0]['payload']) if rows else []
    }


# --------------------------------------------------
# Tasks
# --------------------------------------------------

@app.get('/tasks/{astronaut_id}')
def get_tasks(astronaut_id: str):
    with db() as con:
        rows = con.execute(
            'SELECT * FROM tasks WHERE astronaut_id=? ORDER BY rowid DESC',
            (astronaut_id,)
        ).fetchall()

    return {
        'astronaut_id': astronaut_id,
        'tasks': [dict(row) for row in rows]
    }


@app.patch('/tasks/{task_id}')
def update_task(task_id: str, change: TaskUpdate):
    with db() as con:
        cursor = con.execute(
            'UPDATE tasks SET status=? WHERE id=?',
            (change.status, task_id)
        )

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail='Task not found')

        row = con.execute(
            'SELECT * FROM tasks WHERE id=?',
            (task_id,)
        ).fetchone()

    return dict(row)
