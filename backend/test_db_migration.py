import requests
from backend.config import settings

def test_supabase_tables():
    url = f"{settings.SUPABASE_URL}/rest/v1/users?select=*"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
    }
    r = requests.get(url, headers=headers)
    print("Users table status:", r.status_code, r.text)

if __name__ == '__main__':
    test_supabase_tables()
