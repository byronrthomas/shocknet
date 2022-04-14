
const namesToInfo = {
    input_thresh: { 
        userText: 'x% of producer input',
    },
    import_thresh: { 
        userText: 'y% of product imports',
    },
    critical_ind_gdp_thresh: { 
        userText: 'z1% of national output',
        isCriticalIndRelated: true,
    },
    critical_ind_export_thresh: { 
        userText: 'z2% of national exports',
        isCriticalIndRelated: true,
    }, 
    critical_ind_skilled_lab_thresh: { 
        userText: 'z3% of skilled labour',
        isCriticalIndRelated: true,
    }, 
    critical_ind_unskilled_lab_thresh: { 
        userText: 'z4% of unskilled labour',
        isCriticalIndRelated: true,
    },
    critical_ind_meets_all_thresholds: { 
        userText: 'thresholds must be met by a critical industry',
        isCriticalIndRelated: true,
    },
}

export function initAssumptionsInput({
        inputThreshInput, 
        importThreshInput, 
        criticalIndGdpInput,
        criticalIndExportInput,
        criticalIndSkLabInput,
        criticalIndUnSkLabInput,
        criticalIndComboAllRadio,
        criticalIndComboSomeRadio,}) {
    namesToInfo.input_thresh.control = inputThreshInput;
    namesToInfo.import_thresh.control = importThreshInput;
    namesToInfo.critical_ind_gdp_thresh.control = criticalIndGdpInput;
    namesToInfo.critical_ind_export_thresh.control = criticalIndExportInput;
    namesToInfo.critical_ind_skilled_lab_thresh.control = criticalIndSkLabInput;
    namesToInfo.critical_ind_unskilled_lab_thresh.control = criticalIndUnSkLabInput;
    namesToInfo.critical_ind_meets_all_thresholds.all_radio = criticalIndComboAllRadio;
    namesToInfo.critical_ind_meets_all_thresholds.some_radio = criticalIndComboSomeRadio;
}

function ctrlInputToFixedNum(inp) {
    return 10000 * inp;
}

function fixedNumToCtrlInput(num) {
    return num / 10000;
}

export function setInitialAssumptionState(state) {
    for (var k in namesToInfo) {
        const newVal = state[k];
        if (isComboControl(k)) {
            if (newVal) {
                namesToInfo[k].all_radio.checked = true;
            } else {
                namesToInfo[k].some_radio.checked = true;
            }
            
        } else {
            namesToInfo[k].control.value = fixedNumToCtrlInput(newVal); 
        }
    }
}


function getCtrlInput(name) {
    const details = namesToInfo[name];
    if (!details) {
        throw Error("Cannot find any control details for name = " + name);
    }
    console.log('Accessing name', name);
    console.log('Got details = ', details);
    if (isComboControl(name)) {
        const val = details.all_radio.checked && !details.some_radio.checked;
        console.log('Assessed ALL thresholds to be', val);
        return {success: val};
    }

    console.log('Details.control = ', details.control);
    const minAllowed = details.isCriticalIndRelated ? 0 : 1;
    const val = details.control.value;
    if ( val < minAllowed || val > 100 ) {
        return {error: `${details.userText} must be set between ${minAllowed}..100 inclusive, currently ${val}%`};
    }
    return {success: ctrlInputToFixedNum(val)};
}

export function getAssumptionInputState() {
    var errors = [];
    const result = {};
    for (var k in namesToInfo) {
        const i = getCtrlInput(k);
        if (i.error) {
            errors.push(i.error);
        } else {
            result[k] = i.success;
        }
    }
    if (errors.length > 0) {
        return {errors};
    }
    return {success: result};
}

function isComboControl(key) {
    return key === 'critical_ind_meets_all_thresholds';
}

export function setAssumptionInfoText() {}

export function setCurrentAssumptionInfo(shockTransferTbl, criticalIndTbl, data) {
    const shockTransferRows = [];
    const criticalIndRelatedRows = [];
    for (const nm in namesToInfo) {
        let textValue;
        let label = namesToInfo[nm].userText;
        if (isComboControl(nm)) {
            textValue = `${data[nm] ? "ALL" : "SOME"}`;
        } else {
            textValue = `${fixedNumToCtrlInput(data[nm])}%`;
            label = label.substring(label.indexOf('of '));
        }
        const rowData = `<tr><td>${textValue}</td><td>${label}</td></tr>`;
        if (namesToInfo[nm].isCriticalIndRelated) {
            criticalIndRelatedRows.push(rowData);
        } else {
            shockTransferRows.push(rowData);
        }
    }
    shockTransferTbl.innerHTML = shockTransferRows.join('\n');
    criticalIndTbl.innerHTML = criticalIndRelatedRows.join('\n');
}