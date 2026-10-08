import os
from dotenv import load_dotenv
load_dotenv()

from app import app
from utils.migration import run_data_migration

if __name__ == "__main__":
    print("Running user authentication and foreign key schema migration...")
    run_data_migration(app)
    print("Migration completed successfully.")
