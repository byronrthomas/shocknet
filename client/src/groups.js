import axios from 'axios';
import swal from 'sweetalert';
import {initMap, mapShockGroups} from './visualisation/map';
import {initAssumptionsInput, getAssumptionInputState, setInitialAssumptionState, setCurrentAssumptionInfo} from './user_input/assumptionInputs';
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

const mapElem = document.getElementById("map");
const mapControl = initMap(mapElem);

const runBtn = document.getElementById("btnRunAnalysis");
function handleRunAnalysisClick() {
    if (!currentAssumptions) {
        swal('Cannot run analysis', 'You must set some model assumptions before running analyses!', 'error');
        return;
    }

    if (document.getElementById("optionsRadiosStrongGroups").checked) {
        console.log("Strong group analysis selected");
        runShockGroups(false);
    } else if (document.getElementById("optionsRadiosWeakGroups").checked) {
        console.log("Weak group analysis selected");
        runShockGroups(true);
    } else {
        console.log("WARN: don't know how to run...");
    }
}

runBtn.addEventListener('click', handleRunAnalysisClick);

function runShockGroups(useWeakAnalysis) {
    const oldText = showButtonLoading(runBtn);
    console.log("Running shock group analysis for", useWeakAnalysis);
    axInstance.post(
        '/communities', {
            use_weak_cc: useWeakAnalysis
        })
        .then(function (response)
        {
            console.log('Got a successful response');
            console.log(response['data']);
            mapShockGroups(mapControl, response['data']);
            if (response.data.communities.length === 0) {
                const analysisText = useWeakAnalysis ?
                    'no countries are able to pass shocks from their producers to critical industries of others' :
                    'no pair of countries both pass shocks from their producer to a critical industry of the other, and receive shocks to a critical industry from a producer of the other';
                swal('No country groups', `Under the current model assumptions, ${analysisText}. All countries are isolated under these assumptions.`, 'info');
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

function showStrongAnalysisDescription() {
    document.getElementById('strongAnalysisDescription').removeAttribute('class');
    document.getElementById('weakAnalysisDescription').setAttribute('class', 'hidden');
}

function showWeakAnalysisDescription() {
    document.getElementById('strongAnalysisDescription').setAttribute('class', 'hidden');
    document.getElementById('weakAnalysisDescription').removeAttribute('class');
}

document.getElementById('optionsRadiosWeakGroups').addEventListener('click', showWeakAnalysisDescription);
document.getElementById('optionsRadiosStrongGroups').addEventListener('click', showStrongAnalysisDescription);

getInitialAssumptions();