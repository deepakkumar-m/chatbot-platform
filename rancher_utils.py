"""
Rancher API client utilities for fetching cluster, node, and resource data.
Uses Rancher v3 REST API.
"""
import requests
import urllib3
from config import RANCHER_BASE_URL, RANCHER_API_TOKEN, RANCHER_VERIFY_SSL

# Suppress SSL warnings when verify=False
if not RANCHER_VERIFY_SSL:
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class RancherClient:
    """Client for interacting with the Rancher v3 API."""

    def __init__(self):
        self.base_url = RANCHER_BASE_URL.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {RANCHER_API_TOKEN}',
            'Content-Type': 'application/json',
        })
        self.verify_ssl = RANCHER_VERIFY_SSL

    def _get(self, path, params=None):
        """Internal GET request helper; returns parsed JSON or None."""
        url = f"{self.base_url}{path}"
        try:
            resp = self.session.get(url, params=params, verify=self.verify_ssl, timeout=15)
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.ConnectionError:
            raise RuntimeError(
                f"Cannot connect to Rancher at {self.base_url}. "
                "Check RANCHER_BASE_URL in config.py."
            )
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response else 'unknown'
            raise RuntimeError(f"Rancher API error (HTTP {status}): {e}")
        except Exception as e:
            raise RuntimeError(f"Unexpected error calling Rancher API: {e}")

    # ── Cluster Methods ───────────────────────────────────────────────────────

    def get_all_clusters(self):
        """
        Return a list of cluster summaries.
        Each entry has: id, name, state, node_count, nodes_down, cpu, memory
        """
        data = self._get('/v3/clusters')
        clusters = []
        for c in data.get('data', []):
            cluster_id = c.get('id', '')
            allocatable = c.get('allocatable', {})
            requested = c.get('requested', {})
            capacity = c.get('capacity', {})

            # Node counts from allocatable/capacity info embedded in cluster
            node_count = c.get('nodeCount', None)

            # Build summary
            entry = {
                'id': cluster_id,
                'name': c.get('name', ''),
                'state': c.get('state', 'unknown'),
                'provider': c.get('provider', c.get('driverName', 'unknown')),
                'k8s_version': c.get('rancherKubernetesEngineConfig', {}).get(
                    'kubernetesVersion', c.get('version', {}).get('gitVersion', 'N/A')
                ),
                'node_count': node_count,
                'conditions': c.get('conditions', []),
                # CPU/Memory from capacity vs requested
                'cpu_capacity': capacity.get('cpu', ''),
                'cpu_requested': requested.get('cpu', ''),
                'memory_capacity': capacity.get('memory', ''),
                'memory_requested': requested.get('memory', ''),
                'allocatable_cpu': allocatable.get('cpu', ''),
                'allocatable_memory': allocatable.get('memory', ''),
            }
            clusters.append(entry)
        return clusters

    def get_cluster_by_name(self, name):
        """Find a cluster whose name contains the given keyword (case-insensitive)."""
        clusters = self.get_all_clusters()
        name_lower = name.lower()
        return [c for c in clusters if name_lower in c['name'].lower()]

    def get_cluster_nodes(self, cluster_id):
        """
        Return a list of node summaries for a specific cluster.
        Each entry has: name, state, roles, os_image, cpu, memory, conditions
        """
        data = self._get('/v3/nodes', params={'clusterId': cluster_id})
        nodes = []
        for n in data.get('data', []):
            info = n.get('info', {})
            os_info = info.get('os', {})
            cpu_info = info.get('cpu', {})
            mem_info = info.get('memory', {})
            cap = n.get('capacity', {})
            req = n.get('requested', {})
            alloc = n.get('allocatable', {})

            roles = []
            if n.get('controlPlane'):
                roles.append('control-plane')
            if n.get('etcd'):
                roles.append('etcd')
            if n.get('worker'):
                roles.append('worker')

            node_state = n.get('state', 'unknown')
            conditions = n.get('conditions', [])

            nodes.append({
                'name': n.get('nodeName', n.get('requestedHostname', 'unknown')),
                'state': node_state,
                'roles': roles,
                'os_image': os_info.get('operatingSystem', 'N/A'),
                'kernel': os_info.get('kernelVersion', 'N/A'),
                'cpu_count': cpu_info.get('count', cap.get('cpu', 'N/A')),
                'cpu_capacity': cap.get('cpu', ''),
                'cpu_requested': req.get('cpu', ''),
                'memory_capacity': cap.get('memory', ''),
                'memory_requested': req.get('memory', ''),
                'allocatable_cpu': alloc.get('cpu', ''),
                'allocatable_memory': alloc.get('memory', ''),
                'conditions': conditions,
                'is_down': node_state.lower() not in ('active', 'running'),
            })
        return nodes

    def get_cluster_summary(self, cluster_id=None, cluster_name=None):
        """
        Return a complete cluster view: cluster info + nodes.
        Accepts either a cluster ID or a partial name to search.
        Returns a list because name search may match multiple clusters.
        """
        if cluster_name:
            matches = self.get_cluster_by_name(cluster_name)
        elif cluster_id:
            all_clusters = self.get_all_clusters()
            matches = [c for c in all_clusters if c['id'] == cluster_id]
        else:
            matches = self.get_all_clusters()

        results = []
        for cluster in matches:
            cid = cluster['id']
            try:
                nodes = self.get_cluster_nodes(cid)
            except Exception:
                nodes = []

            down_nodes = [n for n in nodes if n['is_down']]

            summary = {
                **cluster,
                'nodes': nodes,
                'total_nodes': len(nodes),
                'down_nodes': len(down_nodes),
                'down_node_names': [n['name'] for n in down_nodes],
            }
            results.append(summary)
        return results

    def get_statistics(self):
        """Return aggregate stats: total clusters and total nodes."""
        try:
            clusters = self.get_all_clusters()
            total_clusters = len(clusters)
            total_nodes = 0
            active_clusters = 0
            for c in clusters:
                cid = c['id']
                try:
                    nodes = self.get_cluster_nodes(cid)
                    total_nodes += len(nodes)
                except Exception:
                    pass
                if c.get('state', '').lower() == 'active':
                    active_clusters += 1
            return {
                'total_clusters': total_clusters,
                'active_clusters': active_clusters,
                'total_nodes': total_nodes,
            }
        except Exception as e:
            return {'error': str(e), 'total_clusters': 0, 'total_nodes': 0}


# Singleton
rancher_client = RancherClient()
