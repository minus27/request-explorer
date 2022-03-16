var sortedData = [];
var reqWarningThreshold = 250;


function getValue(g,d) {
    let dValue = '';
    if (g.key in d) {
        if ('subkey' in g) {
            if (Array.isArray(d[g.key])) {
                let tmp = d[g.key].filter(t => t[0].toLowerCase() == g.subkey.toLowerCase());
                if (tmp.length == 1) dValue = tmp[0][1];
            }
        } else {
            dValue = d[g.key];
        }
    }
    return dValue;
}

function inventoryData() {
    valueGroups = valueGroups.filter(g => !(g.key.startsWith('#')));
    sortedData
        .forEach((d, dIndex) => { console.log(`${dIndex}) ${d.id}`)
            valueGroups
                .forEach(g => {
                    if (dIndex == 0) {
                        g.values = [];
                        g.counts = {};
                        if (!('label' in g)) {
                            g.label = g.key;
                            if ('subkey' in g) g.label += ` : ${g.subkey}`;
                        }
                    }

                    switch (g.key) {
                        case 'path':
                            d[g.key] = d[g.key].replace(/(\d{13})$/,function(m,p){return "*".repeat(p.length);});
                            break;
                    }
                    
                    if (g.key != 'tags') {
                        let dValue = getValue(g,d);
                        if (!g.values.includes(dValue)) {
                            g.values.push(dValue);
                            g.counts[dValue] = 0;
                        }
                        g.counts[dValue] += 1;
                    } else {
                        // Future - add exception handling for no tags
                        d.tags.forEach(t => {
                            let dValue = t.type;
                            if (!g.values.includes(dValue)) {
                                g.values.push(dValue);
                                g.counts[dValue] = 0;
                            }
                            g.counts[dValue] += 1;
                        });
                    }
                });
        });
    valueGroups.forEach(g => {
        ['ip', 'iso3166'].forEach(key => { if (typeof g[key] != 'boolean') g[key] = false; });
        if (g.iso3166) {
            g.values.sort((a, b) => {
                if (iso3166(a) < iso3166(b)) return -1;
                if (iso3166(a) > iso3166(b)) return 1;
                return 0;
            });
        } else if (g.ip) {
            /* https://stackoverflow.com/questions/48618635/require-sorting-on-ip-address-using-js */
            g.values
                .sort((a, b) => {
                    const num1 = Number(a.split(".").map((num) => (`000${num}`).slice(-3)).join(""));
                    const num2 = Number(b.split(".").map((num) => (`000${num}`).slice(-3)).join(""));
                    return num1 - num2;
                });
        } else {
            g.values.sort();
        }
    });
    //console.log(JSON.stringify(valueGroups, null, '  ')); throw new Error('STOP');
}

function makeExpandable(gIndex = '') {
    let selector = `tbody[grp="${gIndex}"] tr:not(:first-of-type) td:not(.expandable):first-of-type`;
    $(selector.replace(/grp=""/, 'grp')).each(function () {
        if (this.scrollHeight > this.clientHeight || this.scrollWidth > this.clientWidth) {
            let element = $(this);
            element.addClass('expandable');
            element.click(function () {
                if ($(this).hasClass('expanded')) {
                    $(this).removeClass('expanded');
                } else {
                    $(this).addClass('expanded');
                }
            });
        }
    })
}
function toggleGroup() {
    let oJq = $(this).parent();
    let gIndex = oJq.attr('grp');
    console.log(`Group ${gIndex} toggled`);
    if (typeof oJq.attr('expanded') != 'undefined') {
        oJq.removeAttr('expanded');
    } else {
        oJq.attr('expanded', '');
        makeExpandable(gIndex);
    }
}

function selectCell() {
    let reqId = this.getAttribute('req'),
        valId = this.parentNode.getAttribute('val'),
        grpId = this.parentNode.parentNode.getAttribute('grp'),
        reqSelected = $(`[req="${reqId}"]`).hasClass('req-selected'),
        valSelected = $(`[grp="${grpId}"] [val="${valId}"] td`).hasClass('val-selected');
    //console.log(`req=${reqId} (${reqSelected}) / grp=${grpId}, val=${valId} (${valSelected})`)
    if ((!reqId || reqSelected) && valSelected) {
        if (reqId) $(`[req="${this.getAttribute('req')}"]`).removeClass('req-selected');
        $(`[grp="${grpId}"] [val="${valId}"] td`).removeClass('val-selected');
        $(`[grp="${grpId}"] [val="${valId}"]`)
            .removeClass('val-selected')
            .parent()
            .removeClass('val-selected');
    } else if (!reqId || reqSelected) {
        if (reqId) $(`[req="${this.getAttribute('req')}"]`).removeClass('req-selected');
        $(`[grp="${grpId}"] [val="${valId}"] td`).addClass('val-selected');
        $(`[grp="${grpId}"] [val="${valId}"]`)
            .addClass('val-selected')
            .parent()
            .addClass('val-selected');
    } else {
        $(`[req="${this.getAttribute('req')}"]`).addClass('req-selected');
    }
}

function createGridCell(eTr, gIndex, vIndex, rIndex, bMatch) {
    let eTd = document.createElement('td');
    eTd.innerHTML = bMatch ? '&#11035;' : '';
    if (bMatch) {
        eTd.className = 'clickable';
        eTd.addEventListener("click", selectCell);
        eTd.setAttribute('grp', gIndex);
        eTd.setAttribute('val', vIndex);
    }
    eTd.setAttribute('req', rIndex);
    eTr.appendChild(eTd);
}

function showModal(opts={}) {
    ['data','error','warning','info'].forEach(mType => $('#modal').removeClass(mType));
    if(!('type' in opts)) {
        opts.body = JSON.stringify(opts);
        opts.title = 'Internal Error';
        opts.type = 'error';
    }
    $('#modal').addClass(opts.type);
    switch(opts.type) {
        case 'data':
            opts.body = `<pre>${
                    JSON.stringify(opts.body,null,'  ')
                    .replace(/(\n +"[^"]+",)\s+"/g,'$1 "')
                    .replace(/("[^"]+")(:)/g, `<span class="key bold">$1</span>$2`)
                    .replace(/("[^"]+")([,\s])/g, `<span class="s-val">$1</span>$2`)
                    .replace(/(\[\s+<span class="s-val)"/g, `$1 bold"`)
                    .replace(/(: +)(\d+)([,\s])/g, `$1<span class="n-val">$2</span>$3`)
                    .replace(/\[\s+([^\]^\n]+?)\s+\]/g, `[ $1 ]`)
                }</pre>`;
            opts.html = true;
            break;
    }
    $('#modal .modal-title').text(opts.title);
    if (typeof opts.html != 'boolean') opts.html = false;
    if (opts.html) {
        $('#modal .modal-body').html(opts.body);
    } else {
        $('#modal .modal-body').text(opts.body);
    }
    $('#modal').modal('show');
}

function displayData() {
    let docFrag = document.createDocumentFragment(),
        eTable = document.createElement('table'),
        eThead = document.createElement('thead'),
        eTheadTr = document.createElement('tr'),
        eTh1 = document.createElement('th'),
        eTh2 = document.createElement('th'),
        eTbodies = []
    eTbodyTrs = {};
    eTable.className = 'sideways req-filter-off';
    eTheadTr.className = 'subhead';
    docFrag.appendChild(eTable);
    eTable.appendChild(eThead);
    eThead.appendChild(eTheadTr);
    eTheadTr.appendChild(eTh1);
    eTheadTr.appendChild(eTh2);
    sortedData
        //.filter((s, sIndex) => { if (sIndex < 80) return s} )
        .forEach((d, dIndex) => {
            let eTh = document.createElement('th'),
                eSpan = document.createElement('span');
            eSpan.innerText = d.id;
            eTh.className = 'clickable';
            eTh.addEventListener("click", function() {
                showModal({
                    type: 'data',
                    title: `Request ${d.id} (${dIndex+1} of ${sortedData.length})`,
                    body: sortedData[dIndex],
                });
            });
            eTh.setAttribute('req', dIndex);
            eTh.appendChild(eSpan);
            eTheadTr.appendChild(eTh);
            valueGroups
                .forEach((g, gIndex) => {
                    if (dIndex == 0) {
                        let eTr = document.createElement('tr'),
                            eTd = document.createElement('td'),
                            eSpan1 = document.createElement('span'),
                            eSpan2 = document.createElement('span');

                        eTbodies.push(document.createElement('tbody'));
                        eSpan1.innerHTML = '&#9654;';
                        eSpan1.className = 'indicator';
                        eSpan2.innerText = `${g.label} (${g.values.length})`;
                        eTd.setAttribute('colspan', sortedData.length + 2);
                        eTd.className = 'caption';
                        eTr.addEventListener("click", toggleGroup);
                        eTbodies[gIndex].setAttribute('grp', gIndex);
                        eTbodyTrs[gIndex] = [];

                        eTd.appendChild(eSpan1);
                        eTd.appendChild(eSpan2);
                        eTr.appendChild(eTd);
                        eTbodies[gIndex].appendChild(eTr);
                        eTable.appendChild(eTbodies[gIndex]);

                        g.values.forEach((value, vIndex) => {
                            let eTd1 = document.createElement('td'),
                                eTd2 = document.createElement('td');

                            eTbodyTrs[gIndex].push(document.createElement('tr'));
                            eTbodyTrs[gIndex][vIndex].className = `${g.label}-${vIndex}`;
                            eTbodyTrs[gIndex][vIndex].setAttribute('val', vIndex);
                            eTd1.innerText = (valueGroups[gIndex].iso3166) ? iso3166(value) : value;
                            eTd2.innerText = g.counts[value];
                            eTd2.className = 'clickable';
                            eTd2.addEventListener("click", selectCell);

                            eTbodyTrs[gIndex][vIndex].appendChild(eTd1);
                            eTbodyTrs[gIndex][vIndex].appendChild(eTd2);
                            eTbodies[gIndex].appendChild(eTbodyTrs[gIndex][vIndex]);
                        });
                    }

                    if (g.key != 'tags') {
                        let dValue = getValue(g,d);
                        g.values.forEach((value, vIndex) => {
                            createGridCell(eTbodyTrs[gIndex][vIndex], gIndex, vIndex, dIndex, vIndex == g.values.indexOf(dValue));
                        });
                    } else {
                        let vIndexes = d.tags.map(t => g.values.indexOf(t.type))
                        g.values.forEach((value, vIndex) => {
                            createGridCell(eTbodyTrs[gIndex][vIndex], gIndex, vIndex, dIndex, vIndexes.includes(vIndex));
                        });
                    }

                });
            eTime.log(`Request ${dIndex} displayed`);
        });
    document.getElementById('output').appendChild(docFrag);
}

var eTime = {
    start: null,
    squelch: true,
    log: function (logMsg = 'Elapsed Time', forcePrint = false, resetStart = false) {
        if (this.start == null || resetStart) this.start = Date.now();
        if (this.squelch && !forcePrint) return;
        let eTime = new Date(Date.now() - this.start),
            hours = eTime.getUTCHours().toString().padStart(2, '0'),
            minutes = eTime.getUTCMinutes().toString().padStart(2, '0'),
            seconds = eTime.getSeconds().toString().padStart(2, '0'),
            miliseconds = eTime.getTime().toString().padStart(3, '0').slice(-3);
        console.log(`${hours}:${minutes}:${seconds}.${miliseconds} - ${logMsg}`);
    }
}

function processData() {
    inventoryData();
    eTime.log(`Data Inventoried`);
    if (sortedData.length > reqWarningThreshold) {
        let rowCount = 2,
            colCount = sortedData.length + 2;
        valueGroups.forEach(g => rowCount += g.values.length);
        let cellCount = rowCount * colCount + valueGroups.length;
        rowCount += valueGroups.length;
        showModal({
            type: 'warning',
            title: `Here There Be Dragons`,
            body: `Some sluggishness may be experienced because a table with ${rowCount.toLocaleString("en-US")} rows and ${colCount.toLocaleString("en-US")} columns (i.e. ${cellCount.toLocaleString("en-US")} cells) is being created from the ${sortedData.length.toLocaleString("en-US")} requests in your data.`,
        });
        startIntervalId = setInterval(() => {
            if (!($('#modal').is(":visible"))) return;
            clearInterval(startIntervalId);
            displayData();
            eTime.log('Data Displayed');
        }, 100);
        closeIntervalId = setInterval(() => {
            if ($('tbody').length != valueGroups.length) return;
            clearInterval(closeIntervalId);
            $('#modal').modal('hide');
        }, 500);
    } else {
        displayData();
        eTime.log('Data Displayed');
    }
    //tweakDisplay();
}

$(document).ready(function () {
    // Pad top to shift content below navbar and make navbar sticky
    $('body').css('padding-top', `${$('header').height()}px`);
    $('nav').addClass('fixed-top');

    updateFileName();
    menu.init();
    showInitialSplashScreen();
});