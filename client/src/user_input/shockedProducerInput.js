import { codeToCountry } from "../graph_model/regionHandling";
import { commodityCodesToNames, regionNamesToMultiCountries } from "../graph_model/refData";

const state = {
    currentlyShocked: [],
}

export function initShockedProducersInput({
    regionSelect, 
    productSelect, 
    addWholeRegionButton,
    addSingleProducerButton,
    clearSelectionButton,
    currentList}) {
    
    state.regionSelect = regionSelect;
    state.productSelect = productSelect;
    state.addWholeRegionButton = addWholeRegionButton;
    state.addSingleProducerButton = addSingleProducerButton;
    state.currentList = currentList;
    state.clearSelectionButton = clearSelectionButton;

    state.addWholeRegionButton.addEventListener('click', addWholeRegion);
    state.addSingleProducerButton.addEventListener('click', addSingleProducer);
    state.clearSelectionButton.addEventListener('click', clearSelection);
    doSelectionClear();
}

function doSelectionClear() {
    state.currentList.replaceChildren([]);
    state.currentlyShocked = [];
}

function addLi(userText) {
    const li = document.createElement('li');
    li.textContent = userText;
    li.setAttribute("class", "list-group-item");
    state.currentList.appendChild(li);
}

function regionToUserText(graphReg) {
    if (regionNamesToMultiCountries[graphReg]) {
        return regionNamesToMultiCountries[graphReg].name;
    }
    return codeToCountry(graphReg.toUpperCase());
}

function addWholeRegion() {
    console.log('Add whole region clicked');
    const graphReg = state.regionSelect.value;
    console.log('Will add entire region', graphReg);
    state.currentlyShocked.push({v_type: 'country', v_id: graphReg});
    console.log('Currently shocked =', state.currentlyShocked);
    addLi(`All producers from ${regionToUserText(graphReg)}`);
}

function addSingleProducer() {
    console.log('Add single producer clicked');
    const graphReg = state.regionSelect.value;
    const graphCommod = state.productSelect.value;
    console.log(`Will add production of ${graphCommod} from ${graphReg}`);
    state.currentlyShocked.push({v_type: 'producer', v_id: `${graphReg}-${graphCommod}`});
    console.log('Currently shocked =', state.currentlyShocked);
    addLi(`Producers of ${commodityCodesToNames[graphCommod]} in ${regionToUserText(graphReg)}`);
}

function clearSelection() {
    console.log('Clear selection clicked');
    doSelectionClear();
}

export function getShockedProducerState() {
    // Do a clone to maintain encapsulation
    return [...state.currentlyShocked];
}
