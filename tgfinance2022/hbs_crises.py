import pandas as pd
import sys
import pyTigerGraph as tg
from collections import namedtuple
from dotenv import dotenv_values

CRISIS_COLUMNS = [
    'Banking Crisis',
    'Systemic Crisis',
    'Domestic_Debt_In_Default',
    'SOVEREIGN EXTERNAL DEBT 1: DEFAULT and RESTRUCTURINGS, 1800-2012--Does not include defaults on WWI debt to United States and United Kingdom and post-1975 defaults on Official External Creditors',
    'SOVEREIGN EXTERNAL DEBT 2: DEFAULT and RESTRUCTURINGS, 1800-2012--Does not include defaults on WWI debt to United States and United Kingdom but includes post-1975 defaults on Official External Creditors',
    'Currency Crises',
    'Inflation Crises'
]

PERMANENT_CHANGE_COLUMNS = [
    'Outside Gold Standard', # NOTE: 0->1 is important here
    'Independence',
]

def detect_crisis_of_type(df, crisis_type):
    print('\n\n\nGoing to detect a crisis of type', crisis_type)
    pdf = df.pivot(index='Year', columns='Country', values=crisis_type)
    pdf = pdf.sort_index()
    res = []
    for country in pdf:
        print('Working on country', country)
        # Iterate a country at a time
        in_crisis = 0.0
        start_year = None
        for year, indicator in pdf[country].items():
            # Implicitly treat N/A as 0
            cleandicator = 0.0 if pd.isna(indicator) else indicator

            if in_crisis != cleandicator:
                print(f'Change detected, indicator became {cleandicator} (strictly {indicator})')
                
                if in_crisis > 0.0 and cleandicator == 0.0:
                    print(f'Crisis ending detected in {year}')
                    if not start_year:
                        raise ValueError(f'Could not find start year for {crisis_type} of country {country} ended in {year}')
                    res.append({"start": start_year, "end": year, "type": crisis_type, "country": country})
                    print(f'Crisis started in {start_year} and ended in {year}')
                    start_year = None
                    
                elif in_crisis == 0.0 and cleandicator > 0.0:
                    print(f'Crisis beginning detected in {year}')
                    if start_year:
                        raise ValueError(f'Attempting to start a {crisis_type} in {year}, but start year already set to {start_year} -- when did that crisis end in country {country}?')
                    start_year = year

                else:
                    print(f'WARN: seemingly unimportant value change??? {in_crisis} became {cleandicator}')

                # Always update in_crisis tracking var
                in_crisis = cleandicator

    return res

def detect_instant_change(df, change_type, is_permanent):
    print('\n\n\nGoing to detect a instantaneous of type', change_type)
    pdf = df.pivot(index='Year', columns='Country', values=change_type)
    pdf = pdf.sort_index()
    res = []
    for country in pdf:
        print('Working on country', country)
        # Iterate a country at a time
        last_val = None
        start_year = None
        for year, indicator in pdf[country].items():
            if last_val is None: 
                # For this kind of change, skip over any initial 1.0s
                # (i.e. out of gold std at start)
                if indicator == 0.0:
                    print(f'For {change_type} skipped up until {year} in {country} when indicator first become 0.0')
                    last_val = indicator
                continue

            if last_val != indicator:
                print(f'Change detected, indicator became {indicator}')
                if last_val == 0.0 and indicator > 0.0:
                    print(f'{change_type} detected in {year}')
                    if start_year and is_permanent:
                        raise ValueError(f'Something wrong - spotted {change_type} in {year} of country {country}, which we expected to be permanent, but seems to have previously happened in {start_year}')
                    res.append({"start": year, "end": year, "type": change_type, "country": country})
                    start_year = year
                elif is_permanent:
                    raise ValueError(f'Unexpected change in indicator {change_type} in {year} for {country} - changed from {last_val} to {indicator} ???')
                    
                
                # Always update tracking var
                last_val = indicator

    return res  

CountryInfo = namedtuple("CountryInfo", "index code")
def summarise_country_info(df):
    df = df[['Country', 'CC3']]
    res = {}
    i = 0
    for r in df.itertuples():
        if r.Country not in res:
            res[r.Country] = CountryInfo(i, r.CC3)
            i += 1
    return res

def summarise_event_starts(event_occurrences):
    events_by_type_and_year = {}
    i = 0
    for ev in event_occurrences:
        if ev['type'] not in events_by_type_and_year:
            events_by_type_and_year[ev['type']] = {}
        by_type = events_by_type_and_year[ev['type']]
        if ev['start'] not in by_type:
            by_type[ev['start']] = i
            i += 1
    return events_by_type_and_year


def detectcrises(path):
    hbsdf = pd.read_csv(path).rename(columns={'Banking Crisis ': 'Banking Crisis'})
    hbsdf['Outside Gold Standard'] = hbsdf['Gold Standard'].map({1.0: 0.0, 0.0: 1.0})
    print(hbsdf)
    print('DATA TYPES')
    print(hbsdf.dtypes)
    print('INFO')
    print(hbsdf.info())
    all_crises = []
    for ctype in CRISIS_COLUMNS:
        r1 = detect_crisis_of_type(hbsdf, ctype)
        print(f'\nFound {len(r1)} instances of {ctype}')
        all_crises.extend(r1)

    for ptype in PERMANENT_CHANGE_COLUMNS:
        r1 = detect_instant_change(hbsdf, ptype, ptype == 'Independence')
        print(f'\nFound {len(r1)} instances of {ptype}')
        all_crises.extend(r1)
    
    print(f'\n\nFound {len(all_crises)} single-country crises in TOTAL')
    for r in all_crises:
        print(r)
    all_countries = summarise_country_info(hbsdf)
    return (all_crises, all_countries)

COUNTRY_VERTEX='country'
EVENT_VERTEX='event'
OCCURRED_EDGE='occurred'
HBS_GRAPH='hbs_event_occurrences'
def recreate_schema(drop_all, config):
    conn = tg.TigerGraphConnection(host=config['HOSTNAME'], username=config['USERNAME'], password=config['PASSWORD'])
    print(conn.gsql('ls', options=[]))
    if drop_all:
        print('GOING TO DROP ALL!!!!!')
        print(conn.gsql('DROP ALL', options=[]))
        print(conn.gsql('ls', options=[]))
    
    print(conn.gsql(f'''
create vertex {COUNTRY_VERTEX} (primary_id country_id UINT, name STRING, code STRING)

create vertex {EVENT_VERTEX} (primary_id event_id UINT, event_type STRING, start_year UINT)
                      
create undirected edge {OCCURRED_EDGE} (from country, to event, end_year UINT)

create graph {HBS_GRAPH} (country, event, occurred)
''', options=[]))
    if drop_all:
        print('Now that drop all has been run you will need to create a secret and then add it to cfg.py to be able to do further operations (don\'t run with --drop-all again unless you want to repeat these steps!)')

def add_to_graph(all_crises, all_countries, config):
    conn = tg.TigerGraphConnection(host=config['HOSTNAME'], username=config['USERNAME'], password=config['PASSWORD'], graphname=HBS_GRAPH)
    conn.getToken(config['SECRET'])
    print('Able to get a token')
    country_nodes = [(v.index, {'name': k, 'code': v.code}) for k,v in all_countries.items()]
    print("Upserted some country vertices:", conn.upsertVertices(COUNTRY_VERTEX, country_nodes))

    all_event_starts = summarise_event_starts(all_crises)
    event_nodes = [(v2, {'event_type': k, 'start_year': k2}) for k, inner in all_event_starts.items() for k2, v2 in inner.items()]
    print("Upserted some event vertices:", conn.upsertVertices(EVENT_VERTEX, event_nodes))

    occ_edges = [
        (all_countries[crisis['country']].index, 
        all_event_starts[crisis['type']][crisis['start']], 
        {'end_year': crisis['end']}) 
        for crisis in all_crises]
    print('Upserted some edges: ', 
        conn.upsertEdges(COUNTRY_VERTEX, OCCURRED_EDGE, EVENT_VERTEX, occ_edges))
    # print(occ_edges)

    

def check_args():
    opts = [opt for opt in sys.argv[1:] if opt.startswith("-")]
    args = [arg for arg in sys.argv[1:] if not arg.startswith("-")]

    KNOWN_OPTS = {'--regen-schema': 'regen-schema'}
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
        recreate_schema(False, cfg) # Need an arg if you want to drop-all
    else:
        print('Assuming that schema and secret are in place...')
        all_crises, all_countries = detectcrises('resources/hbs-crisis-data/HBS_Cleaned_20160923_global_crisis_data.csv')  
        add_to_graph(all_crises=all_crises, all_countries=all_countries, config=cfg)