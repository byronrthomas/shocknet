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
    
    print(conn.gsql(f'''
create vertex {COUNTRY_VERTEX} (primary_id country_id UINT, name STRING, code STRING)

create vertex {PRODUCT_VERTEX} (primary_id sector_id UINT, name STRING, code STRING)

create vertex {PRODUCER_VERTEX} (primary_id producer_id UINT, pct_of_national_output UINT, market_val_dollars UINT)

create undirected edge {LOCATION_EDGE} (from {PRODUCER_VERTEX}, to {COUNTRY_VERTEX})
create undirected edge {PRODUCTION_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCT_VERTEX})

create directed edge {DOMESTIC_INPUT_EDGE} (from {PRODUCER_VERTEX}, to {PRODUCER_VERTEX}, percent_of_producer_input INT, percent_of_producer_output INT)
                      

create graph {UNFILTERED_GRAPH} ({COUNTRY_VERTEX}, {PRODUCT_VERTEX}, {PRODUCER_VERTEX}, {LOCATION_EDGE}, {PRODUCTION_EDGE}, {DOMESTIC_INPUT_EDGE})
''', options=[]))
    if drop_all:
        print('Now that drop all has been run you will need to create a secret and then add it to cfg.py to be able to do further operations (don\'t run with --drop-all again unless you want to repeat these steps!)')

## NEXT STEPS:
## 1. Make code that can write all of the nodes for the producer vertices (needs tracking primary keys etc)
## 2. Can a single request push all 8k of these into the graph in one go
## 3. How does the disk space look
## 4. Onto edges as defined above, same question


def check_args():
    opts = [opt for opt in sys.argv[1:] if opt.startswith("-")]
    args = [arg for arg in sys.argv[1:] if not arg.startswith("-")]

    KNOWN_OPTS = {'--regen-schema': 'regen-schema', '--drop-all': 'drop-all'}
    rejected = args
    rejected.extend([r for r in opts if r not in KNOWN_OPTS])
    if len(rejected):
        raise SystemExit(f"Usage: {sys.argv[0]} [--regen-schema]...")
    return {KNOWN_OPTS[k]:k in opts for k in KNOWN_OPTS}

if __name__ == "__main__":
    args = check_args()
    # print(check_args)
    cfg = dotenv_values('.env')
    if args['regen-schema']:
        recreate_schema(args['drop-all'], cfg)