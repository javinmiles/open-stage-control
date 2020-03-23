var ipc = require('../ipc/'),
    parser = require('../parser'),
    editor = require('../editor/'),
    uiFilebrowser = require('../ui/ui-filebrowser'),
    uiFileupload = require('../ui/ui-fileupload'),
    uiLoading = require('../ui/ui-loading'),
    {saveAs} = require('file-saver'),
    widgetManager = require('./widgets'),
    locales = require('../locales')


var SessionManager = class SessionManager {

    constructor() {

        this.session = null
        this.lock = false
        this.lastDir = null
        this.setSessionPath('')

        ipc.on('connect', ()=>{
            ipc.send('sessionSetPath', {path: this.sessionPath})
        })

    }

    load(session, callback) {

        if (this.lock) return

        this.lock = true

        var container = DOM.get('#osc-container')[0]

        uiLoading(locales('loading_session'))

        setTimeout(()=>{
            try {

                // backward compat
                if (Array.isArray(session)) session = session[0]

                // session object must be a root widget
                if (session.type !== 'root') throw new Error(locales('session_malformed'))

                // ok
                this.session = session
                container.innerHTML = ''
                parser.reset()
                parser.parse({
                    data: this.session,
                    parentNode: DOM.get('#osc-container')[0]
                })
                editor.clearHistory()
                DOM.get(document, '#osc-greeting-header')[0].classList.add('hidden')

            } catch (err) {
                uiLoading(false)
                new UiModal({title: locales('session_parsingerror'), content: err.message, icon: 'exclamation-triangle', closable:true})
                this.lock = false
                ipc.send('sessionSetPath', {path: this.sessionPath})
                throw err
            }

            for (var h in widgetManager.widgets) {
                if (widgetManager.widgets[h].value !== undefined) {
                    widgetManager.trigger('change', {
                        widget: widgetManager.widgets[h],
                        id: widgetManager.widgets[h].getProp('id'),
                        linkId: widgetManager.widgets[h].getProp('linkId'),
                        options: {}
                    })
                }
            }

            if (editor.enabled) editor.disable()

            DOM.dispatchEvent(window, 'resize')

            setTimeout(()=>{
                uiLoading(false)
                this.lock = false
                editor.unsavedSession = false
                this.setSessionPath('')
                if (callback) callback()
            }, 25)

        }, 25)

    }

    save(path) {

        if (!this.session || READ_ONLY) return

        if (path) this.setSessionPath(path)

        if (!this.sessionPath) return this.saveAs()

        ipc.send('sessionSave', {
            session: JSON.stringify(this.session, null, '  '),
            path: this.sessionPath
        })

    }

    saveAs() {

        if (!this.session || READ_ONLY) return

        uiFilebrowser({extension: 'json', save:true, directory: this.lastDir}, (path)=>{
            this.lastDir = path[0]
            this.save(path)
        })

    }

    export() {

        var sessionfile = JSON.stringify(this.session,null,'  '),
            blob = new Blob([sessionfile],{type : 'application/json'})

        saveAs(blob, new Date().toJSON().slice(0,10)+'_'+new Date().toJSON().slice(11,16) + '.json')

        editor.unsavedSession = false

    }

    open(data) {

        this.load(data.session, ()=>{
            this.setSessionPath(data.path)
            ipc.send('sessionOpened', {path: data.path})
        })

    }

    requestOpen(path) {

        if (editor.unsavedSession && !confirm(locales('session_unsaved'))) return
        ipc.send('sessionOpen', {path: path})

    }

    browse() {

        if (READ_ONLY) return

        uiFilebrowser({extension: 'json', directory: this.lastDir}, (path)=>{
            if (editor.unsavedSession && !confirm(locales('session_unsaved'))) return
            this.lastDir = path[0]
            ipc.send('sessionOpen',{path:path})
        })

    }

    import() {

        if (READ_ONLY) return

        uiFileupload('.json', (path, result)=>{
            var session
            try {
                session = JSON.parse(result)
            } catch (err) {
                new UiModal({title: locales('session_parsingerror'), content: err, icon: 'exclamation-triangle', closable:true})
            }
            if (editor.unsavedSession && !confirm(locales('session_unsaved'))) return
            if (session) sessionManager.load(session, ()=>{
                ipc.send('sessionSetPath', {path: 'imported'})
            })

        }, ()=>{
            new UiModal({title: locales('error'), content: locales('session_uploaderror'), icon: 'exclamation-triangle', closable:true})
        })

    }

    create() {

        if (editor.unsavedSession && !confirm(locales('session_unsaved'))) return

        this.load({type: 'root'},function(){
            editor.enable()
            editor.select(widgetManager.getWidgetById('root'))
        })
    }

    setSessionPath(path) {

        this.sessionPath = path

    }

}

var sessionManager = new SessionManager()

module.exports = sessionManager
