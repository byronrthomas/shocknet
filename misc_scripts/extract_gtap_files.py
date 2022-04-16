import numpy as np
import pandas as pd
import sys

from harpy import HarFileObj

HAR_FILE_NAMES = [
    "BaseData.har",
"BaseView.har",
]

def headerArrayToDataFrame(harr):
    col_names = {}
    df = pd.DataFrame()
    shape = harr.array.shape
    print(f"Working on a headerArray with shape {shape}")
    print(f"SetNames = {harr.setNames}")
    final_size = 1
    for dim in shape:
        final_size = final_size * dim
    for i in range(len(harr.setNames)):
        # Got to repeat the full array for the dimensions coming before
        # (e.g. the last column is a full repeat for every value in the preceding columns)

        # We handle this by just resizing to the final size
        
        # And repeat each element for the dimensions coming after
        # So you end up with a dataframe looking like
        # A1 | B1 | C1
        # A1 | B1 | C2
        # A1 | B2 | C1
        # A1 | B2 | C2
        # A2 | B1 | C1
        # A2 | B1 | C2
        # A2 | B2 | C1
        # A2 | B2 | C2
        # First col has 2 * 2 element repeats, 1 full repeats (i.e. no repeat)
        # Second col has 2 element repeats, 2 full repeats
        # Third col has 1 element repeat (i.e. no repeat), 2 * 2 full repeats
        elem_repeats = 1
        for dim in shape[i+1:]:
            elem_repeats = elem_repeats * dim
        outcol = harr.setNames[i]
        if outcol in col_names:
            col_names[outcol] = col_names[outcol]  + 1
            outcol = f"{outcol}_{col_names[outcol]}"
        else:
            col_names[outcol] = 1
        print(f"Mangling column {harr.setNames[i]} ({outcol}) to have {final_size / (shape[i] * elem_repeats)} full repeats and {elem_repeats} element repeats")
        col_arr = np.array(harr.setElements[i])
        col_arr = np.repeat(col_arr, elem_repeats)
        col_arr = np.resize(col_arr, final_size)
        df[outcol] = col_arr
        df.head()
        df.info()
    df['Value'] = harr.array.flatten()
    return df


def outputHarFile(filePath, nm):
    harFile = HarFileObj(filePath)
    allHeaders = harFile.getHeaderArrayNames()
    print("Header names:", allHeaders)
    for h in allHeaders:
    # for h in ['VTWR']:
        outputFile = f"{nm}-{h}.pkl.bz2"
        print(f"Handling name {h} - will output as {outputFile}")
        df = headerArrayToDataFrame(harFile[h])
        df.to_pickle(outputFile)

def outputPath(basePath, nmPrefix):
    for f in HAR_FILE_NAMES:
    # for f in ['BaseData.har']:
        path = f'{basePath}/{f}'
        nm = f'{nmPrefix}-{f[:-4]}'
        print(f'Processing {f} - reading {path} - naming as {nm}')
        outputHarFile(path, nm)
        

if __name__ == "__main__":
    path = sys.argv[1]
    print('Running with path', path)
    outputPath(path, 'extracted-gtap-')
