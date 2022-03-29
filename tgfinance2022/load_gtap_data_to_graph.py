import pandas as pd
import pyTigerGraph as tg
import sys

from dotenv import dotenv_values

COUNTRY_VERTEX='country'
PRODUCT_VERTEX='product'
IMPORTER_VERTEX='importer'
PRODUCER_VERTEX='producer'
LOCATION_EDGE='located_in'
PRODUCTION_EDGE='produces'
TRADE_EDGE='trades'
DOMESTIC_INPUT_EDGE='uses_domestic_input'
IMPORTED_INPUT_EDGE='uses_imported_input'
UNFILTERED_GRAPH='ecomonic_links_unfiltered'

def items_with_ids(lookup_key, df):
    vals = df[lookup_key].drop_duplicates().to_list()
    return {vals[i]: i for i in range(len(vals))}

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
        

def add_nodes_by_code(conn, vertex_type, item_id_dict):
    nodes = [(v, {'code': k}) for k,v in item_id_dict.items()]
    upsert_nodes(conn, vertex_type, nodes)

def as_fixed_point(v):
    return int(v * 10000)

MIN_OUTPUT_M_DOLLARS=1
def add_importers(conn, producers_with_id, vims_df):
    vims_import_arr = vims_df[['TRAD_COMM', 'REG_2']].drop_duplicates().to_numpy()
    # Only count the commod and importing reg as the key    
    importers_with_id = {(vims_import_arr[i][0], vims_import_arr[i][1]): i for i in range(len(vims_import_arr))}
    importer_nodes = [
        (importers_with_id[(v[0], v[1])], 
        # TODO: make truly a percentage by also summing by region
        {'product_code': v[0],
         'country_code': v[1]})
          for v in vims_import_arr]
    upsert_nodes(conn, IMPORTER_VERTEX, importer_nodes)
    
    filt_vims = vims_df.query(f'Value > {MIN_OUTPUT_M_DOLLARS}.0')
    print('Filtered VIMS:', filt_vims.shape)
    vims_arr = filt_vims.to_numpy().tolist()
    trade_edges = [
        (producers_with_id[(v[0], v[1])],
        importers_with_id[(v[0], v[2])],
        # TODO: figure out the actual pctages
        {'pct_of_imported_product_total': as_fixed_point(v[3]),
         'pct_of_producer_output': as_fixed_point(v[3])})
        for v in vims_arr
        if v[1] != v[2]
    ]
    upsert_edges(conn, TRADE_EDGE, PRODUCER_VERTEX, IMPORTER_VERTEX, trade_edges)

    return importers_with_id

def add_producers(conn, products_with_id, countries_with_id, vomDf):
    # filtVomDf = vomDf.query(f'Value > {MIN_OUTPUT_M_DOLLARS}.0')
    filtVomDf = vomDf
    print('Filtered VOM:', filtVomDf.shape)

    vom_arr = filtVomDf.to_numpy().tolist()
    # Only count the commod and reg as the key
    producers_with_id = {(vom_arr[i][0], vom_arr[i][1]): i for i in range(len(vom_arr))}
    producer_nodes = [
        (producers_with_id[(v[0], v[1])], 
        # TODO: make truly a percentage by also summing by region
        {'pct_of_national_output': as_fixed_point(v[2]),
         'market_val_dollars': as_fixed_point(v[2]),
         'product_code': v[0],
         'country_code': v[1]})
          for v in vom_arr]
    upsert_nodes(conn, PRODUCER_VERTEX, producer_nodes)
    
    loc_edges = [
        (producers_with_id[(v[0], v[1])],
         countries_with_id[v[1]],
         {})
        for v in vom_arr]
    upsert_edges(conn, LOCATION_EDGE, PRODUCER_VERTEX, COUNTRY_VERTEX, loc_edges)

    production_edges = [
        (producers_with_id[(v[0], v[1])],
         products_with_id[v[0]],
         {})
        for v in vom_arr]
    upsert_edges(conn, PRODUCTION_EDGE, PRODUCER_VERTEX, PRODUCT_VERTEX, production_edges)
    return producers_with_id

def add_nodes(conn, vomDf):
    products_with_id = items_with_ids('NSAV_COMM', vomDf)
    add_nodes_by_code(conn, PRODUCT_VERTEX, products_with_id)

    countries_with_id = items_with_ids('REG', vomDf)
    add_nodes_by_code(conn, COUNTRY_VERTEX, countries_with_id)

    producers_with_id = add_producers(conn, products_with_id, countries_with_id, vomDf)

    return {'countries': countries_with_id, 'products': products_with_id, 'producers': producers_with_id}

def add_product_input_edges(conn, node_id_dict, vdfm_df, vifm_df):
    filt_vdfm_df = vdfm_df.query(f'Value > {MIN_OUTPUT_M_DOLLARS}.0')
    print('Filtered VDFM:', filt_vdfm_df.shape)

    producers_with_id = node_id_dict['producers']
    
    # Should be TRADed_COMM, PRODuced_COMM, REG, Value
    vdfm_arr = filt_vdfm_df.to_numpy().tolist()
    # Direct the edge from the output producer to the
    # producer who has that as an input
    edges = [
        (producers_with_id[(v[0], v[2])],
         producers_with_id[(v[1], v[2])],
         # TODO: make these actually be correct percentages
         {'pct_of_producer_input': as_fixed_point(v[3]),
          'pct_of_producer_output': as_fixed_point(v[3])})
        for v in vdfm_arr
    ]
    upsert_edges(conn, DOMESTIC_INPUT_EDGE, PRODUCER_VERTEX, PRODUCER_VERTEX, edges)

    filt_vifm_df = vifm_df.query(f'Value > {MIN_OUTPUT_M_DOLLARS}.0')
    print('Filtered VIFM:', filt_vifm_df.shape)
    vifm_arr = filt_vifm_df.to_numpy().tolist()
    importers_with_id = node_id_dict['importers']
    edges = [
        (importers_with_id[(v[0], v[2])],
         producers_with_id[(v[1], v[2])],
         # TODO: make these actually be correct percentages
         {'pct_of_producer_input': as_fixed_point(v[3]),
          'pct_of_importer_output': as_fixed_point(v[3])})
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
create vertex {COUNTRY_VERTEX} (primary_id country_id UINT, code STRING)

create vertex {PRODUCT_VERTEX} (primary_id sector_id UINT, code STRING)

create vertex {IMPORTER_VERTEX} (primary_id importer_id UINT, country_code STRING, product_code STRING, code STRING)

create vertex {PRODUCER_VERTEX} (primary_id producer_id UINT, country_code STRING, product_code STRING, pct_of_national_output UINT, market_val_dollars UINT)

create undirected edge {LOCATION_EDGE} (from {PRODUCER_VERTEX}, to {COUNTRY_VERTEX})
create undirected edge {PRODUCTION_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCT_VERTEX})

create directed edge {DOMESTIC_INPUT_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCER_VERTEX}, pct_of_producer_input INT, pct_of_producer_output INT)

create directed edge {IMPORTED_INPUT_EDGE} (from {IMPORTER_VERTEX}, to {PRODUCER_VERTEX}, pct_of_producer_input INT, pct_of_importer_output INT)

create directed edge {TRADE_EDGE} (from {PRODUCER_VERTEX}, to {IMPORTER_VERTEX}, pct_of_imported_product_total INT, pct_of_producer_output INT)

create graph {UNFILTERED_GRAPH} ({COUNTRY_VERTEX}, {PRODUCT_VERTEX}, {PRODUCER_VERTEX}, {LOCATION_EDGE}, {PRODUCTION_EDGE}, {DOMESTIC_INPUT_EDGE}, {IMPORTED_INPUT_EDGE}, {IMPORTER_VERTEX}, {TRADE_EDGE})
''', options=[]))
    if drop_all:
        print('Now that drop all has been run you will need to create a secret and then add it to cfg.py to be able to do further operations (don\'t run with --drop-all again unless you want to repeat these steps!)')

def check_args():
    opts = [opt for opt in sys.argv[1:] if opt.startswith("-")]
    args = [arg for arg in sys.argv[1:] if not arg.startswith("-")]

    KNOWN_OPTS = {'--regen-schema': 'regen-schema', '--drop-all': 'drop-all'}
    rejected = args
    rejected.extend([r for r in opts if r not in KNOWN_OPTS])
    if len(rejected):
        raise SystemExit(f"Usage: {sys.argv[0]} [--regen-schema]...")
    return {KNOWN_OPTS[k]:k in opts for k in KNOWN_OPTS}

def clear_old_data(conn):
    print('Attempting to clear old data...')
    print(conn.runInstalledQuery('delete_all'))

def main(config, paths):
    conn = initDbForWriting(config, UNFILTERED_GRAPH)
    clear_old_data(conn)
    vom_df = pd.read_pickle(paths['VOM'])
    node_id_dict = add_nodes(conn, vom_df)
    vims_df = pd.read_pickle(paths['VIMS'])
    node_id_dict['importers'] = add_importers(conn, node_id_dict['producers'], vims_df)
    vdfm_df = pd.read_pickle(paths['VDFM'])
    vifm_df = pd.read_pickle(paths['VIFM'])
    add_product_input_edges(conn, node_id_dict, vdfm_df, vifm_df)
    
    print(conn.getVertexStats('*'))
    print(conn.getEdgeStats('*'))

if __name__ == "__main__":
    args = check_args()
    # print(check_args)
    cfg = dotenv_values('.env')
    if args['regen-schema']:
        recreate_schema(args['drop-all'], cfg)
    else:
        base_path = '/Users/byron/projects/hackathon/tg-graphforall/GTAP-initial/extracted/fully-disagg'
        paths = {
            'VOM': f'{base_path}-BaseView-VOM.pkl.bz2',
            'VIMS': f'{base_path}-BaseData-VIMS.pkl.bz2',
            'VDFM': f'{base_path}-BaseData-VDFM.pkl.bz2',
            'VIFM': f'{base_path}-BaseData-VIFM.pkl.bz2'}
        try:
            main(cfg, paths)
        except BaseException as err:
            print(f"Unexpected issue {err} ({type(err)})")