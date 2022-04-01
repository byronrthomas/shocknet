import math
import numpy as np
import pandas as pd
import pycountry

from geopy.geocoders import Nominatim

geolocator = Nominatim(user_agent="byront-tg-finance-2022")
hbsData = pd.read_csv('resources/hbs-crisis-data/HBS_Cleaned_20160923_global_crisis_data.csv')
countries = hbsData[['Country', 'CC3']].drop_duplicates(ignore_index=True)

def iso3CodeTo2Code(threecode):
    return pycountry.countries.get(alpha_3=threecode.strip()).alpha_2

def findLatLong(threecode):
    try:
       twocode = iso3CodeTo2Code(threecode)
       loc = geolocator.geocode(twocode)
       return (loc.latitude, loc.longitude)
    except BaseException as err:
       print('WARN: can\'t find any location for', threecode)
       print(f"Unexpected {err}, {type(err)}")
       return np.nan

def geographic_to_web_mercator_x(x_lon):     
    if abs(x_lon) <= 180:          
        num = x_lon * 0.017453292519943295         
        x = 6378137.0 * num         
        return x
    else:         
        print('Invalid coordinate values for conversion')  

def geographic_to_web_mercator_y(y_lat):     
    if abs(y_lat) < 90:          
        a = y_lat * 0.017453292519943295          
        y_mercator = 3189068.5 * math.log((1.0 + math.sin(a)) / (1.0 - math.sin(a)))         
        return y_mercator      
    else:         
        print('Invalid coordinate values for conversion')

countries['Location'] = countries.CC3.map(findLatLong)
countries[['Latitude', 'Longitude']] = pd.DataFrame(countries['Location'].tolist(), index=countries.index)
countries['mercartorY'] = countries['Latitude'].map(geographic_to_web_mercator_y)
countries['mercartorX'] = countries['Longitude'].map(geographic_to_web_mercator_x)


countries.to_csv('countriesWithLocations.csv')