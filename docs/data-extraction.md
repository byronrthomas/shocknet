# Extracting data used in ShockNet

## Introduction

**ShockNet embeds all of the data necessary to run as resources - these instructions are only for those interested in totally recreating everything from first principles**

If you're sure you need to do this, please read on.

## Instructions

You will need to create yourself a login with [GTAP](https://www.gtap.agecon.purdue.edu) to be download the software required.
Also ensure you have Python 3.7+ available.

1. From the [GTAP Data Bases Archive page](https://www.gtap.agecon.purdue.edu/databases/archives.asp) download GTAP8Agg 8.1 (2007) and GTAPAgg License - these are in the right-hand column of the table row starting "GTAP 8 Data Base".
2. Follow the instructions in the [video](https://youtu.be/sJNc3HJ7cdA) to get the HAR files out in the same form as ShockNet uses
3. Ensure you extract them from the zip into a folder where you will use them
4. Install the `harpy` python project that can read HAR files (e.g. `pip install harpy`)
5. Install `pandas` if you don't have it available (e.g. `pip install pandas`)
6. Run the [data extraction script](../misc_scripts/extract_gtap_files.py) passing it the path to the folder where your HAR files are
