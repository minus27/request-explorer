function unselectItem(whichItem = null) {
    ['req','val'].forEach(item => {
        if (!whichItem || whichItem == item) $(`.${item}-selected`).removeClass(`${item}-selected`);
    });
}

function selectReqsShown() {
    $('.req-filtered').addClass('req-selected');
}

function hideProperties() {
    $('tr[val]').removeClass('val-filtered');
    $('tbody.val-selected tr[val]:not(.val-selected)').addClass('hidden');
    $('.val-selected').addClass('val-filtered');
}

function showProperties() {
    $('tr[val].hidden').removeClass('hidden');
    $('.val-selected').removeClass('val-filtered');
}

function collapseGroups() {
    $('tbody[expanded]').removeAttr('expanded');
}

function expandGroups() {
    $('tbody:not([expanded])').attr('expanded', '');
    makeExpandable();
}

function hideRequests() {
    $('[req]')
        .removeClass('req-filtered')
        .removeClass('shade-cell');
    $('[req]:not(.req-selected)').addClass('hidden');
    $('[req].req-selected').addClass('req-filtered');
    $('thead tr, tr[val]').each(function (iTr) {
        $(this).find('.req-filtered').each(function (iTd) {
            if (iTd % 2 == 0) $(this).addClass('shade-cell');
        })
    });
    $('table')
        .removeClass('req-filter-off')
        .addClass('req-filter-on');
}

function showRequests() {
    $('[req].hidden').removeClass('hidden');
    $('[req].req-selected').removeClass('req-filtered');
    $('.shade-cell').removeClass('shade-cell');
    $('table')
        .removeClass('req-filter-on')
        .addClass('req-filter-off');
}

function updateFileName() {
    let val = $('#process-file').val().replace(/^.*\\/,'');
    if (val == '') val = $('#file-name').attr('default-value')
    $('#file-name').text(val);
}

function processFile() {
    const [file] = document.querySelector('input[type=file]').files;
    const reader = new FileReader();

    reader.addEventListener("load", () => {
        var loadedData;
        try {
            loadedData = JSON.parse(reader.result);
            if (!Array.isArray(loadedData)) throw new Error(`Data is not an array`);
            if (loadedData.length != loadedData.filter(d => 'id' in d).length) throw new Error(`Data is missing field(s)`);
        } catch(e) {
            menu.tweakDropdownItems(false);
            console.error(`Error parsing data: ${e.message}`);
            showModal({
                type: 'error',
                title: 'Data Parsing Failed',
                body: e.message,
            });
            return;
        }
        updateFileName();

        eTime.log(`Data Load Loaded (${loadedData.length} requests)`);
        sortedData = loadedData
            .filter(d => idFilter.length == 0 || idFilter.includes(d.id))
            .sort(function (a, b) {
                var a1 = a.id.toLowerCase(), b1 = b.id.toLowerCase();
                if (a1 == b1) return 0;
                return a1 > b1 ? 1 : -1;
            });
        eTime.log(`Data Sorted (${sortedData.length} requests)`);
        processData();
        eTime.log(`Data Processed`);
        $('#clear-file').removeAttr('disabled');
        eTime.log('Finished', true);
    }, false);

    if (file) {
        eTime.log('Started', true, true);
        reader.readAsText(file);
    }
}

function loadData() {
    menu.tweakDropdownItems(true);
    console.log('loadData()');
    $('#process-file').click();
}

function clearData() {
    console.log('clearData()');
    $('#process-file').val('');
    updateFileName();
    menu.tweakDropdownItems(false);
    document.getElementById('output').innerHTML = '';
}

function selectReqsByGrpVal(bFilter = null) {
    let bUnion = bFilter == true,
        bIntersection = bFilter == false;
    console.log(`Selected Properties: ${$('tr.val-selected').length}`);
    if(bFilter == null && $('th.req-selected').length == sortedData.length) return;
    if (bUnion || bIntersection) unselectItem('req')
    $('tr.val-selected').each(function(){
        if (bIntersection) unselectItem('req');
        if($('th.req-selected').length == sortedData.length) return;
        let gIndex = $(this).parent().attr('grp'),
            vIndex = $(this).attr('val');
        $(`[grp="${gIndex}"][val="${vIndex}"]`).each(function(){let req=$(this).attr('req');
        $(`[req="${req}"]:not(.hidden)`).addClass('req-selected')});
        if (bIntersection) hideRequests();
    });
    if (bUnion) hideRequests();
    if (bUnion || bIntersection) unselectItem('req');
    console.log(`Selected Requests: ${$('th.req-selected').length}`);
}

function showInitialSplashScreen() {
    function tagIt(t,c,a={}) {
        return `<${t}${Object.entries(a).map(p => ` ${p[0]}="${p[1]}"`).join('')}>${c}</${t}>`;
    };
    let docsLink = tagIt('a','here',{href:'https://docs.fastly.com/signalsciences/developer/extract-your-data/',target:'_blank'}),
        loadLink = tagIt('a','here',{href:'#',onclick:'$(\'#modal\').modal(\'hide\');loadData()'}),
        tmp = [
            tagIt('p','To use the this app, do the following:'),
            '<ol>',
            tagIt('li','Download a JSON file of request data from the Fastly NG WAF either either the API or Dashboard UI'),
            tagIt('ul',tagIt('li',`More information on extracting your data can be found ${docsLink}`)),
            tagIt('li',`Close this window and click ${tagIt('strong','Data')} and then ${tagIt('strong','Load Request Data')} from the toolbar - or simply click ${loadLink}`),
            '</ol>'
        ];
    showModal({ type: 'info', title: 'Getting Started', body: tmp.join('\n'), html: true });
}

var menu = {
    noop: function() { console.error('No menu function defined'); },
    actions: {
        'menu-data-load': loadData,
        'menu-data-clear': clearData,
        'menu-prop-unselect': function() { unselectItem('val'); },
        'menu-prop-unselect-all': unselectItem,
        'menu-prop-hide': hideProperties,
        'menu-prop-show': showProperties,
        'menu-prop-collapse': collapseGroups,
        'menu-prop-expand': expandGroups,
        'menu-req-select-by-prop': selectReqsByGrpVal,
        'menu-req-select-shown': selectReqsShown,
        'menu-req-unselect': function() { unselectItem('req'); },
        'menu-req-unselect-all': unselectItem,
        'menu-req-filter-by-prop-or': function() { selectReqsByGrpVal(true); },
        'menu-req-filter-by-prop-and': function() { selectReqsByGrpVal(false); },
        'menu-req-hide': hideRequests,
        'menu-req-show': showRequests,
        'menu-help': showInitialSplashScreen,
    },
    tweakDropdownItems: function(bDataLoaded) {
        let addSelector = `.dropdown-item${bDataLoaded ? ':not(.data-required)' : '.data-required'}`,
            removeSelector = `.dropdown-item${!bDataLoaded ? ':not(.data-required)' : '.data-required'}`;
        $(addSelector).addClass('disabled');
        $(removeSelector).removeClass('disabled');
    },
    init: function() {
        menu.tweakDropdownItems(false);
        $('.dropdown-item,.nav-link:not(.dropdown-toggle)').click(function(){
            if ($(this).hasClass('disabled')) return;
            (menu.actions[this.id] == null) ? menu.noop() : menu.actions[this.id]();
        });
    }
}