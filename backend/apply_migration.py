import os
import requests
from backend.config import settings

def apply_migration():
    sql_file_path = os.path.join(os.path.dirname(__file__), 'migrations', '002_get_calendar_reminders.sql')
    with open(sql_file_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    url = f"{settings.SUPABASE_URL}/rest/v1/rpc/"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

    # Try executing raw SQL via Supabase REST query endpoint or Management API
    print("Executing migration SQL on Supabase...")
    # Direct SQL endpoint via Supabase Management API or Postgres connection
    import psycopg2
    try:
        # Extract host from URL: yfldjfstgyndiljmerue.supabase.co -> db.yfldjfstgyndiljmerue.supabase.co
        project_ref = settings.SUPABASE_URL.split('//')[1].split('.')[0]
        db_url = f"postgresql://postgres.{project_ref}:{settings.SUPABASE_SERVICE_ROLE_KEY}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        cursor.execute(sql_content)
        conn.commit()
        cursor.close()
        conn.close()
        print("MIGRATION EXECUTED SUCCESSFULLY VIA POSTGRESQL POOLER!")
        return True
    except Exception as e:
        print(f"Direct connection fallback: {e}")
        # Try REST RPC exec
        r = requests.post(f"{settings.SUPABASE_URL}/rest/v1/", headers=headers)
        print(f"REST Response status: {r.status_code}")

if __name__ == '__main__':
    apply_migration()
