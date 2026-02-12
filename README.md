# Platform Engineering Chatbot 🤖

A beautiful, intuitive chatbot interface to help platform engineering teams quickly search and manage information about servers and applications running in RKE2 environments.

## Features ✨

- 🔍 **Smart Search**: Natural language queries to find servers and applications
- 📊 **Real-time Statistics**: Dashboard showing server, application, and record counts
- 💾 **Excel-based Storage**: Easy data management using familiar Excel spreadsheets
- 🎨 **Modern UI**: Beautiful dark theme with glassmorphism and smooth animations
- ⚡ **Fast & Responsive**: Instant search results with typing indicators
- 🎯 **Intent Recognition**: Automatically understands server vs application queries

## Quick Start 🚀

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Install dependencies**:
```bash
pip install -r requirements.txt
```

2. **Run the application**:
```bash
python app.py
```

3. **Open your browser** and navigate to:
```
http://localhost:5000
```

## Usage 💡

### Searching for Information

The chatbot understands natural language queries. Here are some examples:

#### Search by Server
```
"Show me server rke2-node-01"
"What's running on node-02?"
"Tell me about rke2-staging-01"
```

#### Search by Application
```
"Where is nginx running?"
"Find application redis"
"Which servers have postgresql?"
```

#### General Search
```
"Find production"
"Show me staging"
"Search for port 8080"
```

### Managing Data

#### Excel File Structure

The data is stored in `data/servers.xlsx` with the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| Server/Node Name | Name of the server/node | `rke2-node-01` |
| Application Name | Application running on the server | `nginx` |
| Environment | Environment type | `Production` |
| Port | Port number | `80` |
| Status | Current status | `Active` |
| Notes | Additional information | `Web server serving frontend` |

#### Adding/Editing Records

1. Open `data/servers.xlsx` in Excel or any spreadsheet application
2. Add or modify records as needed
3. Save the file
4. Reload the chatbot page in your browser to see the changes

#### Using the API

You can also add records programmatically via the API:

```bash
curl -X POST http://localhost:5000/api/add \
  -H "Content-Type: application/json" \
  -d '{
    "server_name": "rke2-node-06",
    "application": "mongodb",
    "environment": "Production",
    "port": "27017",
    "status": "Active",
    "notes": "NoSQL database for user data"
  }'
```

## Project Structure 📁

```
chatbot inv/
├── app.py                  # Flask application with API endpoints
├── excel_utils.py          # Excel data management utilities
├── config.py               # Configuration settings
├── requirements.txt        # Python dependencies
├── data/
│   └── servers.xlsx       # Excel data file
├── static/
│   ├── css/
│   │   └── style.css      # Beautiful styling and animations
│   └── js/
│       └── chat.js        # Chat interface logic
└── templates/
    └── index.html         # Main chatbot interface
```

## API Endpoints 🔌

### POST /api/chat
Query the chatbot with natural language.

**Request**:
```json
{
  "message": "show me server rke2-node-01"
}
```

**Response**:
```json
{
  "message": "Found 2 application(s) running on server 'rke2-node-01':",
  "results": [...],
  "count": 2
}
```

### GET /api/stats
Get database statistics.

**Response**:
```json
{
  "total_records": 14,
  "unique_servers": 7,
  "unique_applications": 11
}
```

### POST /api/add
Add a new server/application record.

**Request**:
```json
{
  "server_name": "rke2-node-06",
  "application": "mongodb",
  "environment": "Production",
  "port": "27017",
  "status": "Active",
  "notes": "NoSQL database"
}
```

## Configuration ⚙️

Edit `config.py` to customize:

- **Excel file path**: Change `EXCEL_FILE_PATH` to point to your data file
- **Server settings**: Modify `HOST` and `PORT` for different network configurations
- **Column names**: Customize column headers if needed

## Keyboard Shortcuts ⌨️

- `/` - Focus on input field
- `Ctrl/Cmd + K` - Clear chat history

## Future Enhancements 🚀

- **RKE2 Integration**: Direct integration with RKE2 clusters via kubectl
- **Real-time Updates**: Automatic data refresh from cluster
- **Advanced Filters**: Filter by environment, status, port ranges
- **Export Functionality**: Export search results to CSV/PDF
- **User Authentication**: Multi-user support with role-based access
- **Audit Logs**: Track changes to server/application records

## Troubleshooting 🔧

### Port Already in Use
If port 5000 is already in use, modify the `PORT` in `config.py`:
```python
PORT = 8080  # or any other available port
```

### Excel File Not Found
The application will automatically create the Excel file on first run. If you see errors:
1. Check that the `data/` directory exists
2. Ensure you have write permissions
3. Verify openpyxl is installed

### Search Returns No Results
- Check that the Excel file contains data
- Verify column names match the configuration in `config.py`
- Try a more general search term

## Contributing 🤝

Feel free to enhance this chatbot with additional features:
- Add more search capabilities
- Implement data validation
- Add unit tests
- Improve UI/UX

## License 📄

This project is open source and available for use by your platform engineering team.

---

**Made with ❤️ for Platform Engineers**

For questions or support, please contact your platform engineering team.
