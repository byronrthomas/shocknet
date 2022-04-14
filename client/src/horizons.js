import axios from 'axios';
import {initAssumptionsInput, getAssumptionInputState, setInitialAssumptionState, setCurrentAssumptionInfo} from './user_input/assumptionInputs';
import { getShockedProducerState, initShockedProducersInput } from './user_input/shockedProducerInput';
import { initShockNetwork, updateNetwork } from './visualisation/shockNetwork';
import { shockOriginationFiveCountries } from './trialData';
import { showButtonLoading, reenableButton } from './visualisation/sharedWidgetLogic';

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

const tblCurrentAssumptions = document.getElementById("tblCurrentAssumptions");
var currentAssumptions;
function getInitialAssumptions() {
    axInstance.get('/conditions')
        .then(function (response)
        {
            console.log('Got a successful response');
            if (response.data) {
                console.log('data = ', response.data);
                setInitialAssumptionState(response.data);
                setCurrentAssumptionInfo(tblCurrentAssumptions, response.data);
                currentAssumptions = response.data;
            }
        })
        .catch(function (error) 
        {
            console.log('Error!!!', error);
        });   
}

const updateAssumptionsButton = document.getElementById("btnUpdateAssumptions");
function handleSubmitAssumptions() {
    console.log('Update model assumptions clicked');
    const assumptionState = getAssumptionInputState();
    if (assumptionState.errors) {
        alert(`Cannot update:\n${assumptionState.errors.join('\n')}`);
    } else {
        const data = assumptionState.success;
        console.log('About to update model with assumptions =', data);
        const oldText = showButtonLoading(updateAssumptionsButton);
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
                    setCurrentAssumptionInfo(tblCurrentAssumptions, response.data);
                    currentAssumptions = response.data;
                }
            })
            .catch(function (error) 
            {
                console.log('Error!!!', error);
            })
            .finally(function () {
                console.log('Running finally block');
                reenableButton(updateAssumptionsButton, oldText);
            });   
    }
}
updateAssumptionsButton.addEventListener('click', handleSubmitAssumptions);

const shockVis = initShockNetwork(document.getElementById("networkVisualisation"));

const runBtn = document.getElementById("btnRunAnalysis");
function handleRunAnalysisClick() {
    if (!currentAssumptions) {
        alert('You must set some model assumptions before running analyses!');
        return;
    }
    const endpointSelection = getShockedProducerState();
    console.log('Currently selected endpoints =', endpointSelection);
    if (endpointSelection.length > 0) {
        runShockOrigination(endpointSelection);
    } else {
        alert('You must select some producers of interest before analysing which shocks could reach them!');
    }
}

runBtn.addEventListener('click', handleRunAnalysisClick);

// const pathsOutputElem = document.getElementById('pathsOutputElem');
// const allPathsListElem = document.getElementById('shockedPathsList');
function runShockOrigination(vertices, /*handler*/) {
    const oldText = showButtonLoading(runBtn);
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
        })
        .finally(function () {
            reenableButton(runBtn, oldText);
        });    
}

// If a quick input for testing is needed
const FILL_WITH_SAMPLE_DATA = !true;
if (FILL_WITH_SAMPLE_DATA) {
    // updateNetwork(shockVis, shockOriginationGbrAus);
    updateNetwork(shockVis, shockOriginationFiveCountries)
}

getInitialAssumptions();