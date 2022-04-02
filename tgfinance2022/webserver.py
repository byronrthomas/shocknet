from flask import Flask, jsonify, request
import tgfinance2022.graph_db as db
from tgfinance2022 import shocks

companies = [{"id": 1, "name": "Company One"}, {"id": 2, "name": "Company Two"}]

api = Flask(__name__)
# For now, just share a single DB connection for the webserver
conn = db.initDbWithToken(db.make_config())

@api.route('/conditions', methods=['GET', 'POST'])
def conditions():
    if request.method == 'POST':
        param_data = request.get_json()
        print('Received JSON data: ', param_data)
        return jsonify(shocks.condition_graph_fixed_point(conn, **param_data))
    else:
        return jsonify(db.get_condition_info(conn))

@api.route('/reachable', methods=['POST'])
def reachable():
    param_data = request.get_json()
    print('Received JSON data: ', param_data)
    return jsonify(shocks.run_affected_countries_query(conn, **param_data))


if __name__ == '__main__':
    api.run() 
