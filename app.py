"""
Platform Engineering Chatbot - Flask Application
"""
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from excel_utils import excel_manager
from config import DEBUG, HOST, PORT
import re

app = Flask(__name__)
CORS(app)


def parse_user_query(query):
    """Parse user query to determine intent and extract keywords"""
    query_lower = query.lower().strip()
    
    # Intent patterns
    server_patterns = [
        r'(?:server|node|host)\s+(\S+)',
        r'on\s+(\S+)',
        r'(\S+)\s+server',
        r'show\s+(?:me\s+)?(\S+)',
    ]
    
    app_patterns = [
        r'application\s+(\S+)',
        r'app\s+(\S+)',
        r'(?:where|which).*?running\s+(\S+)',
    ]
    
    # Check for server queries
    for pattern in server_patterns:
        match = re.search(pattern, query_lower)
        if match and 'application' not in query_lower[:match.start()]:
            return {
                'intent': 'search_server',
                'keyword': match.group(1)
            }
    
    # Check for application queries
    for pattern in app_patterns:
        match = re.search(pattern, query_lower)
        if match:
            return {
                'intent': 'search_application',
                'keyword': match.group(1)
            }
    
    # Default to general search
    return {
        'intent': 'search_all',
        'keyword': query
    }


def format_response(results, intent, keyword):
    """Format search results into a natural language response"""
    if not results:
        return {
            'message': f"I couldn't find any information about '{keyword}'. Please check the spelling or try a different query.",
            'results': [],
            'count': 0
        }
    
    count = len(results)
    
    if intent == 'search_server':
        clusters = [r.get('Cluster Name', 'N/A') for r in results]
        message = f"Found {count} cluster(s) running on server '{keyword}':"
    elif intent == 'search_application':
        servers = [r.get('Server/Node Name', 'N/A') for r in results]
        message = f"Cluster '{keyword}' is running on {count} server(s):"
    else:
        message = f"Found {count} matching record(s) for '{keyword}':"
    
    return {
        'message': message,
        'results': results,
        'count': count
    }


@app.route('/')
def index():
    """Render the chatbot interface"""
    return render_template('index.html')


@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chatbot queries"""
    try:
        data = request.get_json()
        user_query = data.get('message', '').strip()
        
        if not user_query:
            return jsonify({
                'error': 'Please enter a message'
            }), 400
        
        # Parse the query
        parsed = parse_user_query(user_query)
        intent = parsed['intent']
        keyword = parsed['keyword']
        
        # Execute search based on intent
        if intent == 'search_server':
            results = excel_manager.search_by_server(keyword)
        elif intent == 'search_application':
            results = excel_manager.search_by_application(keyword)
        else:
            results = excel_manager.search_all(keyword)
        
        # Format response
        response = format_response(results, intent, keyword)
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({
            'error': f'An error occurred: {str(e)}'
        }), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get database statistics"""
    try:
        stats = excel_manager.get_statistics()
        return jsonify(stats)
    except Exception as e:
        return jsonify({
            'error': f'Error fetching statistics: {str(e)}'
        }), 500


@app.route('/api/add', methods=['POST'])
def add_record():
    """Add a new server/application record"""
    try:
        data = request.get_json()
        
        server_name = data.get('server_name', '')
        application = data.get('application', '')
        environment = data.get('environment', '')
        run_as = data.get('run_as', '')
        notes = data.get('notes', '')
        
        if not server_name or not application:
            return jsonify({
                'error': 'Server name and application name are required'
            }), 400
        
        success = excel_manager.add_record(
            server_name, application, environment, run_as, notes
        )
        
        if success:
            return jsonify({
                'message': 'Record added successfully',
                'success': True
            })
        else:
            return jsonify({
                'error': 'Failed to add record'
            }), 500
    
    except Exception as e:
        return jsonify({
            'error': f'An error occurred: {str(e)}'
        }), 500


if __name__ == '__main__':
    print("=" * 60)
    print("Platform Engineering Chatbot Starting...")
    print(f"Access the chatbot at: http://localhost:{PORT}")
    print("=" * 60)
    app.run(debug=DEBUG, host=HOST, port=PORT)
