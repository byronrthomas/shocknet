import json
import graph_db as db

def current_condition(conn):
    res = db.get_condition_info(conn)
    if res and len(res) > 0:
        if len(res) > 1:
            raise Exception(f"Bad condition info -- only expected one result not {len(res)}")
        return res[0]['condition_description']

def assert_conditioned(conn):
    res = current_condition(conn)
    if not res:
        raise Exception("Not yet projected the graph to a conditioned form - cannot interact with shock info")

def run_affected_countries_query(conn, cut_producer_ids):
    assert_conditioned(conn)
    cut_params = [
        f'starting_nodes[{i}]={p_id}&starting_nodes[{i}].type=producer'
        for i, p_id in enumerate(cut_producer_ids)]
    cut_params = '&'.join(cut_params)
    params = f'{cut_params}&allowed_edge_types={db.CRITICAL_INDUSTRY_EDGE}&allowed_edge_types={db.TRADE_SHOCK_EDGE}&allowed_edge_types={db.PRODUCTION_SHOCK_EDGE}&allowed_vertex_types={db.COUNTRY_VERTEX}&allowed_vertex_types={db.PRODUCER_VERTEX}&final_vertex_types={db.COUNTRY_VERTEX}&report_links=TRUE'
    print('DEBUG - running with params string = ', params)
    res = conn.runInterpretedQuery(db.read_resource('resources/gsql_queries/bfs_reachability.gsql'), params)
    return {
        'affected_countries': res[0]['res'],
        'reachable_edges': res[1]['@@allEdges']}

def condition_graph_fixed_point(conn, input_thresh, import_thresh, critical_ind_thresh):
    params = f'input_pct_thresh={input_thresh}&import_pct_thresh={import_thresh}&national_output_thresh={critical_ind_thresh}'
    print('DEBUG - running with params string = ', params)
    res = conn.runInterpretedQuery(db.read_resource('resources/gsql_queries/condition_graph.gsql'), params)
    print(res)
    print(conn.getEdgeStats('*'))