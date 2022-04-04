import Datamap from 'datamaps';
import {commodityCodesToNames, regionNamesToMultiCountries} from './ref-data';

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
      options = defaultOptions.arcConfig;
    }

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
            console.log('Handling datum =', datum);
            var originXY, destXY;

            if (typeof datum.origin === "string") {
              switch (datum.origin) {
                   case "CAN":
                       originXY = self.latLngToXY(56.624472, -114.665293);
                       break;
                   case "CHL":
                       originXY = self.latLngToXY(-33.448890, -70.669265);
                       break;
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
                   case "USA":
                       originXY = self.latLngToXY(41.140276, -100.760145);
                       break;
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
                    case "CAN":
                        destXY = self.latLngToXY(56.624472, -114.665293);
                        break;
                    case "CHL":
                        destXY = self.latLngToXY(-33.448890, -70.669265);
                        break;
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
                    case "USA":
                        destXY = self.latLngToXY(41.140276, -100.760145);
                        break;
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

function formatGraphRegion(graphReg) {
  // Initially can only pretend the graph REGs are single countries
  // But the map likes to refer to them in uppercase alpha-3s
  if (graphReg in regionNamesToMultiCountries) {
    // Return just the codes for the country
    return regionNamesToMultiCountries[graphReg].codes_countries.map(x => x[0]);
  }
  return [graphReg.toUpperCase()];
}

function formatGraphProducer(graphProducer) {
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
const overrideRegionNameForCode = findOverrideNames(regionNamesToMultiCountries);

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
        countryData[cnt] = {shockedIndustries: [], nameOverride: overrideRegionNameForCode[cnt]};
      }
      console.log(`Adding industry ${edge.from_id} to country ${cnt}`);
      countryData[cnt].shockedIndustries.push({
        name: formatGraphProducer(edge.from_id),
        gdp_pct: formatFixedPercentage(edge.attributes.pct_of_national_output),
      });
    }
  }
  return countryData;
}

function graphProducerToGraphRegion(code) {
  return code.substring(0, 3);
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
      const fromReg = graphProducerToGraphRegion(edge.from_id);
      const toReg = graphProducerToGraphRegion(edge.to_id);
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
  return `${name} (${gdp_pct}% of GDP)`;
}

export function initMap(affectedCountryData, sectorLinkData, elem) {
    let data = {};
    for (var affected of Object.getOwnPropertyNames(affectedCountryData)) {
      data[affected] = {
        "fillKey": "impact",
        ...affectedCountryData[affected]};
    }
    console.log('Map data = ', data);

    // eslint-disable-next-line no-unused-vars
    var shock_map = new Datamap({
        element: elem,
        height: 900,
        data: data,
        responsive: true,
        scope: 'world',
        fills: {
          defaultFill: "#ABDDA4",
          impact: "#fc59e6",
        },
        geographyConfig: {
          highlightFillColor: '#0fa0fa',
          popupTemplate: function(geography, data) {
            return '<div class="hoverinfo">' + 
            (data.nameOverride ? 
              `<strong>${data.nameOverride} Region</strong> (includes ${geography.properties.name})` : 
              `<strong>${geography.properties.name}</strong>`) + 
            '<br/>Impacted critical sectors: ' +  data.shockedIndustries.map(industryShockAsText).join('; ') + '</div>';
          },
        },
      });
      shock_map.addPlugin('arc2', handleArcs);
    // Arcs coordinates can be specified explicitly with latitude/longtitude,
    // or just the geographic center of the state/country.
    const arcs = []
    const tradeShockLinks = sectorLinkData['tradeByFromAndToCountry']
    for ( var fromC in tradeShockLinks ) {
      for ( var toC in tradeShockLinks[fromC] ) {
        // TODO: not sure if it's possible to add data to arcs, but do it if we can
        // if we were, we'd add the contents of tradeShockLinks[fromC][toC] here for display
        arcs.push({
          origin: fromC,
          destination: toC
        });
            }
            }
    console.log('arcs', arcs);
    shock_map.arc2(arcs,  {strokeWidth: 2, arcSharpness: 1, strokeColor: '#f81313'});

}