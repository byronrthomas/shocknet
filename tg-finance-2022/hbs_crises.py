import csv
from distutils.command.clean import clean
import pandas as pd

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

# STILL NEED TO DETECT THE INDEPENDENCE / GOLD STANDARD CHANGES
# Probably remap the gold standard to be "Out_Of_Gold_Std" so that we can detect 0->1 in both cases   

if __name__ == "__main__":
    detectcrises('resources/hbs-crisis-data/HBS_Cleaned_20160923_global_crisis_data.csv')    