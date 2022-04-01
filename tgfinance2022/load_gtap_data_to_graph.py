import json
import string
import pandas as pd
import pyTigerGraph as tg
import sys

from dotenv import dotenv_values

COUNTRY_VERTEX='country'
PRODUCT_VERTEX='product'
IMPORTER_VERTEX='importer'
PRODUCER_VERTEX='producer'
LOCATION_EDGE='located_in'
CRITICAL_INDUSTRY_EDGE='critical_industry_of'
PRODUCTION_EDGE='produces'
TRADE_EDGE='trades'
DOMESTIC_INPUT_EDGE='uses_domestic_input'
IMPORTED_INPUT_EDGE='uses_imported_input'
GRAPHNAME='ecomonic_links'
PRODUCTION_SHOCK_EDGE='production_shock'
TRADE_SHOCK_EDGE='trade_shock'
CONDITION_VERTEX='condition_info'

def distinct_values_of(lookup_key, df):
    return df[lookup_key].drop_duplicates().to_list()

def upsert_nodes(conn, vertex_type, nodes):
    print(f"Asked to upsert {len(nodes)} {vertex_type} vertices")
    count = conn.upsertVertices(vertex_type, nodes)
    print(f"Upserted {count} {vertex_type} vertices")

MAX_EDGE_REQUEST=10000
def upsert_edges(conn, edge_type, from_vertex_type, to_vertex_type, edges):
    print(f"Asked to upsert {len(edges)} {edge_type} edges")
    i = 0 
    while i < len(edges):
        count = conn.upsertEdges(from_vertex_type, edge_type, to_vertex_type, edges[i:i+MAX_EDGE_REQUEST])
        print(f"Upserted {count} {edge_type} edges")
        i = i + MAX_EDGE_REQUEST
        

def add_nodes_with_code(conn, vertex_type, items):
    nodes = [(v, {'code': v}) for v in items]
    upsert_nodes(conn, vertex_type, nodes)

def as_fixed_point(v):
    return int(v * 10000)

def as_percent_fixed_point(v):
    return as_fixed_point(v * 100.0)

def check_bad_percentages(df, col_name):
    bad_vals = df.query(f'{col_name} > 1.0')
    if bad_vals.shape[0] > 0:
        print('Bad rows...')
        print(bad_vals)
        raise Exception("Got bad rows")

def producer_code(product_code, country_code):
    return f"{country_code}-{product_code}"

def importer_code(country_code, product_code):
    return f"IMPORTED-TO-{country_code}-{product_code}"

MIN_OUTPUT_M_DOLLARS=1
def add_importers(conn, vxmd_df, vom_df):
    vims_import_arr = vxmd_df[['TRAD_COMM', 'REG_2']].drop_duplicates().to_numpy()
    # Only count the commod and importing reg as the key    
    importer_nodes = [
        (importer_code(product_code=v[0], country_code=v[1]), 
        # Assumption - importers by themselves aren't of interest for filtering
        # (can use traded percentages and percentage of input that's imported instead)
        {'product_code': v[0],
         'country_code': v[1]})
          for v in vims_import_arr]
    upsert_nodes(conn, IMPORTER_VERTEX, importer_nodes)
    
    filt_vxmd = vxmd_df.query(f'Value > {MIN_OUTPUT_M_DOLLARS}.0')
    print('Filtered VXMD:', filt_vxmd.shape)
    imp_product_sum = vxmd_df.groupby(['TRAD_COMM', 'REG_2']).sum()
    with_sums = pd.merge(filt_vxmd, imp_product_sum.rename(columns={'Value': 'sum-TRAD_COMM-REG2'}), on=['TRAD_COMM', 'REG_2'])
    with_sums['pct_of_imported_product_total'] = with_sums['Value'] / with_sums['sum-TRAD_COMM-REG2']
    with_sums = pd.merge(with_sums, vom_df.rename(columns={'NSAV_COMM': 'TRAD_COMM', 'Value': 'sum-TRAD_COMM-REG'}), on=['REG', 'TRAD_COMM'])
    with_sums['pct_of_product_output_total'] = with_sums['Value'] / with_sums['sum-TRAD_COMM-REG']

    check_bad_percentages(with_sums, 'pct_of_imported_product_total')
    check_bad_percentages(with_sums, 'pct_of_product_output_total')

    vxmd_arr = with_sums[
        ['TRAD_COMM', 'REG', 'REG_2', 'Value', 'pct_of_imported_product_total', 'pct_of_product_output_total']].to_numpy().tolist()
    
    trade_edges = [
        (producer_code(product_code=v[0], country_code=v[1]),
         importer_code(product_code=v[0], country_code=v[2]),
        {'market_val_dollars': as_fixed_point(v[3]),
         'pct_of_imported_product_total': as_percent_fixed_point(v[4]),
         'pct_of_producer_output': as_percent_fixed_point(v[5])})
        for v in vxmd_arr
        if v[1] != v[2]
    ]
    upsert_edges(conn, TRADE_EDGE, PRODUCER_VERTEX, IMPORTER_VERTEX, trade_edges)

def add_producers(conn, vom_df):
    # filt_vom_df = vom_df.query(f'Value > {MIN_OUTPUT_M_DOLLARS}.0')
    filt_vom_df = vom_df
    print('Filtered VOM:', filt_vom_df.shape)

    country_sum = vom_df.groupby(['REG']).sum()
    with_sums = pd.merge(filt_vom_df, country_sum.rename(columns={'Value': 'sum-REG'}), on=['REG'])
    with_sums['pct_of_national_output'] = with_sums['Value'] / with_sums['sum-REG']
    check_bad_percentages(with_sums, 'pct_of_national_output')

    vom_arr = with_sums[['NSAV_COMM', 'REG', 'Value', 'pct_of_national_output']].to_numpy().tolist()
    producer_nodes = [
        # Only count the commod and reg as the key
        (producer_code(product_code=v[0], country_code=v[1]), 
        {'pct_of_national_output': as_percent_fixed_point(v[3]),
         'market_val_dollars': as_fixed_point(v[2]),
         'product_code': v[0],
         'country_code': v[1]})
          for v in vom_arr]
    upsert_nodes(conn, PRODUCER_VERTEX, producer_nodes)
    
    loc_edges = [
        (producer_code(product_code=v[0], country_code=v[1]),
         v[1],
         {})
        for v in vom_arr]
    upsert_edges(conn, LOCATION_EDGE, PRODUCER_VERTEX, COUNTRY_VERTEX, loc_edges)

    production_edges = [
        (producer_code(product_code=v[0], country_code=v[1]),
         v[0],
         {})
        for v in vom_arr]
    upsert_edges(conn, PRODUCTION_EDGE, PRODUCER_VERTEX, PRODUCT_VERTEX, production_edges)

def add_nodes(conn, vom_df):
    products = distinct_values_of('NSAV_COMM', vom_df)
    add_nodes_with_code(conn, PRODUCT_VERTEX, products)

    countries = distinct_values_of('REG', vom_df)
    add_nodes_with_code(conn, COUNTRY_VERTEX, countries)

    add_producers(conn, vom_df)

def add_product_input_edges(conn, vdfm_df, vifm_df, vom_df):
    filt_vdfm_df = vdfm_df.query(f'Value > {MIN_OUTPUT_M_DOLLARS}.0')
    print('Filtered VDFM:', filt_vdfm_df.shape)

    product_input_sum = vdfm_df.groupby(['PROD_COMM', 'REG']).sum()
    with_sums = pd.merge(filt_vdfm_df, product_input_sum.rename(columns={'Value': 'sum-PROD_COMM-REG'}), on=['PROD_COMM', 'REG'])
    with_sums['pct_of_producer_input'] = with_sums['Value'] / with_sums['sum-PROD_COMM-REG']
    with_sums = pd.merge(with_sums, vom_df.rename(columns={'NSAV_COMM': 'TRAD_COMM', 'Value': 'sum-TRAD_COMM-REG'}), on=['REG', 'TRAD_COMM'])
    with_sums['pct_of_producer_output'] = with_sums['Value'] / with_sums['sum-TRAD_COMM-REG']

    check_bad_percentages(with_sums, 'pct_of_producer_input')
    check_bad_percentages(with_sums, 'pct_of_producer_output')

    # Should be TRADed_COMM, PRODuced_COMM, REG, Value
    vdfm_arr = with_sums[
        ['TRAD_COMM', 'PROD_COMM', 'REG', 'Value', 'pct_of_producer_input', 'pct_of_producer_output']].to_numpy().tolist()

    # Direct the edge from the output producer to the
    # producer who has that as an input
    edges = [
        (producer_code(product_code=v[0], country_code=v[2]),
         producer_code(product_code=v[1], country_code=v[2]),
         {'market_val_dollars': as_fixed_point(v[3]),
          'pct_of_producer_input': as_percent_fixed_point(v[4]),
          'pct_of_producer_output': as_percent_fixed_point(v[5])})
        for v in vdfm_arr
    ]
    upsert_edges(conn, DOMESTIC_INPUT_EDGE, PRODUCER_VERTEX, PRODUCER_VERTEX, edges)

    filt_vifm_df = vifm_df.query(f'Value > {MIN_OUTPUT_M_DOLLARS}.0')
    print('Filtered VIFM:', filt_vifm_df.shape)

    product_input_sum = vifm_df.groupby(['PROD_COMM', 'REG']).sum()
    i_with_sums = pd.merge(filt_vifm_df, product_input_sum.rename(columns={'Value': 'sum-PROD_COMM-REG'}), on=['PROD_COMM', 'REG'])
    i_with_sums['pct_of_producer_input'] = i_with_sums['Value'] / i_with_sums['sum-PROD_COMM-REG']
    # Not going to bother with the percent of importing

    vifm_arr = i_with_sums[
        ['TRAD_COMM', 'PROD_COMM', 'REG', 'Value', 'pct_of_producer_input']
    ].to_numpy().tolist()
    edges = [
        (importer_code(product_code=v[0], country_code=v[2]),
         producer_code(product_code=v[1], country_code=v[2]),
         {'market_val_dollars': as_fixed_point(v[3]),
             'pct_of_producer_input': as_percent_fixed_point(v[4])})
        for v in vifm_arr
    ]
    upsert_edges(conn, IMPORTED_INPUT_EDGE, IMPORTER_VERTEX, PRODUCER_VERTEX, edges)
    

def initDbForWriting(config, graphname):
    conn = tg.TigerGraphConnection(host=config['HOSTNAME'], username=config['USERNAME'], password=config['PASSWORD'], graphname=graphname)
    conn.getToken(config['SECRET'])
    print('Able to get a token')
    return conn

## Going to define my own fixed point to avoid mucking about with floats too much
## Let's say 4 decimals - with percentages expressed as 10.5% rather than 0.105


def recreate_schema(drop_all, config):
    conn = tg.TigerGraphConnection(host=config['HOSTNAME'], username=config['USERNAME'], password=config['PASSWORD'])
    print(conn.gsql('ls', options=[]))
    if drop_all:
        print('GOING TO DROP ALL!!!!!')
        print(conn.gsql('DROP ALL', options=[]))
        print(conn.gsql('ls', options=[]))
    
    # Schema rationale:
    #
    # 1. don't bother storing names etc in the DB, pretty easy to
    # just hard code these in clients rather than faff around ensuring they're present
    # 
    # 2. don't link importers to countries & products for now - they seem more like an
    # intermediate edge than of interest in their own right

    print(conn.gsql(f'''
create vertex {COUNTRY_VERTEX} (primary_id country_id STRING, code STRING)

create vertex {PRODUCT_VERTEX} (primary_id sector_id STRING, code STRING)

create vertex {IMPORTER_VERTEX} (primary_id importer_id STRING, country_code STRING, product_code STRING, code STRING)

create vertex {PRODUCER_VERTEX} (primary_id producer_id STRING, country_code STRING, product_code STRING, pct_of_national_output UINT, market_val_dollars UINT)

create vertex {CONDITION_VERTEX} (primary_id id UINT, condition_description STRING)

create undirected edge {LOCATION_EDGE} (from {PRODUCER_VERTEX}, to {COUNTRY_VERTEX})
create directed edge {CRITICAL_INDUSTRY_EDGE} (from {PRODUCER_VERTEX}, to {COUNTRY_VERTEX})
create undirected edge {PRODUCTION_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCT_VERTEX})

create directed edge {DOMESTIC_INPUT_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCER_VERTEX}, market_val_dollars INT, pct_of_producer_input INT, pct_of_producer_output INT)

create directed edge {IMPORTED_INPUT_EDGE} (from {IMPORTER_VERTEX}, to {PRODUCER_VERTEX}, pct_of_producer_input INT, market_val_dollars INT)

create directed edge {TRADE_EDGE} (from {PRODUCER_VERTEX}, to {IMPORTER_VERTEX}, market_val_dollars INT, pct_of_imported_product_total INT, pct_of_producer_output INT)

create directed edge {PRODUCTION_SHOCK_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCER_VERTEX}, pct_of_producer_input INT)

create directed edge {TRADE_SHOCK_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCER_VERTEX}, pct_of_producer_input INT, pct_of_imported_product_total INT)

create graph {GRAPHNAME} ({COUNTRY_VERTEX}, {PRODUCT_VERTEX}, {PRODUCER_VERTEX}, {LOCATION_EDGE}, {PRODUCTION_EDGE}, {DOMESTIC_INPUT_EDGE}, {IMPORTED_INPUT_EDGE}, {IMPORTER_VERTEX}, {TRADE_EDGE}, {CRITICAL_INDUSTRY_EDGE}, {TRADE_SHOCK_EDGE}, {PRODUCTION_SHOCK_EDGE})
''', options=[]))
    if drop_all:
        print('Now that drop all has been run you will need to create a secret and then add it to cfg.py to be able to do further operations (don\'t run with --drop-all again unless you want to repeat these steps!)')



def check_args():
    opts = [opt for opt in sys.argv[1:] if opt.startswith("-")]
    args = [arg for arg in sys.argv[1:] if not arg.startswith("-")]

    KNOWN_OPTS = {'--regen-schema': 'regen-schema', '--drop-all': 'drop-all', '--write-data': 'write-data'}
    rejected = args
    rejected.extend([r for r in opts if r not in KNOWN_OPTS])
    if len(rejected):
        raise SystemExit(f"Usage: {sys.argv[0]} [--regen-schema]...")
    return {KNOWN_OPTS[k]:k in opts for k in KNOWN_OPTS}

def read_resource(path):
    with open(path) as rdr:
        return rdr.read()

def clear_old_data(conn):
    print('Attempting to clear old data...')
    #print(conn.runInstalledQuery('delete_all'))
    print(conn.runInterpretedQuery(read_resource('resources/gsql_queries/delete_all.gsql')))

def write_data(config, paths):
    conn = initDbForWriting(config, GRAPHNAME)
    clear_old_data(conn)
    vom_df = pd.read_pickle(paths['VOM'])
    add_nodes(conn, vom_df)
    vxmd_df = pd.read_pickle(paths['VXMD'])
    add_importers(conn, vxmd_df, vom_df)
    vdfm_df = pd.read_pickle(paths['VDFM'])
    vifm_df = pd.read_pickle(paths['VIFM'])
    add_product_input_edges(conn, vdfm_df, vifm_df, vom_df)
    
    print(conn.getVertexStats('*'))
    # print(conn.getEdgeStats('*', skipNA=True))

def to_json_file(path, obj):
    with open(path, 'w') as wri:
       json.dump(obj, wri, indent=2)

# TODO: defunct in effect - replace with other things
def run_query(config, cut_producer_ids, input_thresh, import_thresh):
    conn = initDbForWriting(config, GRAPHNAME)
    cut_params = [
        f'cuts[{i}]={p_id}&cuts[{i}].type=producer'
        for i, p_id in enumerate(cut_producer_ids)]
    cut_params = '&'.join(cut_params)
    params = f'{cut_params}&input_pct_thresh={as_percent_fixed_point(input_thresh)}&import_pct_thresh={as_percent_fixed_point(import_thresh)}'
    print('DEBUG - running with params string = ', params)
    res = conn.runInterpretedQuery(read_resource('resources/gsql_queries/supply_cut_with_thresh.gsql'), params)
    links = res[0]['@@links']
    print(f'Found {len(links)} affected producers')
    to_json_file('links.json', links)
    affected_countries = {ln['to_country'] for ln in links}
    print(f'All affected countries ({len(affected_countries)})...')
    print(affected_countries)

def run_affected_countries_query(config, cut_producer_ids):
    conn = initDbForWriting(config, GRAPHNAME)
    cut_params = [
        f'starting_nodes[{i}]={p_id}&starting_nodes[{i}].type=producer'
        for i, p_id in enumerate(cut_producer_ids)]
    cut_params = '&'.join(cut_params)
    params = f'{cut_params}&allowed_edge_types={CRITICAL_INDUSTRY_EDGE}&allowed_edge_types={TRADE_SHOCK_EDGE}&allowed_edge_types={PRODUCTION_SHOCK_EDGE}&allowed_vertex_types={COUNTRY_VERTEX}&allowed_vertex_types={PRODUCER_VERTEX}&final_vertex_types={COUNTRY_VERTEX}&report_links=TRUE'
    print('DEBUG - running with params string = ', params)
    res = conn.runInterpretedQuery(read_resource('resources/gsql_queries/bfs_reachability.gsql'), params)
    reachable_countries = res[0]['res']
    to_json_file('reachable_countries.json', reachable_countries)
    print(f'res size = {len(res)}, res[0].keys = {res[0].keys()}')
    reachable_links = res[1]['@@allEdges']
    to_json_file('reachable_links.json', reachable_links)
    affected_countries = {c['attributes']['code'] for c in reachable_countries}
    print(f'All affected countries ({len(affected_countries)})...')
    print(affected_countries)

def condition_graph(config, input_thresh, import_thresh, critical_ind_thresh):
    conn = initDbForWriting(config, GRAPHNAME)
    params = f'input_pct_thresh={as_percent_fixed_point(input_thresh)}&import_pct_thresh={as_percent_fixed_point(import_thresh)}&national_output_thresh={as_percent_fixed_point(critical_ind_thresh)}'
    print('DEBUG - running with params string = ', params)
    res = conn.runInterpretedQuery(read_resource('resources/gsql_queries/condition_graph.gsql'), params)
    print(res)
    print(conn.getEdgeStats('*'))

def links_to_paths(links, starting_points, end_points):
    start_point_set = set(starting_points)
    by_path_end = {
        ln["to_id"]: [[ln]] for ln in links if ln["from_id"] in start_point_set}
    links = [ln for ln in links if ln["from_id"] not in start_point_set]
    while len(links) > 0:
        
        ext_links = [
            ln for ln in links if ln["from_id"] in by_path_end
        ]
        links = [ln for ln in links if ln["from_id"] not in by_path_end]
        if len(ext_links) == 0 and len(links) > 0:
            print('Remaining links', links)
            raise Exception("Unexpected condition, not finding new paths but links non-empty")
        
        for ln in ext_links:
            by_path_end[ln['to_id']] = [(path + [ln]) for path in by_path_end[ln['from_id']]]
        
    return {e_id: by_path_end[e_id] for e_id in end_points}

def main(args):
    cfg = dotenv_values('.env')
    if args['regen-schema']:
        recreate_schema(args['drop-all'], cfg)
    elif args['write-data']:
        base_path = '/Users/byron/projects/hackathon/tg-graphforall/GTAP-initial/extracted/fully-disagg'
        paths = {
            'VOM': f'{base_path}-BaseView-VOM.pkl.bz2',
            'VXMD': f'{base_path}-BaseData-VXMD.pkl.bz2',
            'VDFM': f'{base_path}-BaseData-VDFM.pkl.bz2',
            'VIFM': f'{base_path}-BaseData-VIFM.pkl.bz2'}
        write_data(cfg, paths)
    else:
        mex_oil = producer_code(product_code='oil', country_code='mex')
        usa_oil = producer_code(product_code='oil', country_code='usa')
        # MEX oil & USA oil - covers most of the world!
        run_query(cfg, [mex_oil, usa_oil], 0.25, 0.1)

        # LAOtian PCR (processed rice) - shouldn't go too far?
        # run_query(cfg, [783], 0.25, 0.01)
        condition_graph(cfg, 0.25, 0.1, 0.05)
        run_affected_countries_query(cfg, [mex_oil, usa_oil])

# TODO: check the differences between the two versions make sense
# Some time after that, we need to basically have some kind of webserver that has a
#   Post new condition
#   Get current condition (when I add a conditioning node, change the name of graph too)
#   Based on condition do reachability
#   Based on condition check paths
#     etc..

if __name__ == "__main__":
    args = check_args()
    try:
        main(args)
    except BaseException as err:
        print(f"Unexpected issue {err} ({type(err)})")
    # print(check_args)
    