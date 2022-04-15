import json
import traceback
import pandas as pd
import sys

import shocknet.shocks as shocks
from shocknet.graph_db import COUNTRY_VERTEX, CRITICAL_INDUSTRY_EDGE, DOMESTIC_INPUT_EDGE, GRAPHNAME, IMPORTED_INPUT_EDGE, IMPORTER_VERTEX, LOCATION_EDGE, PRODUCER_VERTEX, PRODUCT_VERTEX, PRODUCTION_EDGE, PRODUCTION_SHOCK_EDGE, TRADE_EDGE, TRADE_SHOCK_EDGE, add_nodes_with_code, as_fixed_point, as_percent_fixed_point, clear_old_data, importer_code, initDbWithToken, make_config, producer_code, read_resource, upsert_edges, upsert_nodes

def distinct_values_of(lookup_key, df):
    return df[lookup_key].drop_duplicates().to_list()

def check_bad_percentages(df, col_name):
    bad_vals = df.query(f'{col_name} > 1.0')
    if bad_vals.shape[0] > 0:
        print('Bad rows...')
        print(bad_vals)
        raise Exception("Got bad rows")

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

def add_producers(conn, vom_df, export_info_df):
    # filt_vom_df = vom_df.query(f'Value > {MIN_OUTPUT_M_DOLLARS}.0')
    filt_vom_df = vom_df
    print('Filtered VOM:', filt_vom_df.shape)

    country_sum = vom_df.groupby(['REG']).sum()
    with_sums = pd.merge(filt_vom_df, country_sum.rename(columns={'Value': 'sum-REG'}), on=['REG'])
    with_sums['pct_of_national_output'] = with_sums['Value'] / with_sums['sum-REG']
    check_bad_percentages(with_sums, 'pct_of_national_output')
    with_sums = pd.merge(with_sums, export_info_df, left_on=['REG', 'NSAV_COMM'], right_on=['REG', 'TRAD_COMM'], how='left')

    vom_arr = with_sums[['NSAV_COMM', 'REG', 'Value', 'pct_of_national_output', 'export_val_dollars', 'pct_of_total_exports']].to_numpy().tolist()
        
    check_bad_percentages(with_sums, 'pct_of_national_output')
    check_bad_percentages(with_sums, 'pct_of_total_exports')

    producer_nodes = [
        # Only count the commod and reg as the key
        (producer_code(product_code=v[0], country_code=v[1]), 
        {'pct_of_national_output': as_percent_fixed_point(v[3]),
         'market_val_dollars': as_fixed_point(v[2]),
         'market_export_val_dollars': as_fixed_point(v[4]),
         'pct_of_national_exports': as_percent_fixed_point(v[5]),
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

def add_nodes(conn, vom_df, vxmd_df):
    traded_products = distinct_values_of('TRAD_COMM', vxmd_df)
    products = distinct_values_of('NSAV_COMM', vom_df)
    product_nodes = [(v, {'code': v, 'is_tradable_commodity': v in traded_products}) for v in products]
    upsert_nodes(conn, PRODUCT_VERTEX, product_nodes)

    countries = distinct_values_of('REG', vom_df)
    add_nodes_with_code(conn, COUNTRY_VERTEX, countries)

    add_producers(conn, vom_df, make_export_summary(vxmd_df))

def make_export_summary(vxmd_df):
    country_sum = vxmd_df.groupby(['REG']).sum()
    export_qty = vxmd_df.groupby(['REG', 'TRAD_COMM']).sum()
    export_pct = pd.merge(
        export_qty.reset_index().rename(columns={'Value': 'export_val_dollars'}), 
        country_sum.rename(columns={'Value': 'sum-exports-REG'}), 
        on=['REG'])
    export_pct['pct_of_total_exports'] = export_pct['export_val_dollars'] / export_pct['sum-exports-REG']
    return export_pct

def make_input_summary(vdfm_df, vifm_df, vfm_df):
    domestic_sum = vdfm_df.groupby(['PROD_COMM', 'REG']).sum().rename(columns={'Value': 'sum-of-domestic-inputs'})
    imported_sum = vifm_df.groupby(['PROD_COMM', 'REG']).sum().rename(columns={'Value': 'sum-of-imported-inputs'})
    endowment_sum = vfm_df.groupby(['PROD_COMM', 'REG']).sum().rename(columns={'Value': 'sum-of-endowment-inputs'})
    producer_input_summary = pd.merge(domestic_sum, imported_sum, left_index=True, right_index=True)
    producer_input_summary = pd.merge(producer_input_summary, endowment_sum, left_index=True, right_index=True)
    producer_input_summary['sum-of-all-inputs'] = producer_input_summary['sum-of-domestic-inputs'] + producer_input_summary['sum-of-imported-inputs'] + producer_input_summary['sum-of-endowment-inputs']
    return producer_input_summary.reset_index()


def add_product_input_edges(conn, vdfm_df, vifm_df, vom_df, vfm_df, input_summ_df):
    filt_vdfm_df = vdfm_df.query(f'Value > {MIN_OUTPUT_M_DOLLARS}.0')
    print('Filtered VDFM:', filt_vdfm_df.shape)

    with_sums = pd.merge(filt_vdfm_df, input_summ_df, on=['PROD_COMM', 'REG'])
    with_sums['pct_of_producer_input'] = with_sums['Value'] / with_sums['sum-of-all-inputs']
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


    ## Ensure the Endowment commods add input edges too
    ## NOTE: it's not legit to condition the edges by value as need them
    ## to be able to link to the producers in conditioning query - otherwise
    ## a skilled labour thresh of 0 can filter some producers since they have
    ## <1M demand for skilled labour and so wouldn't have an edge using filter VFM
    ## filt_vfm_df = vfm_df.query(f'Value > {MIN_OUTPUT_M_DOLLARS}.0')
    filt_vfm_df = vfm_df
    print('Filtered VFM:', filt_vfm_df.shape)
    e_with_sums = pd.merge(filt_vfm_df.rename(columns={'ENDW_COMM': 'TRAD_COMM'}), input_summ_df, on=['PROD_COMM', 'REG'])
    e_with_sums['pct_of_producer_input'] = e_with_sums['Value'] / e_with_sums['sum-of-all-inputs']
    e_with_sums = pd.merge(e_with_sums, vom_df.rename(columns={'NSAV_COMM': 'TRAD_COMM', 'Value': 'sum-TRAD_COMM-REG'}), on=['REG', 'TRAD_COMM'])
    e_with_sums['pct_of_producer_output'] = e_with_sums['Value'] / e_with_sums['sum-TRAD_COMM-REG']
    # Should be TRADed_COMM, PRODuced_COMM, REG, Value
    vfm_arr = e_with_sums[
        ['TRAD_COMM', 'PROD_COMM', 'REG', 'Value', 'pct_of_producer_input', 'pct_of_producer_output']].to_numpy().tolist()
    edges = [
        (producer_code(product_code=v[0], country_code=v[2]),
         producer_code(product_code=v[1], country_code=v[2]),
         {'market_val_dollars': as_fixed_point(v[3]),
          'pct_of_producer_input': as_percent_fixed_point(v[4]),
          'pct_of_producer_output': as_percent_fixed_point(v[5])})
        for v in vfm_arr
    ]
    upsert_edges(conn, DOMESTIC_INPUT_EDGE, PRODUCER_VERTEX, PRODUCER_VERTEX, edges)


    filt_vifm_df = vifm_df.query(f'Value > {MIN_OUTPUT_M_DOLLARS}.0')
    print('Filtered VIFM:', filt_vifm_df.shape)

    i_with_sums = pd.merge(filt_vifm_df, input_summ_df, on=['PROD_COMM', 'REG'])
    i_with_sums['pct_of_producer_input'] = i_with_sums['Value'] / i_with_sums['sum-of-all-inputs']
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
    



def check_args():
    opts = [opt for opt in sys.argv[1:] if opt.startswith("-")]
    args = [arg for arg in sys.argv[1:] if not arg.startswith("-")]

    KNOWN_OPTS = {'--write-data': 'write-data'}
    rejected = args
    rejected.extend([r for r in opts if r not in KNOWN_OPTS])
    if len(rejected):
        raise SystemExit(f"Usage: {sys.argv[0]} {' '.join(KNOWN_OPTS.keys())}...")
    return {KNOWN_OPTS[k]:k in opts for k in KNOWN_OPTS}

def write_data(config, paths):
    conn = initDbWithToken(config, GRAPHNAME)
    clear_old_data(conn)
    vom_df = pd.read_pickle(paths['VOM'])
    vxmd_df = pd.read_pickle(paths['VXMD'])
    add_nodes(conn, vom_df, vxmd_df)
    add_importers(conn, vxmd_df, vom_df)
    vdfm_df = pd.read_pickle(paths['VDFM'])
    vifm_df = pd.read_pickle(paths['VIFM'])
    vfm_df = pd.read_pickle(paths['VFM'])
    add_product_input_edges(conn, vdfm_df, vifm_df, vom_df, vfm_df, make_input_summary(vdfm_df, vifm_df, vfm_df))
    
    # Final step - ensure we post-process to de-normalise 
    # some stats onto nodes for later convenience
    conn.runInterpretedQuery(read_resource('resources/gsql_queries/post_process_producers.gsql'))

    print(conn.getVertexStats('*'))
    # print(conn.getEdgeStats('*', skipNA=True))

def condition_graph_float_proportions(config, input_thresh, import_thresh, critical_ind_thresh):
    shocks.condition_graph_fixed_point(config, as_percent_fixed_point(input_thresh), as_percent_fixed_point(import_thresh), as_percent_fixed_point(critical_ind_thresh))

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

def to_json_file(path, obj):
    with open(path, 'w') as wri:
       json.dump(obj, wri, indent=2)

def run_shocks_query(config, starting_producers):
    res = shocks.run_affected_countries_query(config, starting_producers)
    to_json_file('reachable_countries.json', res['affected_countries'])
    to_json_file('reachable_edges.json', res['reachable_edges'])
    affected_countries = {c['attributes']['code'] for c in res['affected_countries']}
    print(f'All affected countries ({len(affected_countries)})...')
    print(affected_countries)

def main(args):
    cfg = make_config()
    if args['write-data']:
        base_path = 'resources/gtap_extracted/fully-disagg'
        paths = {
            'VOM': f'{base_path}-BaseView-VOM.pkl.bz2',
            'VXMD': f'{base_path}-BaseData-VXMD.pkl.bz2',
            'VDFM': f'{base_path}-BaseData-VDFM.pkl.bz2',
            'VIFM': f'{base_path}-BaseData-VIFM.pkl.bz2',
            'VFM': f'{base_path}-BaseData-VFM.pkl.bz2',}
        write_data(cfg, paths)
    else:
        conn = initDbWithToken(cfg, GRAPHNAME)
        mex_oil = producer_code(product_code='oil', country_code='mex')
        usa_oil = producer_code(product_code='oil', country_code='usa')

        # LAOtian PCR (processed rice) - shouldn't go too far?
        # run_query(cfg, [783], 0.25, 0.01)
        condition_graph_float_proportions(conn, 0.25, 0.1, 0.05)
        run_shocks_query(conn, [mex_oil, usa_oil])

if __name__ == "__main__":
    args = check_args()
    try:
        main(args)
    except BaseException as err:
        print(traceback.format_exc())
        print(f"Unexpected issue {err} ({type(err)})")
    # print(check_args)
    