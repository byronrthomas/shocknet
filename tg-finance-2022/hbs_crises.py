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

SINGLE_CHANGE_COLUMNS = [
    'Gold Standard', # NOTE: 1->0 is important here
    'Independence',  # Whereas here it's 0->1
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
            
    

def detectcrises(path):
    hbsdf = pd.read_csv(path).rename(columns={'Banking Crisis ': 'Banking Crisis'})
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
    
    print(f'\n\nFound {len(all_crises)} single-country crises in TOTAL')
    for r in all_crises:
        print(r)

# STILL NEED TO DETECT THE INDEPENDENCE / GOLD STANDARD CHANGES
# Probably remap the gold standard to be "Out_Of_Gold_Std" so that we can detect 0->1 in both cases   

if __name__ == "__main__":
    detectcrises('resources/hbs-crisis-data/HBS_Cleaned_20160923_global_crisis_data.csv')    