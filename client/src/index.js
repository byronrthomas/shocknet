import axios from 'axios';
import {prepareCountryData, initMap, prepareLinkData, mapShocks} from './map';

// TODO: pull from env
const HOST = 'http://127.0.0.1:5000'
const axInstance = axios.create({
    baseURL: HOST,
    // Match TG timeout at least
    timeout: 60000
  });

const mapElem = document.getElementById("map");
const mapControl = initMap(mapElem);

const runBtn = document.getElementById("btnRunAnalysis");
function handleRunAnalysisClick() {
    if ( document.getElementById("optionsRadiosSpread").checked ) {
        console.log("Spread analysis selected");
        runShockReach(['mex-oil', 'usa-oil']);
    } else if (document.getElementById("optionsRadiosOther").checked) {
        console.log("Other analysis selected");
    } else {
        console.log("WARN: don't know how to run...");
    }
}

runBtn.addEventListener('click', handleRunAnalysisClick);

function runShockReach(producers, /*handler*/) {
    console.log("Running shock reach analysis for", producers);
    axInstance.post(
        '/reachable', {
            supply_shocked_producers: producers
        })
        .then(function (response)
        {
            console.log('Got a successful response');
            console.log(response['data']);
            const affectedCountryData = prepareCountryData(response['data']);
            const sectorLinkData = prepareLinkData(response['data']);
            mapShocks(mapControl, affectedCountryData, sectorLinkData);
        })
        .catch(function (error) 
        {
            console.log('Error!!!', error);
        });    
}

