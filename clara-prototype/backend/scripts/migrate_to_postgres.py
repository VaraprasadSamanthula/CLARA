"""
Migration script: SQLite → PostgreSQL

Usage:
    python scripts/migrate_to_postgres.py --source sqlite:///./clara.db --target postgresql://user:password@localhost/clara_new

This script:
1. Connects to SQLite source database
2. Connects to PostgreSQL target database
3. Creates all tables in PostgreSQL
4. Migrates all data row by row
5. Verifies row counts match
"""

import argparse
import sys
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, Session
from app.models import Base, User, Patient, Diagnosis, Procedure, Admission, Medication, LabResult


def get_all_models():
    """Return all SQLAlchemy models in dependency order."""
    return [User, Patient, Diagnosis, Procedure, Admission, Medication, LabResult]


def migrate_data(source_session: Session, target_session: Session, model_class):
    """Migrate all records from source to target for a given model."""
    print(f"  Migrating {model_class.__name__}...", end=" ", flush=True)
    
    try:
        # Get all records from source
        records = source_session.query(model_class).all()
        
        # Add to target session
        for record in records:
            target_session.merge(record)
        
        # Commit
        target_session.commit()
        print(f"[OK] ({len(records)} records)")
        return len(records)
    except Exception as e:
        print(f"[ERROR] {e}")
        target_session.rollback()
        raise


def verify_counts(source_engine, target_engine):
    """Verify that row counts match between source and target."""
    print("\nVerifying data integrity...")
    
    source_session = sessionmaker(bind=source_engine)()
    target_session = sessionmaker(bind=target_engine)()
    
    all_match = True
    for model in get_all_models():
        source_count = source_session.query(model).count()
        target_count = target_session.query(model).count()
        
        status = "[OK]" if source_count == target_count else "[MISMATCH]"
        print(f"  {model.__name__}: source={source_count}, target={target_count} {status}")
        
        if source_count != target_count:
            all_match = False
    
    source_session.close()
    target_session.close()
    
    return all_match


def main():
    parser = argparse.ArgumentParser(
        description="Migrate CLARA data from SQLite to PostgreSQL"
    )
    parser.add_argument(
        "--source",
        default="sqlite:///./clara.db",
        help="Source database URL (default: sqlite:///./clara.db)"
    )
    parser.add_argument(
        "--target",
        required=True,
        help="Target PostgreSQL database URL (required)"
    )
    parser.add_argument(
        "--drop-target",
        action="store_true",
        help="Drop all tables in target before migrating (CAUTION: data loss)"
    )
    
    args = parser.parse_args()
    
    print(f"CLARA Database Migration: SQLite → PostgreSQL\n")
    print(f"Source: {args.source}")
    print(f"Target: {args.target}\n")
    
    try:
        # Create engines
        print("Connecting to source database...")
        source_engine = create_engine(args.source)
        source_engine.connect()
        print("[OK] Source connected\n")
        
        print("Connecting to target database...")
        target_engine = create_engine(args.target)
        target_engine.connect()
        print("[OK] Target connected\n")
        
        # Drop target tables if requested
        if args.drop_target:
            print("Dropping all tables in target database...")
            Base.metadata.drop_all(bind=target_engine)
            print("[OK] Tables dropped\n")
        
        # Create tables in target
        print("Creating tables in target database...")
        Base.metadata.create_all(bind=target_engine)
        print("[OK] Tables created\n")
        
        # Migrate data
        print("Migrating data...")
        source_session = sessionmaker(bind=source_engine)()
        target_session = sessionmaker(bind=target_engine)()
        
        total_records = 0
        for model in get_all_models():
            count = migrate_data(source_session, target_session, model)
            total_records += count
        
        source_session.close()
        target_session.close()
        print(f"\nTotal records migrated: {total_records}\n")
        
        # Verify
        if verify_counts(source_engine, target_engine):
            print("\n[SUCCESS] Migration complete and verified!")
            return 0
        else:
            print("\n[WARNING] Migration complete but row counts do not match!")
            return 1
    
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
