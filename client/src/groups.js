import axios from 'axios';
import {initMap, mapShockGroups} from './visualisation/map';
import {initAssumptionsInput, getAssumptionInputState, setInitialAssumptionState, setAssumptionInfoText} from './user_input/assumptionInputs';


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
        })
        .catch(function (error) 
        {
            console.log('Error!!!', error);
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