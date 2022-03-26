import pandas as pd
import pyTigerGraph as tg
import sys

from dotenv import dotenv_values

COUNTRY_VERTEX='country'
PRODUCT_VERTEX='product'
PRODUCER_VERTEX='producer'
LOCATION_EDGE='located_in'
PRODUCTION_EDGE='produces'
DOMESTIC_INPUT_EDGE='uses_domestic_input'
UNFILTERED_GRAPH='ecomonic_links_unfiltered'

def items_with_ids(lookup_key, df):
    vals = df[lookup_key].drop_duplicates().to_list()
    return {vals[i]: i for i in range(len(vals))}

def upsert_nodes(conn, vertex_type, nodes):
    count = conn.upsertVertices(vertex_type, nodes)
    print(f"Upserted {count} {vertex_type} vertices")

MAX_EDGE_REQUEST=10000
def upsert_edges(conn, edge_type, from_vertex_type, to_vertex_type, edges):
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
def add_producers(conn, products_with_id, countries_with_id, vomDf):
    filtVomDf = vomDf.query(f'Value > {MIN_OUTPUT_M_DOLLARS}.0')
    print('Filtered VOM:', filtVomDf.shape)

    vom_arr = filtVomDf.to_numpy().tolist()
    # Only count the commod and reg as the key
    producers_with_id = {(vom_arr[i][0], vom_arr[i][1]): i for i in range(len(vom_arr))}
    producer_nodes = [
        (producers_with_id[(v[0], v[1])], 
        # TODO: make truly a percentage by also summing by region
        {'pct_of_national_output': as_fixed_point(v[2]),
         'market_val_dollars': as_fixed_point(v[2])})
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

def add_product_input_edges(conn, node_id_dict, vdfm_df):
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
    

def initDbForWriting(config, graphname):
    conn = tg.TigerGraphConnection(host=config['HOSTNAME'], username=config['USERNAME'], password=config['PASSWORD'], graphname=graphname)
    conn.getToken(config['SECRET'])
    print('Able to get a token')
    return conn

## Going to define my own fixed point to avoid mucking about with floats too much
## Let's say 4 decimals - with percentages expressed as 10.5% rather than 0.105


## TODO: this doesn't have any of the concepts around imports, even with bilateral
## you need country-exported-good node and an edge from producer to 
## country-exported-good and a
## country-imported-good node with an edge from there to producer
def recreate_schema(drop_all, config):
    conn = tg.TigerGraphConnection(host=config['HOSTNAME'], username=config['USERNAME'], password=config['PASSWORD'])
    print(conn.gsql('ls', options=[]))
    if drop_all:
        print('GOING TO DROP ALL!!!!!')
        print(conn.gsql('DROP ALL', options=[]))
        print(conn.gsql('ls', options=[]))
    
    # Schema rationale - don't bother storing names etc in the DB, pretty easy to
    # just hard code these in clients rather than faff around ensuring they're present
    print(conn.gsql(f'''
create vertex {COUNTRY_VERTEX} (primary_id country_id UINT, code STRING)

create vertex {PRODUCT_VERTEX} (primary_id sector_id UINT, code STRING)

create vertex {PRODUCER_VERTEX} (primary_id producer_id UINT, pct_of_national_output UINT, market_val_dollars UINT)

create undirected edge {LOCATION_EDGE} (from {PRODUCER_VERTEX}, to {COUNTRY_VERTEX})
create undirected edge {PRODUCTION_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCT_VERTEX})

create directed edge {DOMESTIC_INPUT_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCER_VERTEX}, pct_of_producer_input INT, pct_of_producer_output INT)
                      

create graph {UNFILTERED_GRAPH} ({COUNTRY_VERTEX}, {PRODUCT_VERTEX}, {PRODUCER_VERTEX}, {LOCATION_EDGE}, {PRODUCTION_EDGE}, {DOMESTIC_INPUT_EDGE})
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

def main(config, vom_path, vdfm_path):
    conn = initDbForWriting(config, UNFILTERED_GRAPH)
    vom_df = pd.read_pickle(vom_path)
    node_id_dict = add_nodes(conn, vom_df)
    vdfm_df = pd.read_pickle(vdfm_path)
    add_product_input_edges(conn, node_id_dict, vdfm_df)
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
        main(cfg, f'{base_path}-BaseView-VOM.pkl.bz2', f'{base_path}-BaseData-VDFM.pkl.bz2')