import {regionNamesToMultiCountries, commodityCodesToNames} from './refData';
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


function graphProducerToGraphRegion(code) {
    return code.substring(0, 3);
  }

function unknownNodeType({v_type, v_id}) {
    throw Error(`Don't know how to handle node type ${v_type} to format ${v_id}`);
}

export function nodeToGraphRegion({v_type, v_id}) {
    if (v_type === 'producer') {
        return graphProducerToGraphRegion(v_id);
    }
    if (v_type === 'country') {
        return v_id;
    }
    unknownNodeType({v_type, v_id});
}

export function edgeToSourceRegion(edge) {
    return nodeToGraphRegion({v_type: edge.from_type, v_id: edge.from_id});
}

export function edgeToDestRegion(edge) {
    return nodeToGraphRegion({v_type: edge.to_type, v_id: edge.to_id});
}

export function edgeToGraphRegions(edge) {
    return [
        edgeToSourceRegion(edge),
        edgeToDestRegion(edge),
    ];
}

/***
 * Just turn a code into an English name, you can add extra info like the country of
 * an aggregate region outside this context.
 */
export function graphRegionToUserText(region) {
    return regionNamesToMultiCountries[region] ? regionNamesToMultiCountries[region].name : codeToCountry(region.toUpperCase());
}

export const overrideRegionNameForCode = findOverrideNames(regionNamesToMultiCountries);

export function formatGraphProducer(graphProducer) {
    if (graphProducer.length < 7) {
      // Should be a [three letter country code]-[three letter commod code] pattern
      console.log('WARN: cannot format as a producer:', graphProducer);
    }
    const graphComm = graphProducer.substring(4)
    const mapComm = commodityCodesToNames[graphComm];
    if (!mapComm) {
      console.log(`WARN: cannot find any corresponding commodity name for ${graphComm} - producer ${graphProducer}`);
    }
    return mapComm;
  }

function nodeToUserText({v_type, v_id}, joiningWord) {
    const ctry_lbl = graphRegionToUserText(nodeToGraphRegion({v_type, v_id}));
    if (v_type === 'producer') {
      const commodity = formatGraphProducer(v_id);
      return `[${commodity}] ${joiningWord} ${ctry_lbl}`;
    }
    if (v_type === 'country') {
      return `${ctry_lbl}`;
    }
    unknownNodeType({v_type, v_id});
  }
  
  export function nodeAsSourceText({v_type, v_id}) {
    return nodeToUserText({v_type, v_id}, 'from');
  }

  export function nodeAsDestText({v_type, v_id}) {
    return nodeToUserText({v_type, v_id}, 'in');
  }