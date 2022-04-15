import os
import sys
import traceback

import shocknet.graph_db as db
import shocknet.load_gtap_data as loader
import shocknet.webserver as server

def write_env_file(force_overwrite):
    if os.path.exists('.env'):
        if force_overwrite:
            print('.env file exists, but asked to overwrite..\n')
        else:
            print('.env file exists, will reuse, you can force an overwrite with --overwrite-env\n')
            return

    tg_pass = os.environ.get('SHOCKNET_DB_PASSWORD')
    tg_host = os.environ.get('SHOCKNET_DB_HOSTNAME')
    tg_user = os.environ.get('SHOCKNET_DB_USERNAME')
    if tg_pass and tg_host and tg_user:
        print('All env vars set correctly, saving for later')
        with open('.env', 'w') as wri:
            wri.write(f'HOSTNAME={tg_host}\nUSERNAME={tg_user}\nPASSWORD={tg_pass}\nSECRET=')
    else:
        raise Exception('Cannot properly initialise container - you must provide environment variables for the Tigergraph cloud instance: SHOCKNET_DB_HOSTNAME, SHOCKNET_DB_USERNAME, SHOCKNET_DB_PASSWORD')

def check_args():
    opts = [opt for opt in sys.argv[1:] if opt.startswith("-")]
    args = [arg for arg in sys.argv[1:] if not arg.startswith("-")]

    KNOWN_OPTS = {'--initialise': 'initialise', '--drop-all-schema': 'drop-all', '--overwrite-env': 'overwrite-env'}
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
    write_env_file(args['overwrite-env'])

    if args['initialise']:
        try:
            initialise_db(args['drop-all'])
        except BaseException as err:
            print(traceback.format_exc())
            print(f"Unexpected issue in DB initialisation:\n\t{err} ({type(err)})")
    else:
        server.main()


if __name__ == '__main__':
    args = check_args()
    main(args)