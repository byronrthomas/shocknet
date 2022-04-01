import json
import graph_db as db


def run_affected_countries_query(config, cut_producer_ids):
    conn = db.initDbWithToken(config, db.GRAPHNAME)
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

def condition_graph_fixed_point(config, input_thresh, import_thresh, critical_ind_thresh):
    conn = db.initDbWithToken(config, db.GRAPHNAME)
    params = f'input_pct_thresh={input_thresh}&import_pct_thresh={import_thresh}&national_output_thresh={critical_ind_thresh}'
    print('DEBUG - running with params string = ', params)
    res = conn.runInterpretedQuery(db.read_resource('resources/gsql_queries/condition_graph.gsql'), params)
    print(res)
    print(conn.getEdgeStats('*'))