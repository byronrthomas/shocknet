import pandas as pd
import pyTigerGraph as tg
from dotenv import dotenv_values

config = dotenv_values('.env')
conn = tg.TigerGraphConnection(host=config['HOSTNAME'], username=config['USERNAME'], password=config['PASSWORD'], graphname='economic_links')
conn.getToken(config['SECRET'])
res = conn.runInstalledQuery('supply_cut2', 'cuts=2707')
rlinks = res[0]['@@links']
# 4840 is tha p_c
# linked to 4223 which seems to be svn p_c
# linked to 3285 which seems to be svn ofd
# 6099 is svn ome