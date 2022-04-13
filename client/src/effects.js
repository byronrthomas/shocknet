import axios from 'axios';
import {prepareCountryData, initMap, prepareLinkData, mapShocks} from './visualisation/map';
import {initAssumptionsInput, getAssumptionInputState, setInitialAssumptionState, setAssumptionInfoText} from './user_input/assumptionInputs';
import { getShockedProducerState, initShockedProducersInput } from './user_input/shockedProducerInput';
// import {initParamsCardSwitcher} from './user_input/paramsCardSwitcher';

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
        regionSelect: document.getElementById("shockedProducerRegion"), 
        productSelect: document.getElementById("shockedProducerProduct"), 
        addWholeRegionButton: document.getElementById("shockedProducerAddRegion"),
        addSingleProducerButton: document.getElementById("shockedProducerAddSingle"),
        clearSelectionButton: document.getElementById("btnShockedProducerClear"),
        currentList: document.getElementById("shockedProducersList")}
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

const mapElem = document.getElementById("map");
const mapControl = initMap(mapElem);

const runBtn = document.getElementById("btnRunAnalysis");
function handleRunAnalysisClick() {
    if (!currentAssumptions) {
        alert('You must set some model assumptions before running analyses!');
        return;
    }
    const shockSelection = getShockedProducerState();
    console.log('Currently selected shock state =', shockSelection);
    if (shockSelection.length > 0) {
        runShockReach(shockSelection);
    } else {
        alert('You must select some starting producers to shock before analysing how the shock spreads!');
    }
}

runBtn.addEventListener('click', handleRunAnalysisClick);

const pathsOutputElem = document.getElementById('pathsOutputElem');
const allPathsListElem = document.getElementById('shockedPathsList');
function runShockReach(vertices, /*handler*/) {
    console.log("Running shock reach analysis for", vertices);
    axInstance.post(
        '/reachable', {
            supply_shocked_vertices: vertices
        })
        .then(function (response)
        {
            console.log('Got a successful response');
            console.log(response['data']);
            const affectedCountryData = prepareCountryData(response['data']);
            const sectorLinkData = prepareLinkData(response['data']);
            mapShocks(mapControl, pathsOutputElem, allPathsListElem, affectedCountryData, sectorLinkData, response['data']['all_paths']);
        })
        .catch(function (error) 
        {
            console.log('Error!!!', error);
        });    
}



// const spreadDetails = document.getElementById('shockSpreadDetails');
// document.getElementById('optionsRadiosSpread').addEventListener('click', () => spreadDetails.removeAttribute("class"));
// document.getElementById('optionsRadiosWeakGroups').addEventListener('click', () => spreadDetails.setAttribute('class', 'hidden'));
// document.getElementById('optionsRadiosStrongGroups').addEventListener('click', () => spreadDetails.setAttribute('class', 'hidden'));

getInitialAssumptions();