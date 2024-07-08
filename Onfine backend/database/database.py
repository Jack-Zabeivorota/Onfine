from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker


@event.listens_for(Engine, 'connect')
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute('PRAGMA foreign_keys=ON')
    cursor.close()

DB_URL = 'sqlite:///database.db'
engine = create_engine(DB_URL)
SessionMaker = sessionmaker(engine, autocommit=False, autoflush=False)