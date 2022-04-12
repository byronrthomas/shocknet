import axios from 'axios';
// import {prepareCountryData, initMap, prepareLinkData, mapShocks, mapShockGroups} from './map';
import {initAssumptionsInput, getAssumptionInputState, setInitialAssumptionState, setAssumptionInfoText} from './user_input/assumptionInputs';
import { getShockedProducerState, initShockedProducersInput } from './user_input/shockedProducerInput';
import { initShockNetwork, updateNetwork } from './visualisation/shockNetwork';
import { shockOriginationFiveCountries } from './trialData';

// TODO: pull from env
const HOST = 'http://127.0.0.1:5000'
const axInstance = axios.create({
    baseURL: HOST,
    // Match TG timeout at least
    timeout: 60000
  });

  initAssumptionsInput({
    inputThreshInput: document.getElementById("assumptionInputPct"), 
    importThreshInput: document.getElementById("assumptionImportPct"), 
    criticalIndGdpInput: document.getElementById("critIndOutputPctInput"),
    criticalIndExportInput: document.getElementById("critIndExportPctInput"),
    criticalIndSkLabInput: document.getElementById("critIndSkLabPctInput"),
    criticalIndUnSkLabInput: document.getElementById("critIndUnSkLabPctInput"),
    criticalIndComboAllRadio: document.getElementById("optionsCritialIndAllThresh"),
    criticalIndComboSomeRadio: document.getElementById("optionsCritialIndSomeThresh"),
});

initShockedProducersInput(
    {
        regionSelect: document.getElementById("endpointProducerRegion"), 
        productSelect: document.getElementById("endpointProducerProduct"), 
        addWholeRegionButton: document.getElementById("endpointProducerAddRegion"),
        addSingleProducerButton: document.getElementById("endpointProducerAddSingle"),
        clearSelectionButton: document.getElementById("btnEndpointProducerClear"),
        currentList: document.getElementById("endpointProducersList"),
        allProducersPrefix: 'All critical industries of',
    },
);

const assumptionsInfoText = document.getElementById("currentAssumptionsInfo");
var currentAssumptions;
function getInitialAssumptions() {
    axInstance.get('/conditions')
        .then(function (response)
        {
            console.log('Got a successful response');
            if (response.data) {
                console.log('data = ', response.data);
                setInitialAssumptionState(response.data);
                setAssumptionInfoText(assumptionsInfoText, response.data);
                currentAssumptions = response.data;
            }
        })
        .catch(function (error) 
        {
            console.log('Error!!!', error);
        });   
}

function handleSubmitAssumptions() {
    console.log('Update model assumptions clicked');
    const assumptionState = getAssumptionInputState();
    if (assumptionState.errors) {
        alert(`Cannot update:\n${assumptionState.errors.join('\n')}`);
    } else {
        const data = assumptionState.success;
        console.log('About to update model with assumptions =', data);
        assumptionsInfoText.textContent = 'Updating...';
        axInstance.post(
            '/conditions', data)
            .then(function ()
            {
                console.log('Got a successful response to condition update - request latest');
                return axInstance.get('/conditions');
            })
            .then(function (response) {
                console.log('Got a successful response to fetch current condition');
                if (response.data) {
                    console.log('data = ', response.data);
                    setAssumptionInfoText(assumptionsInfoText, response.data);
                    currentAssumptions = response.data;
                }
            })
            .catch(function (error) 
            {
                console.log('Error!!!', error);
            });   
    }
}
document.getElementById("btnUpdateAssumptions").addEventListener('click', handleSubmitAssumptions);

const shockVis = initShockNetwork(document.getElementById("networkVisualisation"));

const runBtn = document.getElementById("btnRunAnalysis");
function handleRunAnalysisClick() {
    if (!currentAssumptions) {
        alert('You must set some model assumptions before running analyses!');
        return;
    }
    if ( document.getElementById("optionsRadiosOrigination").checked ) {
        console.log("Shock origination analysis selected");
        const endpointSelection = getShockedProducerState();
        console.log('Currently selected endpoints =', endpointSelection);
        if (endpointSelection.length > 0) {
            runShockOrigination(endpointSelection);
        } else {
            alert('You must select some producers of interest before analysing which shocks could reach them!');
        }
    // } else if (document.getElementById("optionsRadiosStrongGroups").checked) {
    //     console.log("Strong group analysis selected");
    //     runShockGroups(false);
    // } else if (document.getElementById("optionsRadiosWeakGroups").checked) {
    //     console.log("Weak group analysis selected");
    //     runShockGroups(true);
    } else {
        console.log("WARN: don't know how to run...");
    }
}

runBtn.addEventListener('click', handleRunAnalysisClick);

// const pathsOutputElem = document.getElementById('pathsOutputElem');
// const allPathsListElem = document.getElementById('shockedPathsList');
function runShockOrigination(vertices, /*handler*/) {
    console.log("Running shock reach analysis for", vertices);
    axInstance.post(
        '/originators', {
            endpoint_vertices: vertices
        })
        .then(function (response)
        {
            console.log('Got a successful response');
            console.log(response['data']);
            updateNetwork(shockVis, response['data']);
        })
        .catch(function (error) 
        {
            console.log('Error!!!', error);
        });    
}

// If a quick input for testing is needed
const FILL_WITH_SAMPLE_DATA = !true;
if (FILL_WITH_SAMPLE_DATA) {
    // updateNetwork(shockVis, shockOriginationGbrAus);
    updateNetwork(shockVis, shockOriginationFiveCountries)
}

getInitialAssumptions();