import json
from flask import Flask, jsonify, request, redirect
from flask_cors import CORS
import shocknet.graph_db as db
from shocknet import shocks

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
        return jsonify(shocks.current_condition(conn))

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

@api.route('/originators', methods=['POST'])
def originators():
    param_data = request.get_json()
    print('Received JSON data: ', param_data)
    return jsonify(shocks.run_shock_origination_query(conn, **param_data))

@api.route('/self-check', methods=['GET'])
def selfCheck():
    return jsonify(db.run_data_quality_selfcheck(conn))

@api.route('/')
def hello():
    return redirect("/static/effects.html", code=302)

def main(bind_all_addresses=False):
    if bind_all_addresses:
        api.run(host='0.0.0.0')
    else:
        api.run() 

if __name__ == '__main__':
    main()
