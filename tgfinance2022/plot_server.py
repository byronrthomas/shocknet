import numpy as np
import panel as pn
import holoviews as hv
import holoviews.plotting.bokeh
import holoviews.element as hve
import xyzservices.providers as xyz

from bokeh.tile_providers import CARTODBPOSITRON, get_provider

points = hv.Points(np.random.randn(1000,2 )).opts(tools=['box_select', 'lasso_select'])
selection = hv.streams.Selection1D(source=points)
world_map = hve.tiles.OSM().opts(width=800, height=600)

def selected_info(index):
    arr = points.array()[index]
    if index:
        label = 'Mean x, y: %.3f, %.3f' % tuple(arr.mean(axis=0))
    else:
        label = 'No selection'
    return points.clone(arr, label=label).opts(color='red')

layout = world_map + points + hv.DynamicMap(selected_info, streams=[selection]) 

#pn.panel(layout).servable(title='HoloViews App')
server = pn.serve(layout, start=True, show=True)