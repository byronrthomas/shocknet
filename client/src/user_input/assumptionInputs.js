
const namesToInfo = {
    input_thresh: { 
        userText: 'Input threshold (x%)',
    },
    import_thresh: { 
        userText: 'Imported amount threshold (y%)',
    },
    critical_ind_thresh: { 
        userText: 'Critical industry threshold (z% GDP)',
    },
}

export function initAssumptionsInput(inputThreshInput, importThreshInput, criticalIndInput) {
    namesToInfo.input_thresh.control = inputThreshInput;
    namesToInfo.import_thresh.control = importThreshInput;
    namesToInfo.critical_ind_thresh.control = criticalIndInput;
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
        namesToInfo[k].control.value = fixedNumToCtrlInput(newVal); 
    }
}


function getCtrlInput(name) {
    const details = namesToInfo[name];
    if (!details) {
        throw Error("Cannot find any control details for name = " + name);
    }
    console.log('Accessing name', name);
    console.log('Got details = ', details);
    console.log('Details.control = ', details.control);
    const val = details.control.value;
    if ( val < 0 || val > 100 ) {
        return {error: `${details.userText} must be set between 0..100 inclusive, currently ${val}%`};
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