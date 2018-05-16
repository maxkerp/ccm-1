/**
 * @overview CCM Component for editing text with others in realtime
 * using orbitdb.
 * @author Max Kerp <max.kerp@smail.inf.h-brs.de> 2018
 * @license The MIT License (MIT)
 * @date 12.05.18
 */

( function () {

  var component = {

    name: 'collab',

    ccm: 'https://rawgit.com/maxkerp/ccm-1/thesis/dist/bundle.js',
    config: {
      "css"    : [ "ccm.load", "https://rawgit.com/maxkerp/ccm-1/thesis/benchmarks/collab/collab.css" ],
      "libs"   : [ "ccm.load", [
        "https://cdnjs.cloudflare.com/ajax/libs/showdown/1.8.6/showdown.min.js"
      ] ],
      "dstore" : "CCM.collab"
    },

    Instance: function () {
      const TEMPLATE = `
      <div id="collab-container">
        <div id="collab-controls">

          <span>
            <select id="collab-selectFile">
            </select>
            <button id="collab-editorPreviewToggle">Preview</button>
          </span>

          <span>
            <label for="collab-newFile">File:</label>
            <input type="text" id="collab-newFile" name="newFile"/>
            <button id="collab-newFileButton">New File</button>
          </span>

        </div>

        <div id="collab-editor">
          <textarea id="collab-text" name="textarea" ></textarea>
        </div>

        <div id="collab-markdown" class="hidden">
        </div>
      </div>
      `;

      var self = this;
      var my;           // contains privatized instance members

      this.init = function ( callback ) {
        this.element.innerHTML = TEMPLATE

        callback()
      };

      this.ready = function ( callback ) {

        callback()
      };

      this.start = function ( callback ) {
        window.console.debug('Start of start()')
        const newFileName         = self.element.querySelector('#collab-newFile'),
              newFileButton       = self.element.querySelector('#collab-newFileButton'),
              selectFile          = self.element.querySelector('#collab-selectFile'),
              textElement         = self.element.querySelector('#collab-text'),

              editorPreviewToggle = self.element.querySelector('#collab-editorPreviewToggle'),

              editorElement       = self.element.querySelector('#collab-editor'),
              markdownElement     = self.element.querySelector('#collab-markdown'),

              converter           = new showdown.Converter();


        let store;

        window.console.debug(self)

        window.ccm.dstore(this.dstore, (db) => {
          window.db = db
          store     = db

          let fileNumber  = 0,
              currentFile = null;

          const updateFiles = () => {

            const fileNames = store.keys();

            // Empty selcet tag
            selectFile.innerHTML = ''

            fileNames.forEach((name) => {
             const option = document.createElement('option')

              option.value = name
              option.text  = name
              selectFile.appendChild(option)
            })

            fileNumber = fileNames.length

            if (!currentFile && (fileNames.length > 0)) {
              currentFile = fileNames[0]
            }
          }

          const updateMarkdown = () => {
            const md = store.get(currentFile).data;

            markdownElement.innerHTML = converter.makeHtml(md);
          }

          const updateText = () => {
            textElement.value = store.get(currentFile).data
          }

          const setCurrentFile = (file) => {
            currentFile = file

            updateText()
            updateMarkdown()
          }

          // Listen to sync in dstore and write to #data
          store.on('replicated', () => {
            console.debug("[Replicated] updating state..")
            if (fileNumber < store.length()) {
              updateFiles()
            }


            if (!currentFile) {
              console.debug('CurrentFile not set!')
              return
            }

            if (!editorElement.classList.contains('hidden')) {
              updateText()

            } else if (!markdownElement.classList.contains('hidden')) {
              updateMarkdown()
            }
          })

          textElement.addEventListener('keyup', () => {
            const editedText = textElement.value

            store.set({ key: currentFile, data: editedText })
          });

          newFileButton.addEventListener('click', (e) => {
            const file = newFileName.value

            if (store.keys().includes(file)) { return }

            store.set({key: file, data: ""}, (newFile) => {

              updateFiles()
              selectFile.value = newFile.key
            })
          })

          editorPreviewToggle.addEventListener('click', (e) => {
            const current = editorPreviewToggle.textContent

            if (current === "Preview") {
              editorPreviewToggle.textContent = "Editor"
              updateMarkdown()
            } else if (current === "Editor") {
              editorPreviewToggle.textContent = "Preview"
              updateText()
            }

            editorElement.classList.toggle('hidden')
            markdownElement.classList.toggle('hidden')
          })

          selectFile.addEventListener('change', (e) => {
            file = e.target.value;

            setCurrentFile(file)
          })

          updateFiles()
        });

        callback && callback()
      };
    }
  };

  function p(){window.ccm[v].component(component)}var f="ccm."+component.name+(component.version?"-"+component.version.join("."):"")+".js";if(window.ccm&&null===window.ccm.files[f])window.ccm.files[f]=component;else{var n=window.ccm&&window.ccm.components[component.name];n&&n.ccm&&(component.ccm=n.ccm),"string"==typeof component.ccm&&(component.ccm={url:component.ccm});var v=component.ccm.url.split("/").pop().split("-");if(v.length>1?(v=v[1].split("."),v.pop(),"min"===v[v.length-1]&&v.pop(),v=v.join(".")):v="latest",window.ccm&&window.ccm[v])p();else{var e=document.createElement("script");document.head.appendChild(e),component.ccm.integrity&&e.setAttribute("integrity",component.ccm.integrity),component.ccm.crossorigin&&e.setAttribute("crossorigin",component.ccm.crossorigin),e.onload=function(){p(),document.head.removeChild(e)},e.src=component.ccm.url}}
}() );
