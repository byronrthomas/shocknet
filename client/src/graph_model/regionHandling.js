import {regionNamesToMultiCountries} from './refData';
import iso from 'iso-3166-1';

export function codeToCountry(code) {
  const isoRes = iso.whereAlpha3(code);
  if (isoRes) {
    return isoRes.country;
  }
  console.log(`WARN: unable to find any info about ${code}`)
}


export function formatGraphRegion(graphReg) {
    // Initially can only pretend the graph REGs are single countries
    // But the map likes to refer to them in uppercase alpha-3s
    if (graphReg in regionNamesToMultiCountries) {
      // Return just the codes for the country
      return regionNamesToMultiCountries[graphReg].codes_countries.map(x => x[0]);
    }
    return [graphReg.toUpperCase()];
}

function findOverrideNames(mapByCode) {
    const res = {};
    for (var key in mapByCode) {
      const val = mapByCode[key];
      const nm = val.name;
      for (var codeAndName of val.codes_countries) {
        res[codeAndName[0]] = nm;
      }
    }
    console.log('Override names = ', res);
    return res;
}

export const overrideRegionNameForCode = findOverrideNames(regionNamesToMultiCountries);
  