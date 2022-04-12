import sys
import traceback
import math
import pyTigerGraph as tg
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
GRAPHNAME='economic_links'
CONDITION_VERTEX='condition_info'
# Conditioned edges
PRODUCTION_SHOCK_EDGE='production_shock'
TRADE_SHOCK_EDGE='trade_shock'
HAS_INDUSTRY_EDGE='has_industry'
CRITICAL_INDUSTRY_EDGE='critical_industry_of'
# REVERSEd conditioned edges
REV_PRODUCTION_SHOCK_EDGE='REV_production_shock'
REV_TRADE_SHOCK_EDGE='REV_trade_shock'
REV_HAS_INDUSTRY_EDGE='REV_has_industry'
REV_CRITICAL_INDUSTRY_EDGE='REV_critical_industry_of'
REVERSES = {
    PRODUCTION_SHOCK_EDGE: REV_PRODUCTION_SHOCK_EDGE,
    REV_PRODUCTION_SHOCK_EDGE: PRODUCTION_SHOCK_EDGE,
    TRADE_SHOCK_EDGE: REV_TRADE_SHOCK_EDGE,
    REV_TRADE_SHOCK_EDGE: TRADE_SHOCK_EDGE,
    CRITICAL_INDUSTRY_EDGE: REV_CRITICAL_INDUSTRY_EDGE,
    REV_CRITICAL_INDUSTRY_EDGE: CRITICAL_INDUSTRY_EDGE,
    HAS_INDUSTRY_EDGE: REV_HAS_INDUSTRY_EDGE,
    REV_HAS_INDUSTRY_EDGE: HAS_INDUSTRY_EDGE,
}

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

## Using my own fixed point to avoid mucking about with floats too much
## Let's say 4 decimals - with percentages expressed as 10.5% rather than 0.105 (i.e. 105000 with 4dp)
def as_fixed_point(v):
    if math.isnan(v):
        return 0
    return int(v * 10000)

def as_percent_fixed_point(v):
    return as_fixed_point(v * 100.0)

def producer_code(product_code, country_code):
    return f"{country_code}-{product_code}"

def importer_code(country_code, product_code):
    return f"IMPORTED-TO-{country_code}-{product_code}"

def initDbWithToken(config, graphname=GRAPHNAME):
    conn = tg.TigerGraphConnection(host=config['HOSTNAME'], username=config['USERNAME'], password=config['PASSWORD'], graphname=graphname)
    conn.getToken(config['SECRET'])
    print('Able to get a token')
    return conn

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

create vertex {PRODUCT_VERTEX} (primary_id sector_id STRING, code STRING, is_tradable_commodity BOOL)

create vertex {IMPORTER_VERTEX} (primary_id importer_id STRING, country_code STRING, product_code STRING, code STRING)

create vertex {PRODUCER_VERTEX} (primary_id producer_id STRING, country_code STRING, product_code STRING, pct_of_national_output UINT, market_val_dollars UINT, market_export_val_dollars UINT, pct_of_national_exports UINT, pct_of_national_sk_labour INT, pct_of_national_unsk_labour INT)

create vertex {CONDITION_VERTEX} (primary_id id UINT, condition_description STRING)

create undirected edge {LOCATION_EDGE} (from {PRODUCER_VERTEX}, to {COUNTRY_VERTEX})
create undirected edge {PRODUCTION_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCT_VERTEX})

create directed edge {DOMESTIC_INPUT_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCER_VERTEX}, market_val_dollars INT, pct_of_producer_input INT, pct_of_producer_output INT)

create directed edge {IMPORTED_INPUT_EDGE} (from {IMPORTER_VERTEX}, to {PRODUCER_VERTEX}, pct_of_producer_input INT, market_val_dollars INT)

create directed edge {TRADE_EDGE} (from {PRODUCER_VERTEX}, to {IMPORTER_VERTEX}, market_val_dollars INT, pct_of_imported_product_total INT, pct_of_producer_output INT)

create directed edge {PRODUCTION_SHOCK_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCER_VERTEX}, pct_of_producer_input INT, market_val_dollars INT)
create directed edge {TRADE_SHOCK_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCER_VERTEX}, pct_of_producer_input INT, pct_of_imported_product_total INT, market_val_dollars INT)
create directed edge {CRITICAL_INDUSTRY_EDGE} (from {PRODUCER_VERTEX}, to {COUNTRY_VERTEX}, pct_of_national_output UINT, market_val_dollars INT, pct_of_national_exports INT, pct_of_national_sk_labour INT, pct_of_national_unsk_labour INT)
create directed edge {HAS_INDUSTRY_EDGE} (from {COUNTRY_VERTEX}, to {PRODUCER_VERTEX}, pct_of_national_output UINT, market_val_dollars INT)

create directed edge {REV_PRODUCTION_SHOCK_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCER_VERTEX}, pct_of_producer_input INT, market_val_dollars INT)
create directed edge {REV_TRADE_SHOCK_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCER_VERTEX}, pct_of_producer_input INT, pct_of_imported_product_total INT, market_val_dollars INT)
create directed edge {REV_CRITICAL_INDUSTRY_EDGE} (from {COUNTRY_VERTEX}, to {PRODUCER_VERTEX}, pct_of_national_output UINT, market_val_dollars INT, pct_of_national_exports INT, pct_of_national_sk_labour INT, pct_of_national_unsk_labour INT)
create directed edge {REV_HAS_INDUSTRY_EDGE} (from {PRODUCER_VERTEX}, to {COUNTRY_VERTEX}, pct_of_national_output UINT, market_val_dollars INT)

create graph {GRAPHNAME} ({COUNTRY_VERTEX}, {PRODUCT_VERTEX}, {PRODUCER_VERTEX}, {LOCATION_EDGE}, {PRODUCTION_EDGE}, {DOMESTIC_INPUT_EDGE}, {IMPORTED_INPUT_EDGE}, {IMPORTER_VERTEX}, {TRADE_EDGE},{CONDITION_VERTEX}, {CRITICAL_INDUSTRY_EDGE}, {TRADE_SHOCK_EDGE}, {PRODUCTION_SHOCK_EDGE}, {HAS_INDUSTRY_EDGE}, {REV_CRITICAL_INDUSTRY_EDGE}, {REV_TRADE_SHOCK_EDGE}, {REV_PRODUCTION_SHOCK_EDGE}, {REV_HAS_INDUSTRY_EDGE})
''', options=[]))
    secret = conn.createSecret('pytigeraccess')
    config['SECRET'] = secret
    replace_in_config_file('SECRET', secret)

def install_queries(config, query_paths):
    conn = initDbWithToken(config)
    print(conn.gsql(f'USE GRAPH {GRAPHNAME}'))
    for p in query_paths:
        print('Installing code from ', p)
        res = conn.gsql(read_resource(p))
        print(res)
    print('All requested queries installed')

def check_args():
    opts = [opt for opt in sys.argv[1:] if opt.startswith("-")]
    args = [arg for arg in sys.argv[1:] if not arg.startswith("-")]

    KNOWN_OPTS = {'--regen-schema': 'regen-schema', '--drop-all': 'drop-all', '--install-standard-queries': 'install-standard-queries'}
    rejected = args
    rejected.extend([r for r in opts if r not in KNOWN_OPTS])
    if len(rejected):
        raise SystemExit(f"Usage: {sys.argv[0]} {' '.join(KNOWN_OPTS.keys())}...")
    return {KNOWN_OPTS[k]:k in opts for k in KNOWN_OPTS}

def read_resource(path):
    with open(path) as rdr:
        return rdr.read()

def clear_old_data(conn):
    print('Attempting to clear old data...')
    print(conn.runInterpretedQuery(read_resource('resources/gsql_queries/delete_all.gsql')))

def make_config():
    return dotenv_values('.env')

def replace_in_config_file(key, value):
    with open('.env') as rdr:
        lines = rdr.readlines()
    updated_lines = [l for l in lines if not l.startswith(f'{key}=')]
    updated_lines.append(f'{key}={value}')
    with open('.env', 'w') as w:
        w.writelines(updated_lines)

def get_condition_info(conn):
    return conn.getVertices(CONDITION_VERTEX)

STANDARD_QUERIES = [
    'resources/gsql_queries/from_tg_algo_lib/tg_scc.gsql',
    'resources/gsql_queries/from_tg_algo_lib/tg_wcc.gsql',
]

def reverse_edge_type(t):
    res = REVERSES.get(t)
    if res:
        return res
    raise Exception(f'Cannot figure out the reverse of edge type {t}')

def reverse_edges(edges):
    res = []
    for edge in edges:
        res.append({
            'to_id': edge['from_id'],
            'to_type': edge['from_type'],
            'from_id': edge['to_id'],
            'from_type': edge['to_type'],
            'e_type': reverse_edge_type(edge['e_type']),
            'attributes': edge['attributes'],
            'directed': edge['directed']})
    return res

if __name__ == "__main__":
    args = check_args()
    if [a for a in args if args[a]]:
        if args['regen-schema']:
            try:
                recreate_schema(args['drop-all'], make_config())
            except BaseException as err:
                print(traceback.format_exc())
                print(f"Unexpected issue:\n\t{err} ({type(err)})")

        if args['install-standard-queries']:
            try:
                install_queries(make_config(), STANDARD_QUERIES)
            except BaseException as err:
                print(traceback.format_exc())
                print(f"Unexpected issue:\n\t{err} ({type(err)})")
    else:
        raise Exception("Nothing to do!")
