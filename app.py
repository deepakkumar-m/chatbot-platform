"""
Platform Engineering Chatbot - Flask Application
Powered by Rancher API (Excel integration commented out)
"""
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from rancher_utils import rancher_client
from config import DEBUG, HOST, PORT

# ── Excel imports commented out ───────────────────────────────────────────────
# from excel_utils import excel_manager
# ─────────────────────────────────────────────────────────────────────────────

import re

app = Flask(__name__)
CORS(app)


# ── Query Parsing ─────────────────────────────────────────────────────────────

def parse_user_query(query):
    """Parse user query to determine intent and extract keywords."""
    q = query.lower().strip()

    # ── list all clusters ─────────────────────────────────────────────────
    if re.search(r'\b(list|show|get|all)\b.*\bclusters?\b', q) or q in ('clusters', 'all clusters'):
        return {'intent': 'list_clusters', 'keyword': ''}

    # ── cluster search by name ────────────────────────────────────────────
    m = re.search(
        r'(?:cluster|show me|details?(?:\s+of)?|status(?:\s+of)?)\s+([a-z0-9_\-\.]+)', q
    )
    if m:
        return {'intent': 'cluster_detail', 'keyword': m.group(1)}

    # ── node / node status queries ────────────────────────────────────────
    if re.search(r'\bnodes?\b', q):
        # specific node name after "node"
        nm = re.search(r'\bnode\s+([a-z0-9_\-\.]+)', q)
        if nm:
            return {'intent': 'node_detail', 'keyword': nm.group(1)}
        return {'intent': 'list_clusters', 'keyword': ''}   # show all with node info

    # ── CPU / memory queries ──────────────────────────────────────────────
    if re.search(r'\b(cpu|memory|mem|resources?|utilization|usage)\b', q):
        cm = re.search(r'(?:cpu|memory|mem|resources?|usage).*?\b([a-z0-9_\-\.]{3,})\b', q)
        if cm:
            return {'intent': 'cluster_detail', 'keyword': cm.group(1)}
        return {'intent': 'list_clusters', 'keyword': ''}

    # ── generic keyword search ─────────────────────────────────────────────
    return {'intent': 'search_cluster', 'keyword': query.strip()}


# ── Response Formatting ───────────────────────────────────────────────────────

def format_response(results, intent, keyword):
    """Format Rancher API results into a chat response."""
    if not results:
        msg = (
            f"I couldn't find any cluster matching '**{keyword}**'. "
            "Try 'list all clusters' to see everything, or check the cluster name."
        )
        return {'message': msg, 'results': [], 'count': 0}

    count = len(results)

    if intent == 'list_clusters':
        message = f"Here are all **{count}** cluster(s) in your Rancher environment:"
    elif intent == 'cluster_detail':
        message = f"Found **{count}** cluster(s) matching '**{keyword}**':"
    elif intent == 'search_cluster':
        message = f"Found **{count}** cluster(s) matching '**{keyword}**':"
    else:
        message = f"Found **{count}** result(s):"

    return {'message': message, 'results': results, 'count': count}


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    """Render the chatbot interface."""
    return render_template('index.html')


@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chatbot queries via Rancher API."""
    try:
        data = request.get_json()
        user_query = data.get('message', '').strip()

        if not user_query:
            return jsonify({'error': 'Please enter a message'}), 400

        parsed = parse_user_query(user_query)
        intent = parsed['intent']
        keyword = parsed['keyword']

        # ── Dispatch to Rancher ───────────────────────────────────────────
        if intent == 'list_clusters':
            results = rancher_client.get_cluster_summary()
        elif intent in ('cluster_detail', 'search_cluster'):
            if keyword:
                results = rancher_client.get_cluster_summary(cluster_name=keyword)
            else:
                results = rancher_client.get_cluster_summary()
        elif intent == 'node_detail':
            # Search all clusters and filter nodes by name
            all_summaries = rancher_client.get_cluster_summary()
            results = []
            kw_lower = keyword.lower()
            for s in all_summaries:
                matching_nodes = [
                    n for n in s.get('nodes', [])
                    if kw_lower in n['name'].lower()
                ]
                if matching_nodes:
                    results.append({**s, 'nodes': matching_nodes})
        else:
            results = rancher_client.get_cluster_summary(cluster_name=keyword)

        response = format_response(results, intent, keyword)
        return jsonify(response)

    except RuntimeError as e:
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Return aggregate cluster and node statistics from Rancher."""
    try:
        stats = rancher_client.get_statistics()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': f'Error fetching statistics: {str(e)}'}), 500


# ── Excel add-record endpoint commented out ───────────────────────────────────
# @app.route('/api/add', methods=['POST'])
# def add_record():
#     """Add a new server/application record (Excel-based, disabled)."""
#     pass
# ─────────────────────────────────────────────────────────────────────────────


if __name__ == '__main__':
    print("=" * 60)
    print("GBME Platform Assistant – Rancher API mode")
    print(f"Access the chatbot at: http://localhost:{PORT}")
    print("=" * 60)
    app.run(debug=DEBUG, host=HOST, port=PORT)
