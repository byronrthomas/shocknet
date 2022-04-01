import pandas as pd
import holoviews as hv
import numpy as np

hv.extension('bokeh')

df1 = pd.read_csv('countriesWithLocations.csv')
world_map = hv.element.tiles.OSM().opts(width=800, height=600)

nodes = hv.Nodes((df1['mercartorX'], df1['mercartorY'], df1.index, df1['Country']), vdims='Country')
edge_starts = np.arange(0, 70)
edge_ends = edge_starts + 1
graph1 = hv.Graph(((edge_starts, edge_ends), nodes),)
hv.save(world_map * graph1, 'example.html')
hv.save(graph1, 'example3.html')