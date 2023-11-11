const STORAGE_VERSION = 3

class TabsController {
    constructor(tabsView, contentView, contextMenu) {
        this.tabs = []
        this.removedTabs = []
        this.tabsView = tabsView
        this.contentView = contentView
        this.contextMenu = contextMenu
        this.contextMenuOpenedForTab = null
        this.selectedTab = null
        this.selectTab(null)

        this.#initiateContextMenu()
    }

    count() {
        return this.tabs.length
    }

    addTab(name, shouldSave = true) {
        const realThis = this
        // Add tab to tabs view
        const tabElement = document.createElement("button")
        tabElement.className = "tablinks"
        tabElement.textContent = name;
        this.tabsView.appendChild(tabElement);

        // add view's content to content view
        const contentElement = document.createElement("div")
        contentElement.className = "hidden"
        this.contentView.appendChild(contentElement);

        // initiate tab
        const tabController = new TabController()
        if (shouldSave) {
            // Default use elk, backward compatability for old files will keep them with the old layout engine
            tabController.elkRenderer = true
        }
        tabController.initView(contentElement)
        const tab = { name, tabController, tabElement, contentElement }
        this.tabs.push(tab)

        // Now setup UI callbacks
        this.#initiateContextMenuForTab(tabElement, tab)
        tabElement.onclick = () => realThis.selectTab(tab)

        if (shouldSave) {
            this.save()
        }

        return tab
    }

    removeTab(index) {
        const [{ name, tabController, tabElement, contentElement }] = this.tabs.splice(index, 1)

        tabController.deinitView()
        const innerData = tabController.export()
        this.removedTabs.push({name, innerData})
        tabElement.remove()
        contentElement.remove()

        this.contextMenuOpenedForTab = null

        // Update selected If needed
        const selectedTabIndex = this.tabs.indexOf(this.selectedTab)
        if (selectedTabIndex == -1) {
            // we removed the selected tab
            if (index == 0) {
                if (this.count() != 0) {
                    this.selectTab(this.tabs[0])
                } else {
                    this.selectedTab = null
                    this.selectedTab = null
                }
            } else {
                // go to one before
                this.selectTab(this.tabs[index - 1])
            }
        }

        this.save()
    }

    selectTabByIndex(index) {
        this.selectTab(this.tabs[index])
    }

    selectTab(tab) {
        // cancel last selected tab
        if (this.selectedTab != null) {
            const { tabElement, contentElement } = this.selectedTab
            tabElement.classList.remove("active");
            contentElement.classList.add("hidden")
        }

        if (tab == null) {
            this.selectedTab = null;
            this.selectedTabIndex = -1;
            return
        }

        // enable new selected tab
        const { tabElement, contentElement } = tab
        tabElement.classList.add("active");
        contentElement.classList.remove("hidden")

        // Save selected tab
        this.selectedTab = tab
        this.selectedTabIndex = this.tabs.indexOf(tab)
    }

    onCurrent(callback) {
        if (this.selectedTab != null) {
            const { name, tabController } = this.selectedTab
            callback(name, tabController)
        }
    }

    onId(id, callback) {
        this.tabs.forEach(({name, tabController}) => {
            if (tabController.mermaidId == id) {
                callback(name, tabController)
            }
        })
    }

    save() {
        const tabs = this.tabs.map(({ name, tabController }) => [name, tabController.export()])
        const removedTabs = this.removedTabs
        const data = JSON.stringify({tabs, removedTabs})
        localStorage.setItem("__SAVED_DATA", data)
        localStorage.setItem("__SAVED_DATA_VERSION", STORAGE_VERSION)
    }

    restore() {
        const data = JSON.parse(localStorage.getItem("__SAVED_DATA"))
        if (data != null) {
            // Support migrating from lower version
            const version = parseInt(localStorage.getItem("__SAVED_DATA_VERSION")) || 1;
            if (version == 1) {
                // Try migrate to version 2
                const innerData = JSON.stringify(data || [1, [], []])
                const name = "untitled"
                const tab = this.addTab(name, false)
                tab.tabController.import(innerData)
                setTimeout(() => this.save())
            } else if (version == 2) {
                for (const [name, innerData] of data) {
                    const tab = this.addTab(name, false)
                    tab.tabController.import(innerData)
                }
            } else if (version == 3) {
                for (const [name, innerData] of data.tabs) {
                    const tab = this.addTab(name, false)
                    tab.tabController.import(innerData)
                }

                this.removedTabs = data.removedTabs
            }
        }
        if (this.count() >= 1) {
            this.selectTab(this.tabs[0])
        } else {
            this.#addEmptyTab()
        }
    }

    renameTabAction(index) {
        var tab = this.tabs[index];

        setTimeout(() => {
            Swal.fire({
                title: 'Rename tab',
                input: 'text',
                inputValue: tab.name,
                showCancelButton: true
              }).then(({value=null}) => {
                    if (value != null) {
                        tab.tabElement.textContent = value
                        tab.name = value
                        this.save()
                    }
              })
        });
    }

    removeTabAction(index) {
        var tab = this.tabs[index];

        this.removeTab(index)
        if (this.count() == 0) {
            this.#addEmptyTab()
        }
    }

    restoreTabAction() {
        if (this.removedTabs.length == 0) {
            return
        }

        const { name, innerData } = this.removedTabs.pop()
        const tab = this.addTab(name, false)
        tab.tabController.import(innerData)
        this.selectTab(tab)
    }

    #initiateContextMenu() {
        const realThis = this

        document.body.addEventListener("click", (e) => {
            // ? close the menu if the user clicks outside of it
            if (e.target.offsetParent != this.contextMenu) {
                this.contextMenuOpenedForTab = null
                this.contextMenu.classList.remove("visible");
            }
        });

        this.contextMenu.querySelector("#renameTab").onclick = function () {
            // Hide context menu
            const contextMenuOpenedForTab = realThis.contextMenuOpenedForTab
            realThis.contextMenuOpenedForTab = null
            realThis.contextMenu.classList.remove("visible");

            const selectedTabIndex = realThis.tabs.indexOf(contextMenuOpenedForTab)

            if (contextMenuOpenedForTab != null) {
                realThis.renameTabAction(selectedTabIndex);
            }
        }

        this.contextMenu.querySelector("#removeTab").onclick = function () {
            // Hide context menu
            const contextMenuOpenedForTab = realThis.contextMenuOpenedForTab
            realThis.contextMenuOpenedForTab = null
            realThis.contextMenu.classList.remove("visible");

            const selectedTabIndex = realThis.tabs.indexOf(contextMenuOpenedForTab)

            if (contextMenuOpenedForTab != null) {
                realThis.removeTabAction(selectedTabIndex);
            }
        }

        this.contextMenu.querySelector("#sources").onclick = function() {
            // Hide context menu
            const contextMenuOpenedForTab = realThis.contextMenuOpenedForTab
            realThis.contextMenuOpenedForTab = null
            realThis.contextMenu.classList.remove("visible");
            
            setTimeout(() => {
                if (contextMenuOpenedForTab != null) {
                    const { tabController } = contextMenuOpenedForTab
                    const projects = [...tabController.getProjects()]
                    if (projects.length == 0) {
                        Swal.fire({
                            title: 'No linked projects',
                            text: 'This graffiti file was created with old utils. Consider upgrading to the latest version.',
                            type: 'info',
                            confirmButtonText: 'OK'
                          })
                    } else {
                        Swal.fire({
                            title: 'Linked projects',
                            html: projects.join('<br>'),
                            confirmButtonText: 'OK'
                          })
                    }
                }
            })
        }
    }

    #addEmptyTab() {
        const emptyTab = this.addTab("untitled")
        this.selectTab(emptyTab)
    }

    #initiateContextMenuForTab(element, tab) {
        element.addEventListener("contextmenu", (event) => {
            event.preventDefault();

            const { clientX: mouseX, clientY: mouseY } = event;

            const { normalizedX, normalizedY } = this.#normalizePozition(mouseX, mouseY);

            this.contextMenu.classList.remove("visible");

            this.contextMenu.style.top = `${normalizedY}px`;
            this.contextMenu.style.left = `${normalizedX}px`;


            setTimeout(() => {
                this.contextMenuOpenedForTab = tab
                this.contextMenu.classList.add("visible");
            });
        });
    }

    #normalizePozition(mouseX, mouseY) {
        // ? compute what is the mouse position relative to the container element (scope)
        let {
            left: scopeOffsetX,
            top: scopeOffsetY,
        } = document.body.getBoundingClientRect();

        scopeOffsetX = scopeOffsetX < 0 ? 0 : scopeOffsetX;
        scopeOffsetY = scopeOffsetY < 0 ? 0 : scopeOffsetY;

        const scopeX = mouseX - scopeOffsetX;
        const scopeY = mouseY - scopeOffsetY;

        // ? check if the element will go out of bounds
        const outOfBoundsOnX =
            scopeX + this.contextMenu.clientWidth > document.body.clientWidth;

        const outOfBoundsOnY =
            scopeY + this.contextMenu.clientHeight > document.body.clientHeight;

        let normalizedX = mouseX;
        let normalizedY = mouseY;

        // ? normalize on X
        if (outOfBoundsOnX) {
            normalizedX =
                scopeOffsetX + document.body.clientWidth - this.contextMenu.clientWidth;
        }

        // ? normalize on Y
        if (outOfBoundsOnY) {
            normalizedY =
                scopeOffsetY + document.body.clientHeight - this.contextMenu.clientHeight;
        }

        return { normalizedX, normalizedY };
    };
}

