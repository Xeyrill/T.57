import sqlite3
import os

# ===== INTENTIONAL VULNERABILITIES FOR DEMO =====
# This file contains deliberate security issues for testing.

# Hardcoded secrets (BAD!)
API_KEY = "sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234"
DATABASE_PASSWORD = "admin123"
SECRET_TOKEN = "ghp_1a2b3c4d5e6f7g8h9i0jklmnopqrstuvwxyz"
AWS_SECRET_KEY = "AKIAIOSFODNN7EXAMPLE/wJalrXUtnFEMI/K7MDENG/bPxRfiCY"

password = "super_secret_password_2024"

def get_user(username):
    """Get user from database — VULNERABLE TO SQL INJECTION"""
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    
    # BAD: Direct string concatenation in SQL query
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)
    
    result = cursor.fetchone()
    conn.close()
    return result


def delete_user(user_id):
    """Delete user — also vulnerable"""
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    
    # BAD: String formatting in SQL
    cursor.execute("DELETE FROM users WHERE id = %s" % user_id)
    conn.commit()
    conn.close()


def run_command(cmd):
    """Execute a system command — COMMAND INJECTION"""
    # BAD: Using eval with user input
    result = eval(f"os.system('{cmd}')")
    return result


def process_data(data):
    """Process data with exec — DANGEROUS"""
    # BAD: Using exec with potentially untrusted data
    exec(data)


def authenticate(user, pwd):
    """Simple auth check — hardcoded credentials"""
    # BAD: Hardcoded credentials
    if user == "admin" and pwd == "admin123":
        return True
    if user == "root" and pwd == password:
        return True
    return False


def connect_to_db():
    """Connect to database with hardcoded connection string"""
    # BAD: Hardcoded connection string with password
    connection_string = "postgresql://admin:password123@prod-db.internal.company.com:5432/production"
    return connection_string


# Debug mode left on
DEBUG = True
debug = True
