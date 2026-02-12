"""
Configuration settings for the Platform Engineering Chatbot
"""
import os

# Base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Excel file configuration
EXCEL_FILE_PATH = os.path.join(BASE_DIR, 'data', 'servers.xlsx')
EXCEL_SHEET_NAME = 'Servers'

# Flask configuration
DEBUG = True
HOST = '0.0.0.0'
PORT = 5001

# Column names in Excel sheet
COLUMNS = {
    'SERVER_NAME': 'Server/Node Name',
    'APPLICATION': 'Application Name',
    'ENVIRONMENT': 'Environment',
    'PORT': 'Port',
    'STATUS': 'Status',
    'NOTES': 'Notes'
}
