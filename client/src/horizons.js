import axios from 'axios';
import swal from 'sweetalert';
import {initAssumptionsInput, getAssumptionInputState, setInitialAssumptionState, setCurrentAssumptionInfo} from './user_input/assumptionInputs';
import { getShockedProducerState, initShockedProducersInput } from './user_input/shockedProducerInput';
import { initShockNetwork, updateNetwork } from './visualisation/shockNetwork';
import { shockOriginationFiveCountries } from './trialData';
import { showButtonLoading, reenableButton } from './visualisation/sharedWidgetLogic';
import {updatePaths} from './visualisation/horizonPathOutput';

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
        swal('Cannot run analysis', 'You must set some model assumptions before running analyses!', 'error');
        return;
    }
    const endpointSelection = getShockedProducerState();
    console.log('Currently selected endpoints =', endpointSelection);
    if (endpointSelection.length > 0) {
        runShockOrigination(endpointSelection);
    } else {
        swal('Cannot run analysis', 'You must select some producers to be protected before analysing which shocks could reach them!', 'error');
        return;
    }
}

runBtn.addEventListener('click', handleRunAnalysisClick);

const shockPathDetails = document.getElementById('tblShockPathDetails');
const shockDetailsOmitted = document.getElementById('pOmittedProducerDetails');
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
            const shocks = response['data'];
            updatePaths(shockPathDetails, shockDetailsOmitted, shocks['domestic_edges_by_targets'], shocks['distinct_path_counts_by_targets']);
            if (response.data.all_paths.length === 0) {
                swal('No results to display', 'Under the current model assumptions, no shocks are able to reach the producers you wish to protect - perhaps you should loosen the assumptions (decrease some thresholds)?', 'info');
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

// If a quick input for testing is needed
const FILL_WITH_SAMPLE_DATA = !true;
if (FILL_WITH_SAMPLE_DATA) {
    // updateNetwork(shockVis, shockOriginationGbrAus);
    updateNetwork(shockVis, shockOriginationFiveCountries)
}

getInitialAssumptions();