const MSG_ADD_NODE_AND_EDGE = "addData"
const MSG_ADD_NODES_AND_EDGES = "addDataBulk"
const MSG_UPDATE_NODES = "updateNodes"
const LOCAL_STORAGE_DEFAULT = {isKeymapReversed: false, hoverDoc: false}

const GIRAFFE_OPACITY = 0.6;
const GIRAFFE_INTERVAL = 1 * 60 * 60 * 1000;
const GIRAFFE_DURATION = 3 * 1000;


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function event_connect() {
    const url = document.getElementById("socketUrl").value

    // close global network controller
    if (window.networkController)
        window.networkController.close()

    window.networkController = new NetworkController(url, window.tabsController)
}

function event_reset() {
    Swal.fire({
        title: 'Reset',
        text: 'Do you want to clear the current tab?',
        showCancelButton: true
        }).then(({value=null}) => {
            if (value) {
                window.tabsController.onCurrent((_, controller) => {
                    controller.reset(shouldSupportUndo = true)
                })
            }
        })
}

function event_undo() {
    window.tabsController.onCurrent((_, controller) => {
        controller.undo()
    })
}

function event_redo() {
    window.tabsController.onCurrent((_, controller) => {
        controller.redo()
    })
}

function event_delete() {
    window.tabsController.onCurrent((_, controller) => {
        controller.deleteCurrentNode()
    })

}

function event_mermaid() {
    window.tabsController.onCurrent((_, controller) => {
        const s = controller.toMermaid()

        try {
            navigator.clipboard.writeText(s).then(function () {
                console.log('Copied to clipboard');
            }, function (err) {
                console.log(s)
            });
        } catch (err) {
            console.log(s)
        }
    })

}

function event_center() {
    window.tabsController.onCurrent((_, controller) => {
        controller.resetScrolling()
    })
}

function export_tab(tabName, tabController) {
    const blob = new Blob([tabController.export()])
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = tabName + '.json'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
}

function event_export() {
    tabsController.onCurrent((name, controller) => {
        export_tab(name, controller)
    })
}

function event_bundleExport() {
    tabsController.tabs.forEach(({name, tabController}) => {export_tab(name, tabController)})
}

function event_import() {
    readFile = function (e) {
        for (const file of e.target.files) {
            event_import_onFile(file)
        }
    }

    const fileInput = document.createElement("input")
    fileInput.type = 'file'
    fileInput.style.display = 'none'
    fileInput.onchange = readFile
    document.body.appendChild(fileInput)
    fileInput.click()
    document.body.removeChild(fileInput)
}

function event_import_onFile(file) {
    if (!file) {
        return
    }
    const reader = new FileReader()
    reader.onload = function (e) {
        // Create new tab with the filename as name
        const contents = e.target.result
        let name = file.name
        if (name.endsWith(".json")) {
            name = name.substring(0, name.length - 5);
        }

        const tabsController = window.tabsController

        // If we have only empty untitled tab, remove it
        if (tabsController.count() == 1 && tabsController.tabs[0].name == "untitled" &&
            tabsController.tabs[0].tabController.nodes.length == 0) {
            tabsController.removeTab(0)
        }


        const addedTab = tabsController.addTab(name)
        tabsController.selectTab(addedTab)
        tabsController.onCurrent((_, controller) => {
            controller.import(contents)
        })

    }
    reader.readAsText(file)
}

function event_addTab() {
    Swal.fire({
        title: 'Add graph',
        input: 'text',
        inputValue: '',
        showCancelButton: true
      }).then(({value=null}) => {
            if (value != null && value != '') {
                const tab = window.tabsController.addTab(value)
                window.tabsController.selectTab(tab)
            }
      })
}

function event_toggleRenderer() {
    window.tabsController.onCurrent((_, controller) => {
        controller.onToggleRenderer()
    })
    return false
}

function event_toggleFocusTarget() {
    document.getElementById('isNewWillBeSelected').click()
    return false
}

function event_toggleArrowTarget() {
    document.getElementById('isExistingToNew').click()
}

function event_toggleHelp() {
    const currentHideHelpBar = (localStorage.getItem("__HIDE_HELP_BAR") || "false") === "true"
    localStorage.setItem("__HIDE_HELP_BAR", !currentHideHelpBar)

    setHelpBarAppearance()
}

function setHelpBarAppearance() {
    const currentHideHelpBar = (localStorage.getItem("__HIDE_HELP_BAR") || "false") === "true"
    if (currentHideHelpBar) {
        document.getElementsByTagName("footer")[0].style.display = "none";
    } else {
        document.getElementsByTagName("footer")[0].style.display = "block";
    }
}

function event_renameTab() {
    window.tabsController.renameTab(window.tabsController.selectedTabIndex);
}

function event_removeTab() {
    window.tabsController.removeTab(window.tabsController.selectedTabIndex);
}

function event_restoreTab() {
    window.tabsController.restoreTabAction();
}

function event_unSelect() {
    window.tabsController.onCurrent((_, controller) => {
        if (controller.selectedNode != null) {
            controller.selectedNode = null;
            controller.cachedMermaid = null;
            controller.draw();
        }
    })
}

function event_nodeAction() {
    window.tabsController.onCurrent((_, controller) => {
        if (controller.selectedNode != null) {
            controller.onRightClick(null, controller.selectedNode.id);
        }
    })
}

var forceGiraffe = false;
function event_toggleGiraffeMode() {
    forceGiraffe = !forceGiraffe
    event_showGiraffe(false)
}

function event_showGiraffe(show) {
    const shouldShowGiraffe = show || forceGiraffe;
    const opacity = shouldShowGiraffe ? GIRAFFE_OPACITY : 1
    const newStyle = `background-image:linear-gradient(rgba(255,255,255,${opacity}), rgba(255,255,255,${opacity})), url('images/giraffe.jpg');background-size:100% 100%`

    document.getElementById("viewId").style = newStyle
}

function event_help() {
    Swal.fire({
        title: 'Giraffiti',
        html: `Create customized callgraph directly from your favorite editor.
                <br /><br />
                <strong>Server</strong> - To run graffiti, Run the python server. 
                <br />
                <strong>Editor</strong> - Install graffiti in your editor. Then, connect it to the server. 
                <ul>
                <li>&lt;Ctrl+Shift+A&gt; - Add a new node to the graph.</li>
                <li>&lt;Ctrl+Shift+X&gt; - Add a new node to the graph with a custom text on the edge.</li>
                </ul>
                <strong>Web</strong> - click the top right button to connect to server.
                <ul>
                <li>A new node will be linked to the currently selected element.</li>
                <li>The new node will be automatically selected, unless the setting changed</li>
                <li>Right clicking a node will open it in the editor</li>
                <li>To find the matching keyboard shortcut, hover over the buttons.</li>
                <li>Double click an edge allows you to change its text or delete the edge</li>
                <li>Middle click to swap a node with the selected node (same parent). ctrl for same son, shift for id swap</li>
                <li>To rename or remove a graph, right click the tab's name.</li>
                <li>A list of the linked projects is also available under the tab</li>
                <br />
                <li>When node is selected:</li>
                <li>Press Space to edit or jump to it.</li>
                <li>Press 1-7 to theme it.</li>
                <li>Press Escape to unselect it.</li>
                <br />
                <li>Right click the center button to toggle the renderer between default and elk</li>
                </ul>
        `,
        icon: 'question',
        width: '48em',
        footer: 'To toggle the help bar, press Ctrl+?'
    })
}

function event_setTheme(themeIndex) {
    window.tabsController.onCurrent((_, controller) => {
        controller.onSetTheme(themeIndex)
    })
}

function event_addTextNode() {
    addTextualNode('Add text node', {isMarkdown: true})    
}

function event_addComment() {
    window.tabsController.onCurrent((_, controller) => {
        if (controller.selectedNode == null) {
            Swal.fire({
                title: 'No selected node to comment',
                position: 'bottom-end',
                toast: true,
                showConfirmButton: false,
                timer: 3000
            })
            return
        }

        addTextualNode('Add comment', {isMarkdown: true, isComment: true, isUnclickable: true}, {isExistingToNew: true})
    })
}

function addTextualNode(title, extra_node_properties, extra_edge_properties={}) {
    // FIXME: don't depend on network controller
    if (!('networkController' in window)) {
        Swal.fire({
            title: 'Not connected',
            position: 'bottom-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000
        })
        return
    }

    Swal.fire({
        title: title,
        input: 'textarea',
        inputValue: '',
        footer: 'You can use **text** for bold, and *text* for italic',
        showCancelButton: true,
        didOpen: patchOnKeyDown
        }).then(({value=null}) => {
            if (value != null && value != '') {
                // Bit of a hack, but why not
                window.networkController.handleMessage({type: MSG_ADD_NODE_AND_EDGE, node: {
                    label: value,
                    ...extra_node_properties
                }, edge: extra_edge_properties})
            }
        })
}

function spawnGiraffeTimer() {
    setTimeout(event_showGiraffe, 0, true)
    setTimeout(event_showGiraffe, GIRAFFE_DURATION, false)
}

function main() {
    initiateLocalStorage();
    initiateDependencies();
    initiateHotkeys();
    initializeDragAndDrop();
    setHelpBarAppearance();

    // Initiate tabs
    const tabsController = new TabsController(document.getElementsByClassName("tabs")[0], document.getElementsByClassName("view")[0], document.getElementById("context-menu"));
    tabsController.restore()

    window.tabsController = tabsController

    setInterval(spawnGiraffeTimer, GIRAFFE_INTERVAL)
}

function initiateDependencies() {
    // Initiate mermaid
    mermaid.initialize({
        securityLevel: 'loose',
        theme: 'forest',
        useMaxWidth: true,
    });
    // Fix tippy
    tippy.setDefaultProps({ maxWidth: '' })
}

function elk_beforeCallback(id, graph) {
    tabsController.onId(id, (_, controller) => {
        controller.modifyElkGraph(graph)
    })
}

function initiateHotkeys() {
    hotkeys('ctrl+z,ctrl+shift+z,ctrl+y,ctrl+s,ctrl+shift+s,ctrl+o,ctrl+i,ctrl+alt+shift+i,ctrl+q,ctrl+shift+q,delete,home,shift+/,ctrl+shift+/,1,2,3,4,5,6,7,ctrl+r,ctrl+shift+r,f2,ctrl+a,escape,space,ctrl+alt+g', function (event, handler) {
        switch (handler.key) {
            case 'ctrl+z':
                event_undo();
                return false;
            case 'ctrl+shift+z':
            case 'ctrl+y':
                event_redo();
                return false;
            case 'ctrl+s':
                event_export();
                return false;
            case 'ctrl+shift+s':
                event_bundleExport();
                return false;
            case 'ctrl+o':
                event_import();
                return false;
            case 'ctrl+i':
                event_toggleArrowTarget()
                return false;
            case 'ctrl+alt+shift+i':
                event_toggleFocusTarget()
                return false;
            case 'ctrl+q':
                event_addComment()
                return false
            case 'ctrl+shift+q':
                event_addTextNode()
                return false
            case 'delete':
                event_delete();
                return false;
            case 'home':
                event_center();
                return false;
            case 'shift+/':
                event_help();
                return false;
            case 'ctrl+shift+/':
                event_toggleHelp();
                return false
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
                themeIndex = parseInt(event.key) -1
                event_setTheme(themeIndex)
                return
            case 'ctrl+r':
                event_removeTab();
                return false;
            case 'ctrl+shift+r':
                event_restoreTab();
                return false;
            case 'f2':
                event_renameTab();
                return false;
            case 'ctrl+a':
                event_addTab();
                return false;
            case 'escape':
                event_unSelect();
                return false;
            case 'space':
                event_nodeAction();
                return false;
            case 'ctrl+alt+g':
                event_toggleGiraffeMode();
                return false;
        }
    });
}

function initializeDragAndDrop() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, e => {
            e.preventDefault()
            e.stopPropagation()
        }, false)
    })

    document.body.addEventListener('drop', function handleDrop(e) {
        for (const file of e.dataTransfer.files) {
            event_import_onFile(file)
        }
    }, false)
}

function initiateLocalStorage() {
    for (const key of Object.keys(LOCAL_STORAGE_DEFAULT)) {
        if (localStorage.getItem(key) == null) {
            localStorage.setItem(key, LOCAL_STORAGE_DEFAULT[key])
        }
    }
}


main()
