export function showButtonLoading(btnElem) {
    const oldText = btnElem.innerText;
    btnElem.innerText = 'Loading...';
    btnElem.setAttribute('disabled', true);
    return oldText;
}

export function reenableButton(btnElem, oldText) {
    btnElem.innerText = oldText;
    btnElem.removeAttribute('disabled');
}