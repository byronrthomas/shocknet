import Datamap from 'datamaps';
import { formatGraphRegion, codeToCountry, overrideRegionNameForCode, edgeToGraphRegions, graphRegionToUserText, edgeToDestRegion,  nodeAsSourceText, formatGraphProducer, nodeAsDestText } from './graph_model/formatting';

var defaultOptions = {
    scope: 'world',
    responsive: false,
    aspectRatio: 0.5625,
    // setProjection: setProjection,
    projection: 'equirectangular',
    dataType: 'json',
    data: {},
    done: function() {},
    fills: {
      defaultFill: '#ABDDA4'
    },
    filters: {},
    geographyConfig: {
        dataUrl: null,
        hideAntarctica: true,
        hideHawaiiAndAlaska : false,
        borderWidth: 1,
        borderOpacity: 1,
        borderColor: '#FDFDFD',
        popupTemplate: function(geography) {
          return '<div class="hoverinfo"><strong>' + geography.properties.name + '</strong></div>';
        },
        popupOnHover: true,
        highlightOnHover: true,
        highlightFillColor: '#FC8D59',
        highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
        highlightBorderWidth: 2,
        highlightBorderOpacity: 1
    },
    projectionConfig: {
      rotation: [97, 0]
    },
    bubblesConfig: {
        borderWidth: 2,
        borderOpacity: 1,
        borderColor: '#FFFFFF',
        popupOnHover: true,
        radius: null,
        popupTemplate: function(geography, data) {
          return '<div class="hoverinfo"><strong>' + data.name + '</strong></div>';
        },
        fillOpacity: 0.75,
        animate: true,
        highlightOnHover: true,
        highlightFillColor: '#FC8D59',
        highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
        highlightBorderWidth: 2,
        highlightBorderOpacity: 1,
        highlightFillOpacity: 0.85,
        exitDelay: 100,
        key: JSON.stringify
    },
    arcConfig: {
      strokeColor: '#DD1C77',
      strokeWidth: 1,
      arcSharpness: 1,
      animationSpeed: 600,
      popupOnHover: false,
      popupTemplate: function(geography, data) {
        // Case with latitude and longitude
        if ( ( data.origin && data.destination ) && data.origin.latitude && data.origin.longitude && data.destination.latitude && data.destination.longitude ) {
          return '<div class="hoverinfo"><strong>Arc</strong><br>Origin: ' + JSON.stringify(data.origin) + '<br>Destination: ' + JSON.stringify(data.destination) + '</div>';
        }
        // Case with only country name
        else if ( data.origin && data.destination ) {
          return '<div class="hoverinfo"><strong>Arc</strong><br>' + data.origin + ' -> ' + data.destination + '</div>';
        }
        // Missing information
        else {
          return '';
        }
      }
    }
  };
  function defaults(obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function(source) {
      if (source) {
        for (var prop in source) {
          // Deep copy if property not set
          if (obj[prop] == null) {
            if (typeof source[prop] == 'function') {
              obj[prop] = source[prop];
            }
            else {
              obj[prop] = JSON.parse(JSON.stringify(source[prop]));
            }
          }
        }
      }
    });
    return obj;
  }
  /*
    Getter for value. If not declared on datumValue, look up the chain into optionsValue
  */
    function val( datumValue, optionsValue, context ) {
        if ( typeof context === 'undefined' ) {
          context = optionsValue;
          optionsValue = undefined;
        }
        var value = typeof datumValue !== 'undefined' ? datumValue : optionsValue;
    
        if (typeof value === 'undefined') {
          return  null;
        }
    
        if ( typeof value === 'function' ) {
          var fnContext = [context];
          if ( context.geography ) {
            fnContext = [context.geography, context.data];
          }
          return value.apply(null, fnContext);
        }
        else {
          return value;
        }
      }

function handleArcs (layer, data, options) {
    var self = this,
        svg = this.svg;

    if ( !data || (data && !data.slice) ) {
      throw "Datamaps Error - arcs must be an array";
    }

    // For some reason arc options were put in an `options` object instead of the parent arc
    // I don't like this, so to match bubbles and other plugins I'm moving it
    // This is to keep backwards compatability
    for ( var i = 0; i < data.length; i++ ) {
      data[i] = defaults(data[i], data[i].options);
      delete data[i].options;
    }

    if ( typeof options === "undefined" ) {
      //console.log('Options was undefined');
      options = defaultOptions.arcConfig;
    }
    //console.log('Options = ', options);

    var arcs = layer.selectAll('path.datamaps-arc').data( data, JSON.stringify );

    var path = window.d3.geo.path()
        .projection(self.projection);

    arcs
      .enter()
        .append('svg:path')
        .attr('class', 'datamaps-arc')
        .style('stroke-linecap', 'round')
        .style('stroke', function(datum) {
          return val(datum.strokeColor, options.strokeColor, datum);
        })
        .style('fill', 'none')
        .style('stroke-width', function(datum) {
            return val(datum.strokeWidth, options.strokeWidth, datum);
        })
        .attr('d', function(datum) {
            // console.log('Handling datum =', datum);
            var originXY, destXY;

            if (typeof datum.origin === "string") {
              switch (datum.origin) {
                  //  case "CAN":                     
                  //      originXY = self.latLngToXY(56.624472, -114.665293);
                  //      break;
                  //  case "CHL":
                  //      originXY = self.latLngToXY(-33.448890, -70.669265);
                  //      break;
                   case "HRV":
                       originXY = self.latLngToXY(45.815011, 15.981919);
                       break;
                   case "IDN":
                       originXY = self.latLngToXY(-6.208763, 106.845599);
                       break;
                   case "JPN":
                       originXY = self.latLngToXY(35.689487, 139.691706);
                       break;
                   case "MYS":
                       originXY = self.latLngToXY(3.139003, 101.686855);
                       break;
                   case "NOR":
                       originXY = self.latLngToXY(59.913869, 10.752245);
                       break;
                  //  case "USA":
                  //      originXY = self.latLngToXY(41.140276, -100.760145);
                  //      break;
                   case "VNM":
                       originXY = self.latLngToXY(21.027764, 105.834160);
                       break;
                   default:
                       originXY = self.path.centroid(svg.select('path.' + datum.origin).data()[0]);
               }
            } else {
              originXY = self.latLngToXY(val(datum.origin.latitude, datum), val(datum.origin.longitude, datum))
            }

            if (typeof datum.destination === 'string') {
              switch (datum.destination) {
                    // case "CAN":
                    //     destXY = self.latLngToXY(56.624472, -114.665293);
                    //     break;
                    // case "CHL":
                    //     destXY = self.latLngToXY(-33.448890, -70.669265);
                    //     break;
                    case "HRV":
                        destXY = self.latLngToXY(45.815011, 15.981919);
                        break;
                    case "IDN":
                        destXY = self.latLngToXY(-6.208763, 106.845599);
                        break;
                    case "JPN":
                        destXY = self.latLngToXY(35.689487, 139.691706);
                        break;
                    case "MYS":
                        destXY = self.latLngToXY(3.139003, 101.686855);
                        break;
                    case "NOR":
                        destXY = self.latLngToXY(59.913869, 10.752245);
                        break;
                    // case "USA":
                    //     destXY = self.latLngToXY(41.140276, -100.760145);
                    //     break;
                    case "VNM":
                        destXY = self.latLngToXY(21.027764, 105.834160);
                        break;
                    default:
                        destXY = self.path.centroid(svg.select('path.' + datum.destination).data()[0]);
              }
            } else {
              destXY = self.latLngToXY(val(datum.destination.latitude, datum), val(datum.destination.longitude, datum));
            }
            var midXY = [ (originXY[0] + destXY[0]) / 2, (originXY[1] + destXY[1]) / 2];
            if (options.greatArc) {
                  // TODO: Move this to inside `if` clause when setting attr `d`
              var greatArc = window.d3.geo.greatArc()
                  .source(function(d) { return [val(d.origin.longitude, d), val(d.origin.latitude, d)]; })
                  .target(function(d) { return [val(d.destination.longitude, d), val(d.destination.latitude, d)]; });

              return path(greatArc(datum))
            }
            var sharpness = val(datum.arcSharpness, options.arcSharpness, datum);
            return "M" + originXY[0] + ',' + originXY[1] + "S" + (midXY[0] + (50 * sharpness)) + "," + (midXY[1] - (75 * sharpness)) + "," + destXY[0] + "," + destXY[1];
        })
        .attr('data-info', function(datum) {
          return JSON.stringify(datum);
        })
        .on('mouseover', function ( datum ) {
          var $this = window.d3.select(this);

          if (options.popupOnHover) {
            self.updatePopup($this, datum, options, svg);
          }
        })
        // eslint-disable-next-line no-unused-vars
        .on('mouseout', function ( _datum ) {
          // eslint-disable-next-line no-unused-vars
          var $this = window.d3.select(this);

          window.d3.selectAll('.datamaps-hoverover').style('display', 'none');
        })
        .transition()
          .delay(100)
          .style('fill', function(datum) {
            /*
              Thank you Jake Archibald, this is awesome.
              Source: http://jakearchibald.com/2013/animated-line-drawing-svg/
            */
            var length = this.getTotalLength();
            this.style.transition = this.style.WebkitTransition = 'none';
            this.style.strokeDasharray = length + ' ' + length;
            this.style.strokeDashoffset = length;
            this.getBoundingClientRect();
            this.style.transition = this.style.WebkitTransition = 'stroke-dashoffset ' + val(datum.animationSpeed, options.animationSpeed, datum) + 'ms ease-out';
            this.style.strokeDashoffset = '0';
            return 'none';
          })

    arcs.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }




const FIXED_POINT_DIVISOR = 10000;
function formatFixedPoint(fixedPtNum) {
  return fixedPtNum / FIXED_POINT_DIVISOR;
}

function formatFixedPercentage(fixedPtNum) {
  return formatFixedPoint(fixedPtNum);
}

export function prepareCountryData(rspData) {
  let allCountries = new Set(); 
  rspData.affected_countries.forEach(x => allCountries.add(x.v_id));
  const countryData = {}
  const edges = rspData.reachable_edges;
  // console.log('edges = ', edges);
  // console.log(rspData);
  for ( var edge of edges.filter(e => allCountries.has(e.to_id)) ) {
    for ( var cnt of formatGraphRegion(edge.to_id) ) {
      if ( !(cnt in countryData) ) {
        countryData[cnt] = {
          shockedIndustries: [], 
          nameOverride: overrideRegionNameForCode[cnt],
          graphRegion: edge.to_id,
          impactedIndustryGdpPct: 0.0};
      }
      // console.log(`Adding industry ${edge.from_id} to country ${cnt}`);
      countryData[cnt].shockedIndustries.push({
        name: formatGraphProducer(edge.from_id),
        gdp_pct: formatFixedPercentage(edge.attributes.pct_of_national_output),
      });
      countryData[cnt].impactedIndustryGdpPct += formatFixedPercentage(edge.attributes.pct_of_national_output);
    }
  }
  return countryData;
}


function ensureKeyPresent(obj, key, defaultValue) {
  if (!(key in obj)) {
    obj[key] = defaultValue;
  }
} 

export function prepareLinkData(rspData) {
  const edges = rspData.reachable_edges;
  console.log('edges = ', edges);
  const tradeByFromAndToCountry = {};
  const productionWithinCountry = {};
  for (var edge of edges) {
    if (edge.from_type === 'producer' && edge.to_type === 'producer') {
      const [fromReg, toReg] = edgeToGraphRegions(edge);
      const fromCountries = formatGraphRegion(fromReg);
      const edgeDetails = {
        'tradedCommodity': formatGraphProducer(edge.from_id),
        'producedCommodity': formatGraphProducer(edge.to_id),
        ...edge.attributes
      };
      if (fromReg !== toReg) {
        const toCountries = formatGraphRegion(toReg);
        for ( var fc of fromCountries ) {
          for ( var tc of toCountries ) {
            ensureKeyPresent(tradeByFromAndToCountry, fc, {});
            ensureKeyPresent(tradeByFromAndToCountry[fc], tc, []);
            tradeByFromAndToCountry[fc][tc].push(edgeDetails);
          }
        }
      } else {
        for ( fc of fromCountries ) {
          ensureKeyPresent(productionWithinCountry, fc, []);
          productionWithinCountry[fc].push(edgeDetails);
        }
      }
    }
  }
  console.log('productionWithinCountry = ', productionWithinCountry);
  console.log('tradeByFromAndToCountry = ', tradeByFromAndToCountry);
  return {
    tradeByFromAndToCountry,
    productionWithinCountry
  };
}

function industryShockAsText({name, gdp_pct}) {
  return `${name} (${pctAsString(gdp_pct)}% of GDP)`;
}

function countryPopupShockTransfer(geography, data) {
  return '<div class="hoverinfo">' + 
    (data.nameOverride ? 
      `<strong>${data.nameOverride} Region</strong> (includes ${geography.properties.name})` : 
      `<strong>${geography.properties.name}</strong>`) +
      ` - affected industries total ${pctAsString(data.impactedIndustryGdpPct)}% of GDP` + 
    '<br/>Impacted critical sectors: ' +  data.shockedIndustries.map(industryShockAsText).join('; ') + 
    '<br/>Click on country to show how shocks reach here (further down the page)</div>';
}
function countryPopupShockGrouping(geography, data) {
  if (data.communityDescription) {
    return '<div class="hoverinfo">' + 
    (data.nameOverride ? 
      `<strong>${data.nameOverride} Region</strong> (includes ${geography.properties.name})` : 
      `<strong>${geography.properties.name}</strong>`) + 
    '<br/>Belongs to the group: ' +  data.communityDescription + '</div>';
  }
  
}

var mode;
const SHOCK_TRANSFER_MODE = 'SHOCK_TRANSFER';
const SHOCK_GROUPING_MODE = 'SHOCK_GROUPING';
function handleCountryPopup(geography, data) {
  if (!mode) return '';
  if (mode === SHOCK_TRANSFER_MODE) return countryPopupShockTransfer(geography, data);
  if (mode === SHOCK_GROUPING_MODE) return countryPopupShockGrouping(geography, data);
}

function pctAsString(pctage) {
  return pctage.toFixed(1);
}

export function initMap(elem) {
    // eslint-disable-next-line no-unused-vars
    var shock_map = new Datamap({
        element: elem,
        height: 900,
        data: {},
        responsive: true,
        scope: 'world',
        fills: {
          defaultFill: "#ABDDA4",
          impact: '#5b0909',
          transfer: '#f81313',
          isolated: '#807e7e',
          shock_highest: '#5b0909',
          shock_high: '#8e3d3d',
          shock_low: '#b87575',
          shock_lowest: '#e8bbbb',
        },
        geographyConfig: {
          highlightFillColor: '#0fa0fa',
          popupTemplate: handleCountryPopup,
        },
        arcConfig: {
          popupOnHover: true,
        },
      });
      shock_map.addPlugin('arc2', handleArcs);
      return shock_map;
}

function impactedGdpPctToFillKey(gdpPercent) {
  if (gdpPercent <= 0.0) {
    console.log('WARN: asking to format a shock for country with total impacted GDP of 0 or less', gdpPercent);
    return 'defaultFill';
  }
  if (gdpPercent < 10.0) return 'shock_lowest';
  if (gdpPercent < 30.0) return 'shock_low';
  if (gdpPercent < 50.0) return 'shock_high';
  if (gdpPercent > 100.0) {
    console.log('WARN: asking to format a shock for country with total impacted GDP of more than 100', gdpPercent);
  }
  return 'shock_highest';
}



function edgeToText(edge) {
  const tradedCommodity = formatGraphProducer(edge.from_id);
  if (edge.e_type === 'critical_industry_of') {
    const toReg = edgeToDestRegion(edge);
    const toLbl = graphRegionToUserText(toReg);
    return `${tradedCommodity} is a critical industry of ${toLbl} (${pctAsString(formatFixedPercentage(edge.attributes.pct_of_national_output))}% of national output)`;
  }
  const [, toReg] = edgeToGraphRegions(edge);
  const toLbl = graphRegionToUserText(toReg);
  const fromText = nodeAsSourceText({v_id: edge.from_id, v_type: edge.from_type});
  const toText = nodeAsDestText({v_id: edge.to_id, v_type: edge.to_type});
  
  if (edge.e_type === 'trade_shock') {
    return `${fromText} -> ${toText}: ${fromText} is ${pctAsString(formatFixedPercentage(edge.attributes.pct_of_imported_product_total))}% of the total imported into ${toLbl}, and imported [${tradedCommodity}] makes up ${pctAsString(formatFixedPercentage(edge.attributes.pct_of_producer_input))}% of the inputs to ${toText}`
  }
  if (edge.e_type === 'production_shock') {
    return `${fromText} -> ${toText}: [${tradedCommodity}] makes up ${pctAsString(formatFixedPercentage(edge.attributes.pct_of_producer_input))}% of the inputs to ${toText}`;
  }
  throw Error('Unknown edge type ' + edge.e_type);
}



function formatPath(path, i) {
  // console.log('Going to format path', path);
  var result = `<em>Path ${i+1}</em><br>`;
  for (var edge of path) {
    result += edgeToText(edge);
    result += '<br>';
  }
  return result;
}

function showPaths(pathsOutputElem, geo, mapData, allPaths) {
  // console.log('Going to show paths based on ', mapData);
  // console.log('Will add to', pathsOutputElem);
  // console.log('Got paths', allPaths);
  var fullPathOutput = `<strong>Showing how shocks reach ${mapData.nameOverride ? mapData.nameOverride : geo.properties.name}</strong><br>`;
  fullPathOutput += allPaths.filter(path => path[path.length - 1]['to_id'] == mapData.graphRegion).map(formatPath).join('<br>');
  pathsOutputElem.innerHTML = fullPathOutput;
}

function formatPathSummary(path) {
  console.log('Asked to format path summary for', path);
  const startEdge = path[0];
  const fromText = nodeAsSourceText({v_id: startEdge.from_id, v_type: startEdge.from_type});
  const finalEdge = path[path.length - 1];
  const toText = nodeAsDestText({v_id: finalEdge.to_id, v_type: finalEdge.to_type});
  return `${path.length} hops: ${fromText} ===>>> ${toText}`;
}

function addLi(listElem, userText) {
  const li = document.createElement('li');
  li.textContent = userText;
  li.setAttribute("class", "list-group-item");
  listElem.appendChild(li);
}

function showPathSummaries(allPathsListElem, allPaths) {
  // Reverse sort by path length
  allPaths.sort((b, a) => a.length - b.length);
  for (var path of allPaths) {
    addLi(allPathsListElem, formatPathSummary(path));
  }
}

export function mapShocks(shock_map, pathDetailsElem, allPathsListElem, affectedCountryData, sectorLinkData, allPaths) {
  mode = SHOCK_TRANSFER_MODE;
  let data = {};
  // console.log('Affected country data = ', affectedCountryData);
  for (var affected of Object.getOwnPropertyNames(affectedCountryData)) {
    data[affected] = {
      "fillKey": impactedGdpPctToFillKey(affectedCountryData[affected].impactedIndustryGdpPct),
      ...affectedCountryData[affected]};
  }
  console.log('Map data = ', data);
  console.log('All paths = ', allPaths);
  shock_map.updateChoropleth(data, {reset: true});

  // Now reset any previous click handlers
  var subunits = shock_map.svg.select('g.datamaps-subunits');
  subunits.selectAll('path.datamaps-subunit').on('click', null);
  // And add a click handler for every affected country
  for (affected in affectedCountryData) {
    const extraData = data[affected];
    shock_map.svg.select('path.' + affected).on('click', (geo) => showPaths(pathDetailsElem, geo, extraData, allPaths));
  } 
 
  // Arcs coordinates can be specified explicitly with latitude/longtitude,
  // or just the geographic center of the state/country.
  const arcs = [];
  const tradeShockLinks = sectorLinkData['tradeByFromAndToCountry'];
  for ( var fromC in tradeShockLinks ) {
    for ( var toC in tradeShockLinks[fromC] ) {
      // TODO: not sure if it's possible to add data to arcs, but do it if we can
      // if we were, we'd add the contents of tradeShockLinks[fromC][toC] here for display
      arcs.push({
        origin: fromC,
        destination: toC,
        'fromOverride': overrideRegionNameForCode[fromC],
        'toOverride': overrideRegionNameForCode[toC],
        transfers: tradeShockLinks[fromC][toC],
      });
    }
  }
  function arcPopupTemplate(geography, data) {
    const fromCountry = codeToCountry(data.origin);
    const toCountry = codeToCountry(data.destination);
    const fromLbl = data.fromOverride ? data.fromOverride : fromCountry;
    const toLbl = data.toOverride ? data.toOverride : toCountry;
    const transferDetails = data.transfers.map(tr => `[${tr.tradedCommodity}] from ${fromLbl} -> [${tr.producedCommodity}] in ${toLbl}: [${tr.tradedCommodity}] from ${fromLbl} is ${pctAsString(formatFixedPercentage(tr.pct_of_imported_product_total))}% of the total imported into ${toLbl}, and imported [${tr.tradedCommodity}] makes up ${pctAsString(formatFixedPercentage(tr.pct_of_producer_input))}% of the inputs to [${tr.producedCommodity}] in ${toLbl}`);
    return '<div class="hoverinfo"><strong>Shock: ' + fromLbl + ' -> ' + toLbl + '</strong><br>'
    + transferDetails.join('<br>') + '</div>';
  }
  console.log('arcs', arcs);
  shock_map.arc2(arcs,  {strokeWidth: 1.5, arcSharpness: 1, strokeColor: '#f81313', popupOnHover: true, popupTemplate: arcPopupTemplate});

  const bubbles = [];
  const localShocks = sectorLinkData['productionWithinCountry'];
  const defaultBubble = {
    radius: 5,
    fillKey: 'transfer'
  };
  for (var localCnt in localShocks) {
    const toPush = {
      transfers: localShocks[localCnt], 
      countryOverride: overrideRegionNameForCode[localCnt],
      ...defaultBubble};
    // if (localCnt in COMMON_LAT_LONG_OVERRIDES) {
    //   bubbles.push({
    //     ...COMMON_LAT_LONG_OVERRIDES[localCnt],
    //     ...toPush
    //   })
    // } else {
      bubbles.push({
        centered: localCnt, 
        ...toPush});
    // }
  }
  console.log('bubbles', bubbles);
  shock_map.bubbles(bubbles, {
    popupTemplate: function(geo, data) {
      const lbl = data.countryOverride ?? codeToCountry(data.centered);
      const transferDetails = data.transfers.map(tr => `${tr.tradedCommodity} -> ${tr.producedCommodity}: [${tr.tradedCommodity}] makes up ${pctAsString(formatFixedPercentage(tr.pct_of_producer_input))}% of the inputs to [${tr.producedCommodity}] in ${lbl}`);
      return '<div class="hoverinfo"><strong>Local shock transfer in ' + lbl +
        '</strong><br>' + transferDetails.join('<br>') + '</div>';
    }
  });

  showPathSummaries(allPathsListElem, allPaths);

}

// eslint-disable-next-line no-unused-vars
function distinctColor(colorNum, colors){
  if (colors < 1) colors = 1; // defaults to one color - avoid divide by zero
  return "hsl(" + (colorNum * (360 / colors) % 360) + ",100%,50%)";
}

export function mapShockGroups(shock_map, {communities, singletons}, weak_groups) {
  mode = SHOCK_GROUPING_MODE;
  const communityCount = communities.length;
  var i = 0;
  let data = {};
  const wholeWorldGroup = singletons.length === 0 && communities.length === 1;
  for (var community of communities) {
      const commColor = distinctColor(i++, communityCount);
      const communityDescription = 
        wholeWorldGroup ?
        "all countries analysed" :
        community.map(gr => `${formatGraphRegion(gr).join(', ')}`).join(', ');
      for (var graphRegion of community) {
        for (var mapCountry of formatGraphRegion(graphRegion)) {
          data[mapCountry] = {
            "fillColor": commColor,
            "communityDescription": communityDescription,
          };
        }
      }
  }
  
  console.log('Map data = ', data);
  shock_map.updateChoropleth(data, {reset: true});

  shock_map.arc2([]);
  
  const bubbles = [];
  const defaultBubble = {
    radius: 2,
    fillKey: 'isolated'
  };
  for (graphRegion of singletons) {
    for (mapCountry of formatGraphRegion(graphRegion)) {
      bubbles.push({
        centered: mapCountry, 
        ...defaultBubble});
    }
  }
  console.log('bubbles', bubbles);
  shock_map.bubbles(bubbles, {
    popupTemplate: function(geo, data) {
      const lbl = data.countryOverride ?? codeToCountry(data.centered);
      return '<div class="hoverinfo"><strong>' + lbl +
        '</strong> is isolated from shocks under these assumptions<br>' + 
        (weak_groups ? "it neither receives nor transfers any shocks with others"
         : "it may receive or transfer a shock to others but it is does not do both") + '</div>';
    }
  });

}