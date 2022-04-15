import os
import sys
import traceback

import shocknet.graph_db as db
import shocknet.load_gtap_data as loader

def check_args():
    opts = [opt for opt in sys.argv[1:] if opt.startswith("-")]
    args = [arg for arg in sys.argv[1:] if not arg.startswith("-")]

    KNOWN_OPTS = {'--initialise': 'initialise', '--drop-all-schema': 'drop-all', '--bind-all': 'bind-all'}
    rejected = args
    rejected.extend([r for r in opts if r not in KNOWN_OPTS])
    if len(rejected):
        raise SystemExit(f"Usage: {sys.argv[0]} {' '.join(KNOWN_OPTS.keys())}...")
    return {KNOWN_OPTS[k]:k in opts for k in KNOWN_OPTS}

def initialise_db(drop_all):
    print('Asked to initialise GRAPH DB - dropping all schema?', drop_all)
    db_config = db.make_config()
    db.recreate_schema(drop_all, db_config)
    db.install_standard_queries(db_config)
    print('Schema loading complete, writing data')
    loader.write_standard_data(db_config)
    print('\n\nInitialisation complete - Tigergraph queries need installing, please refer to README instructions')

def main(args):

    if args['initialise']:
        try:
            initialise_db(args['drop-all'])
        except BaseException as err:
            print(traceback.format_exc())
            print(f"Unexpected issue in DB initialisation:\n\t{err} ({type(err)})")
    else:
        import shocknet.webserver as server
        server.main(args['bind-all'])


if __name__ == '__main__':
    args = check_args()
    main(args)