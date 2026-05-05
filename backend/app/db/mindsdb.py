import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class MindsDBClient:
    """Client for interacting with MindsDB via its REST SQL API.
    
    Used specifically for Knowledge Graph (Cypher) queries on the backend.
    """
    def __init__(self):
        self.base_url = f"{settings.mindsdb_url}/api/sql/query"
        self.headers = {"Content-Type": "application/json"}

    async def execute_query(self, query: str) -> list[dict]:
        """Execute a SQL/Cypher query against MindsDB."""
        if settings.dev_mode:
            logger.info("[DEV MODE] MindsDB query bypassed: %s", query)
            return []
            
        payload = {"query": query}
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(self.base_url, json=payload, headers=self.headers)
                response.raise_for_status()
                data = response.json()
                return data.get("data", [])
            except Exception as e:
                logger.error("Failed to execute MindsDB query: %s", e)
                return []

    async def upsert_graph_nodes(self, entities: list[dict], patient_id: str):
        """Translate extracted NER entities into Knowledge Graph node upserts.
        
        This builds the Neo4j-compatible graph schema inside MindsDB.
        """
        if not entities:
            return

        # Example transformation:
        # Create Patient Node if not exists, then connect Extracted Entities
        for entity in entities:
            node_type = entity.get("type")
            node_text = entity.get("text", "").replace("'", "''")
            
            # Simple Cypher-style SQL mapping for MindsDB
            if node_type == "DISEASE":
                query = f"INSERT INTO vitasync_graph (node_a, relation, node_b) VALUES ('Patient:{patient_id}', 'HAS_CONDITION', 'Condition:{node_text}')"
            elif node_type == "DRUG":
                query = f"INSERT INTO vitasync_graph (node_a, relation, node_b) VALUES ('Patient:{patient_id}', 'PRESCRIBED', 'Medication:{node_text}')"
            elif node_type == "LAB_TEST":
                query = f"INSERT INTO vitasync_graph (node_a, relation, node_b) VALUES ('Patient:{patient_id}', 'HAD_LAB_RESULT', 'LabTest:{node_text}')"
            else:
                continue
                
            await self.execute_query(query)

mindsdb_client = MindsDBClient()
