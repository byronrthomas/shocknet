from itertools import count
import json
from tokenize import group
import tgfinance2022.graph_db as db
import urllib.parse

def current_condition(conn):
    res = db.get_condition_info(conn)
    if res and len(res) > 0:
        if len(res) > 1:
            raise Exception(f"Bad condition info -- only expected one result not {len(res)}")
        return res[0]['attributes']['condition_description']

def assert_conditioned(conn):
    res = current_condition(conn)
    if not res:
        raise Exception("Not yet projected the graph to a conditioned form - cannot interact with shock info")

def remove_edges_not_on_destination_path(links, end_ids):
    dest_set = set(end_ids)
    included_edges = []
    processable_edges = [link for link in links]
    
    while True:
        to_add = [e for e in processable_edges if e["to_id"] in dest_set]
        if len(to_add) == 0:
            break

        for e in to_add:
            processable_edges.remove(e)
            dest_set.add(e["from_id"])
            included_edges.append(e)
    
    return included_edges

def run_affected_countries_query(conn, supply_shocked_producers):
    assert_conditioned(conn)
    cut_params = [
        f'starting_nodes[{i}]={p_id}&starting_nodes[{i}].type=producer'
        for i, p_id in enumerate(supply_shocked_producers)]
    cut_params = '&'.join(cut_params)
    params = f'{cut_params}&allowed_edge_types={db.CRITICAL_INDUSTRY_EDGE}&allowed_edge_types={db.TRADE_SHOCK_EDGE}&allowed_edge_types={db.PRODUCTION_SHOCK_EDGE}&allowed_vertex_types={db.COUNTRY_VERTEX}&allowed_vertex_types={db.PRODUCER_VERTEX}&final_vertex_types={db.COUNTRY_VERTEX}&report_links=TRUE'
    print('DEBUG - running with params string = ', params)
    res = conn.runInterpretedQuery(db.read_resource('resources/gsql_queries/bfs_reachability.gsql'), params)
    edges = res[1]['@@allEdges']
    affected_countries = res[0]['res']
    print('pre-filtered edge count', len(edges))
    affected_country_ids = [c['v_id'] for c in affected_countries]
    edges = remove_edges_not_on_destination_path(edges, affected_country_ids)
    print('reachable edge count', len(edges))
    return {
        'affected_countries': affected_countries,
        'reachable_edges': edges}

def format_percentage(fixed):
    return f'{fixed / 10000.0}%'

def condition_graph_fixed_point(conn, input_thresh, import_thresh, critical_ind_thresh):
    # description = f'input_threshold = {format_percentage(input_thresh)} | import_threshold = {format_percentage(import_thresh)} | critical_industry_threshold = {format_percentage(critical_ind_thresh)}'
    description = f'inputs_{input_thresh}_imports_{import_thresh}_critical_ind_{critical_ind_thresh}'
    params = f'input_pct_thresh={input_thresh}&import_pct_thresh={import_thresh}&national_output_thresh={critical_ind_thresh}&description={description}'
    print('DEBUG - running with params string = ', params)
    res = conn.runInterpretedQuery(db.read_resource('resources/gsql_queries/condition_graph.gsql'), params)
    print(res)
    print(conn.getEdgeStats('*'))

def summarise_country_groups_from_query(all_nodes, group_attrib_name):
    country_nodes = [c for c in all_nodes if c['v_type'] == 'country']
    print(f'Got {len(country_nodes)} countries - should be 134?')
    by_group_num = {}
    for c in country_nodes:
        group_num = c['attributes'][group_attrib_name]
        if not group_num in by_group_num:
            by_group_num[group_num] = []
        by_group_num[group_num].append(c['v_id'])

    singletons = [g[0] for g in by_group_num.values() if len(g) == 1]
    communities = [g for g in by_group_num.values() if len(g) > 1]
    print(f'Got {len(singletons)} singletons and {len(communities)} communities')
    return {
        'singletons': singletons,
        'communities': communities
    }

def find_country_partitions(conn, use_weak_cc=True, additional_params_string='', verbose=False):
    assert_conditioned(conn)
    v_type_params = 'v_type=country&v_type=producer'
    e_type_params = 'e_type=trade_shock&e_type=critical_industry_of&e_type=has_industry&e_type=production_shock'
    rev_e_type_params = 'rev_e_type=REV_trade_shock&rev_e_type=REV_critical_industry_of&rev_e_type=REV_has_industry&rev_e_type=REV_production_shock'
    common_params = f'{v_type_params}&{e_type_params}&output_limit=10000'
    query_code_path = 'resources/gsql_queries/from_tg_algo_lib/tg_wcc.gsql' if use_weak_cc else 'resources/gsql_queries/from_tg_algo_lib/tg_scc.gsql'
    params = common_params
    if not use_weak_cc:
        params = f'{params}&{rev_e_type_params}&top_k_dist=0'
    if additional_params_string:
        params = f'{params}&{additional_params_string}'

    print('DEBUG - running with params string = ', params)
    res = conn.runInstalledQuery('tg_wcc' if use_weak_cc else 'tg_scc', params)

    all_nodes = res[2]['Start'] if use_weak_cc else res[1]['v_all']
    attrib_name = 'Start.@min_cc_id' if use_weak_cc else 'v_all.@sum_cid'
    summ = summarise_country_groups_from_query(all_nodes, attrib_name)

    if verbose:
        print('Singletons', summ['singletons'])
        print('Communities:')
        for c in summ['communities']:
            print(c)
    
    return summ
