const state = {
    currentlyActive: 'spreadCard',    
}

function setVisible(elem) {
    elem.removeAttribute("class");
}
function setInvisible(elem) {
    elem.setAttribute("class", "hidden");
}

function updateVisibility(newActive) {
    state.currentlyActive = newActive;
    const toBeVisible = state[newActive];
    if (!toBeVisible) {
        throw Error(`Can't set this visible - ${newActive}`);
    }
    for ( var k in state ) {
        if (k === 'currentlyActive') continue;
        const elem = state[k];
        if (elem === toBeVisible) {
            setVisible(elem);
        } else {
            setInvisible(elem);
        }
    }
}

export function initParamsCardSwitcher(
    {spreadCard,
     strongGroupsCard,
     weakGroupsCard,
     spreadInput,
     weakGroupsInput,
     strongGroupsInput}
) {
    state.spreadCard = spreadCard;
    state.strongGroupsCard = strongGroupsCard;
    state.weakGroupsCard = weakGroupsCard;
    spreadInput.addEventListener('click', () => updateVisibility('spreadCard'));
    weakGroupsInput.addEventListener('click', () => updateVisibility('weakGroupsCard'));
    strongGroupsInput.addEventListener('click', () => updateVisibility('strongGroupsCard'));
    updateVisibility('spreadCard');
}
