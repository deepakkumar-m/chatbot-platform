"""
Configuration settings for the Platform Engineering Chatbot
"""
import os

# Base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Excel configuration (commented out – replaced by Rancher API) ─────────────
# EXCEL_FILE_PATH = os.path.join(BASE_DIR, 'data', 'servers.xlsx')
# EXCEL_SHEET_NAME = 'Servers'
# COLUMNS = {
#     'SERVER_NAME': 'Server/Node Name',
#     'APPLICATION': 'Cluster Name',
#     'ENVIRONMENT': 'Environment',
#     'RUN_AS': 'Run as',
#     'NOTES': 'Notes'
# }

# ── Flask configuration ───────────────────────────────────────────────────────
DEBUG = True
HOST = '0.0.0.0'
PORT = 5001

# ── Rancher API configuration ─────────────────────────────────────────────────
RANCHER_BASE_URL = os.environ.get('RANCHER_BASE_URL', 'https://rancher.example.com')
RANCHER_API_TOKEN = os.environ.get('RANCHER_API_TOKEN', 'token-xxxxx:yyyyyyy')
RANCHER_VERIFY_SSL = os.environ.get('RANCHER_VERIFY_SSL', 'false').lower() != 'false'
