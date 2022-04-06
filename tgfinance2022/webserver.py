from flask import Flask, jsonify, request
from flask_cors import CORS
import tgfinance2022.graph_db as db
from tgfinance2022 import shocks

companies = [{"id": 1, "name": "Company One"}, {"id": 2, "name": "Company Two"}]

api = Flask(__name__)
CORS(api)
# For now, just share a single DB connection for the webserver
conn = db.initDbWithToken(db.make_config())

## Rationale: We want this webserver to be a super skinny layer over the raw
## Python API (don't over-decouple it). We wouldn't use a webserver if we
## didn't want to keep Python for interacting with TigerGraph and to use
## Javascript for the visualizations - these are just the best choices, 
## hence we have a webserver, this isn't supposed to be a full-fat 3-tier app!
@api.route('/conditions', methods=['GET', 'POST'])
def conditions():
    if request.method == 'POST':
        param_data = request.get_json()
        print('Received JSON data: ', param_data)
        return jsonify(shocks.condition_graph_fixed_point(conn, **param_data))
    else:
        return jsonify(db.get_condition_info(conn))

## Rationale: We want this webserver to be a super skinny layer over the raw
## Python API (don't over-decouple it). We wouldn't use a webserver if we
## didn't want to keep Python for interacting with TigerGraph and to use
## Javascript for the visualizations - these are just the best choices, 
## hence we have a webserver, this isn't supposed to be a full-fat 3-tier app!
@api.route('/reachable', methods=['POST'])
def reachable():
    param_data = request.get_json()
    print('Received JSON data: ', param_data)
    return jsonify(shocks.run_affected_countries_query(conn, **param_data))

@api.route('/communities', methods=['POST'])
def communities():
    param_data = request.get_json()
    print('Received JSON data: ', param_data)
    return jsonify(shocks.find_country_partitions(conn, **param_data))

if __name__ == '__main__':
    api.run() 
