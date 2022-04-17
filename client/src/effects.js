import axios from 'axios';
import swal from 'sweetalert';
import {prepareCountryData, initMap, prepareLinkData, mapShocks} from './visualisation/map';
import {initAssumptionsInput, getAssumptionInputState, setInitialAssumptionState, setCurrentAssumptionInfo} from './user_input/assumptionInputs';
import { getShockedProducerState, initShockedProducersInput } from './user_input/shockedProducerInput';
import { showButtonLoading, reenableButton } from './visualisation/sharedWidgetLogic';

// TODO: pull from env
// eslint-disable-next-line no-undef
const HOST = __BACKEND_BASEURL__
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
        swal('Cannot update assumptions', `Invalid values:\n${assumptionState.errors.join('\n')}`, 'error');
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
                reenableButton(updateAssumptionsButton, oldText);
            });   
    }
}
updateAssumptionsButton.addEventListener('click', handleSubmitAssumptions);

const mapElem = document.getElementById("map");
const mapControl = initMap(mapElem);

const runBtn = document.getElementById("btnRunAnalysis");
function handleRunAnalysisClick() {
    if (!currentAssumptions) {
        swal('Cannot run analysis', 'You must set some model assumptions before running analyses!', 'error');
        return;
    }
    const shockSelection = getShockedProducerState();
    console.log('Currently selected shock state =', shockSelection);
    if (shockSelection.length > 0) {
        runShockReach(shockSelection);
    } else {
        swal('Cannot run analysis', 'You must select some producers experiencing supply shocks to be able to analyse how the shock spreads!', 'error');
        return;
    }
}

runBtn.addEventListener('click', handleRunAnalysisClick);

const pathsOutputElems = {
    shockPathHdr: document.getElementById('pShockPathHdr'),
    shockPathDetails: document.getElementById('tblShockPathDetails'),
};
const allPathsListElem = document.getElementById('tblAllShockPaths');
function runShockReach(vertices, /*handler*/) {
    const oldText = showButtonLoading(runBtn);
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
            mapShocks(mapControl, pathsOutputElems, allPathsListElem, affectedCountryData, sectorLinkData, response['data']['all_paths']);
            if (response.data.all_paths.length === 0) {
                swal('No results to display', 'No shocks starting from these producers reach any critical industries under your model assumptions - perhaps you should loosen the assumptions (decrease some thresholds)?', 'info');
            }
        })
        .catch(function (error) 
        {
            console.log('Error!!!', error);
        })
        .finally(function () {
            reenableButton(runBtn, oldText);
        });    
}

getInitialAssumptions();