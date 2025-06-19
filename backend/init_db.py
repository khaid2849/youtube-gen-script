# backend/init_db.py
"""
Initialize database without using Alembic
Run this script to create all tables
"""

from app.database import engine, Base
from app.models import User, Script, UserUsage 
from app.config import settings

def init_db():
    """Create all tables in the database"""
    print(f"Creating database tables...")
    print(f"Database URL: {settings.DATABASE_URL}")
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✓ All tables created successfully!")
        
        # List created tables
        print("\nCreated tables:")
        for table in Base.metadata.sorted_tables:
            print(f"  - {table.name}")
            
    except Exception as e:
        print(f"✗ Error creating tables: {str(e)}")
        raise

if __name__ == "__main__":
    init_db()