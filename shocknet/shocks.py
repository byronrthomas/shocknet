from importlib.resources import path
import json
import shocknet.graph_db as db
import urllib.parse

def current_condition(conn):
    res = db.get_condition_info(conn)
    if res and len(res) > 0:
        if len(res) > 1:
            raise Exception(f"Bad condition info -- only expected one result not {len(res)}")
        return json.loads(res[0]['attributes']['condition_description'])

def assert_conditioned(conn):
    res = current_condition(conn)
    if not res:
        raise Exception("Not yet projected the graph to a conditioned form - cannot interact with shock info")

def edge_id(edge):
    return f"{edge['from_id']}-{edge['to_id']}"

def dedupe_edges_from_paths(paths):
    added_edges = set()
    result = []
    for path in paths:
        for edge in path:
            edge_desc = edge_id(edge)
            if edge_desc not in added_edges:
                result.append(edge)
                added_edges.add(edge_desc)
    return result

def calculate_all_paths(edges, starting_ids):
    edges_by_source = {}
    for e in edges:
        src_id = e['from_id']
        if src_id not in edges_by_source:
            edges_by_source[src_id] = []
        edges_by_source[src_id].append(e)
    
    all_paths = []
    max_paths = []
    paths_to_extend = [[{'to_id': start}] for start in starting_ids]
    while paths_to_extend:
        # print(f'Currently got {len(paths_to_extend)} to extend')
        next_to_extend = []
        for path in paths_to_extend:
            out_edges = edges_by_source.pop(path[-1]['to_id'], None)
            if out_edges:
                # print(f'Found {len(out_edges)} edges leading from end of path {path[-1]["to_id"]}')
                for e in out_edges:
                    new_path = path.copy()
                    new_path.append(e)
                    next_to_extend.append(new_path)
                    all_paths.append(new_path)

            else:
                # print(f'No edges leading from end of path {path[-1]["to_id"]} - considering to be finished')
                max_paths.append(path)
        paths_to_extend = next_to_extend

    # Drop the dummy edge from the start of the path, and remove any singleton paths
    all_paths = [path[1:] for path in all_paths if len(path) > 1]
    max_paths = [path[1:] for path in max_paths if len(path) > 1]
    return {'all_paths': all_paths, 'max_paths': max_paths}

def calculate_max_paths(edges, starting_ids):
    return calculate_all_paths(edges, starting_ids)['max_paths']



def fetch_neighbours(conn, vertices, edge_type):
    params = [
        f'fromVertices[{i}]={v["v_id"]}&fromVertices[{i}].type={v["v_type"]}'
        for i, v in enumerate(vertices)]
    params = f'{"&".join(params)}&edgeType={edge_type}'
    print('DEBUG: params =', params)
    res = conn.runInterpretedQuery(db.read_resource('resources/gsql_queries/fetch_neighbours.gsql'), params)
    return res[0]['DestVertices']

def check_path_ends(all_paths, end_ids):
    end_id_set = set(end_ids)
    path_ends = {path[-1]['to_id'] for path in all_paths}
    if end_id_set != path_ends:
        print('ERROR: path ends does not match expected')
        print('ERROR: In expected but missing from paths', end_id_set.difference(path_ends))
        print('ERROR: in paths, but not in expected', path_ends.difference(end_id_set))
        raise Exception('Issue in reachable processing - path ends not matching reached countries')

def check_path_starts(all_paths, start_ids):
    start_id_set = set(start_ids)
    path_starts = {path[0]['from_id'] for path in all_paths}
    if not start_id_set.issuperset(path_starts):
        print('ERROR: path starts does not match expected (should be a subset of expected - as it is possible to not find a path from a requested starting point)')
        print('ERROR: In expected but missing from paths', start_id_set.difference(path_starts))
        print('ERROR: in paths, but not in expected', path_starts.difference(start_id_set))
        raise Exception('Issue in reachable processing - path starts not matching expected starts')

def check_path_well_formed(path):
    if path:
        target = path[0]['to_id']
        rem_path = path[1:]
        while rem_path:
            if target != rem_path[0]['from_id']:
                raise Exception(f'Issue in reachable processing - path jumps from {target} to {rem_path[0]["from_id"]} in {path}')
            target = rem_path[0]['to_id']
            rem_path = rem_path[1:]


def sanity_check_paths(all_paths, start_ids, end_ids):
    check_path_ends(all_paths, end_ids)
    check_path_starts(all_paths, start_ids)
    for path in all_paths:
        check_path_well_formed(path)
    


def run_affected_countries_query(conn, supply_shocked_vertices):
    assert_conditioned(conn)

    ## NEED TO SORT OUT SOURCE COUNTRIES FIRST
    country_vertices = [v for v in supply_shocked_vertices if v["v_type"] == 'country']
    print(f'Asked to resolve {len(country_vertices)} countries')
    producer_vertices = [v for v in supply_shocked_vertices if v["v_type"] == 'producer']
    print(f'Also given {len(producer_vertices)} producers')
    if len(country_vertices) > 0:
        producer_vertices.extend(fetch_neighbours(conn, country_vertices, db.HAS_INDUSTRY_EDGE))
    print(f'Gives {len(producer_vertices)} starting vertices total')
    if len([v for v in producer_vertices if v["v_type"] != 'producer']) > 0:
        print('ERROR: got some bad vertices', [v for v in producer_vertices if v["v_type"] != 'producer'])
        raise Exception("Cannot handle vertices that aren't producers!!")
    cut_params = [
        f'starting_nodes[{i}]={v["v_id"]}&starting_nodes[{i}].type=producer'
        for i, v in enumerate(producer_vertices)]
    cut_params = '&'.join(cut_params)
    params = f'{cut_params}&allowed_edge_types={db.CRITICAL_INDUSTRY_EDGE}&allowed_edge_types={db.TRADE_SHOCK_EDGE}&allowed_edge_types={db.PRODUCTION_SHOCK_EDGE}&allowed_vertex_types={db.COUNTRY_VERTEX}&allowed_vertex_types={db.PRODUCER_VERTEX}&report_links=TRUE'
    print('DEBUG - running with params string = ', params)
    res = conn.runInterpretedQuery(db.read_resource('resources/gsql_queries/bfs_reachability.gsql'), params)
    edges = res[1]['@@allEdges']
    affected_countries = [v for v in res[0]['res'] if v['v_type'] == db.COUNTRY_VERTEX]
    print('pre-filtered edge count', len(edges))
    affected_country_ids = [c['v_id'] for c in affected_countries]
    starting_ids = [p['v_id'] for p in producer_vertices]
    all_paths = calculate_max_paths(edges, starting_ids)
    # Finally filter to those ending where we wanted
    end_ids_set = set(affected_country_ids)
    all_paths = [path for path in all_paths if path[-1]['to_id'] in end_ids_set]
    print(f'Found {len(all_paths)} paths from producers to affected countries')
    sanity_check_paths(all_paths, starting_ids, affected_country_ids)
    reachable_edges = dedupe_edges_from_paths(all_paths)
    # return {'edges': edges, 'affected_country_ids': affected_country_ids}
    print('reachable edge count', len(reachable_edges))
    return {
        'affected_countries': affected_countries,
        'reachable_edges': reachable_edges,
        'all_paths': all_paths}

def reverse_paths(paths):
    res = []
    for path in paths:
        rev_path = db.reverse_edges(path)
        rev_path.reverse()
        res.append(rev_path)
    return res


def producer_id_to_country(id):
    return id[0:3]


# Let's annotate edges s.t. you get
# All shock transfers that are under the control of the target country
# - production shock that ends in target country, 
# - or trade shock that ends in target country
# Order them by lowest value first
# And count the number of paths they appear in
def annotate_paths_for_origination(all_paths):
    # Paths are still reversed at the moment, so path[0] is in fact the producer
    # they wish to protect
    edge_ids_by_path_target = {p[0]['from_id']: set() for p in all_paths}
    edge_counts = {}
    local_edges_by_path_target = {p[0]['from_id']: [] for p in all_paths}
    counts_by_path_target = {p[0]['from_id']: 0 for p in all_paths}
    
    for p in all_paths:
        path_target = p[0]['from_id']
        path_target_country = producer_id_to_country(path_target)
        already_known_edges = edge_ids_by_path_target[path_target]
        counts_by_path_target[path_target] += 1
        for e in p:
            e_id = edge_id(e)
            # NOTE: edges reversed, hence from id
            e_target_country = producer_id_to_country(e['from_id'])
            if e_target_country == path_target_country:
                # Don't add the same edge twice
                if e_id not in already_known_edges:
                    local_edges_by_path_target[path_target].append(e)
                    already_known_edges.add(e_id)

            if e_id not in edge_counts:
                edge_counts[e_id] = 1
            else:
                edge_counts[e_id] += 1
            

    for elist in local_edges_by_path_target.values():
        elist.sort(key=lambda e: e['attributes']['market_val_dollars'])

    # Put the edge counts back on
    for p in all_paths:
        for e in p:
            e['attributes']['path_count'] = edge_counts[edge_id(e)]

    return {
        'local_edges_by_path_target': local_edges_by_path_target,
        'total_paths_by_path_target': counts_by_path_target}
    
def run_shock_origination_query(conn, endpoint_vertices):
    assert_conditioned(conn)

    ## NEED TO SORT OUT SOURCE COUNTRIES FIRST
    country_vertices = [v for v in endpoint_vertices if v["v_type"] == 'country']
    print(f'Asked to resolve {len(country_vertices)} countries')
    producer_vertices = [v for v in endpoint_vertices if v["v_type"] == 'producer']
    print(f'Also given {len(producer_vertices)} producers')
    if len(country_vertices) > 0:
        producer_vertices.extend(fetch_neighbours(conn, country_vertices, db.REV_CRITICAL_INDUSTRY_EDGE))
    print(f'Gives {len(producer_vertices)} endpoint vertices total')
    if len([v for v in producer_vertices if v["v_type"] != 'producer']) > 0:
        print('ERROR: got some bad vertices', [v for v in producer_vertices if v["v_type"] != 'producer'])
        raise Exception("Cannot handle vertices that aren't producers!!")
    cut_params = [
        f'starting_nodes[{i}]={v["v_id"]}&starting_nodes[{i}].type=producer'
        for i, v in enumerate(producer_vertices)]
    cut_params = '&'.join(cut_params)
    params = f'{cut_params}&allowed_edge_types={db.REV_TRADE_SHOCK_EDGE}&allowed_edge_types={db.REV_PRODUCTION_SHOCK_EDGE}&allowed_vertex_types={db.COUNTRY_VERTEX}&allowed_vertex_types={db.PRODUCER_VERTEX}&report_links=TRUE'
    print('DEBUG - running with params string = ', params)
    res = conn.runInterpretedQuery(db.read_resource('resources/gsql_queries/bfs_reachability.gsql'), params)
    edges = res[1]['@@allEdges']
    all_nodes = res[0]['res']
    print('pre-filtered edge count', len(edges))
    endpoint_ids = [p['v_id'] for p in producer_vertices]
    # In terms of what we get back here, it's essentially a subgraph of the
    # conditioned graph
    # Calculate all of the paths through it for the convenience of the front-end
    # but return all of the edges (everything reachable counts in this query,
    # whereas in the spread analysis we focus on which countries can be reached)
    
    # return {'edges': edges, 'endpoint_ids': endpoint_ids}

    paths = calculate_all_paths(edges, endpoint_ids)
    max_paths = paths['max_paths']
    all_paths = paths['all_paths']
    print(f'Found {len(max_paths)} max paths and {len(all_paths)} paths in total')
    edge_source_ids = {e['from_id'] for e in edges}
    edge_dest_ids = {e['to_id'] for e in edges}
    reachable_node_ids = edge_source_ids.union(edge_dest_ids)
    edge_annotations = annotate_paths_for_origination(all_paths)
    edges_by_targets = edge_annotations['local_edges_by_path_target']
    return {
        'reachable_nodes': [node for node in all_nodes if node['v_id'] in reachable_node_ids],
        'reachable_edges': db.reverse_edges(edges),
        'all_paths': reverse_paths(max_paths),
        'domestic_edges_by_targets': {k: db.reverse_edges(v) for k,v in edges_by_targets.items()},
        'distinct_path_counts_by_targets': edge_annotations['total_paths_by_path_target']}

def format_percentage(fixed):
    return f'{fixed / 10000.0}%'

def set_condition(conn, **params):
    db.upsert_nodes(conn, db.CONDITION_VERTEX, [(1, {'condition_description': json.dumps(params)})])

def condition_graph_fixed_point(conn, input_thresh, import_thresh, critical_ind_gdp_thresh, critical_ind_export_thresh, critical_ind_skilled_lab_thresh, critical_ind_unskilled_lab_thresh, critical_ind_meets_all_thresholds):
    if input_thresh < db.as_fixed_point(1) or import_thresh < db.as_fixed_point(1):
        raise Exception("Cannot condition graph with input threshold < 1% or import threshold < 1%")
    params = f'input_pct_thresh={input_thresh}&import_pct_thresh={import_thresh}&national_output_thresh={critical_ind_gdp_thresh}&export_pct_thresh={critical_ind_export_thresh}&skilled_labour_pct_thresh={critical_ind_skilled_lab_thresh}&unskilled_labour_pct_thresh={critical_ind_unskilled_lab_thresh}&critical_industry_meets_all_thresholds={critical_ind_meets_all_thresholds}&debug_output=true'
    print('DEBUG - running with params string = ', params)
    res = conn.runInterpretedQuery(db.read_resource('resources/gsql_queries/condition_graph.gsql'), params)
    print(res)
    set_condition(conn, input_thresh=input_thresh, import_thresh=import_thresh, critical_ind_gdp_thresh=critical_ind_gdp_thresh, critical_ind_export_thresh=critical_ind_export_thresh, critical_ind_skilled_lab_thresh=critical_ind_skilled_lab_thresh, critical_ind_unskilled_lab_thresh=critical_ind_unskilled_lab_thresh, critical_ind_meets_all_thresholds=critical_ind_meets_all_thresholds)


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
    ## NOTE: in these queries it is safe to use the has_industry edges, because
    ## they only create loops amongst producers of a single country - they can't
    ## therefore affect reachability of another country from any other
    ## e.g. usa -> has_industry usa-oil -> is_critical_industry_of usa
    ## won't create any paths to another country
    ## and still the paths into the country nodes only come via is_critical_industry
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
