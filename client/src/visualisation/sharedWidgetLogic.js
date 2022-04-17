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

export function clearPathDetails({shockPathHdr, shockPathDetails}) {
    shockPathHdr.innerHTML = '';
    shockPathDetails.innerHTML = '';
}

export function clearTable(tbl) {
    const allChildren = [...tbl.childNodes];
    for (const child of allChildren) {
        tbl.removeChild(child);
    }
}

export function addTableRow(tableElem, innerHtml, clickHandler) {
    const tr = document.createElement('tr');
    tr.innerHTML = innerHtml;
    tr.addEventListener('click', clickHandler);
    tableElem.appendChild(tr);
}