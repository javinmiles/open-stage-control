var Container = require('../common/container'),
    widgetManager = require('../../managers/widgets'),
    resize = require('../../events/resize'),
    parser = require('../../parser'),
    {deepCopy, deepEqual} = require('../../utils'),
    {diff, diffToWidget} = require('../../editor/diff'),
    html = require('nanohtml'),
    sessionManager,
    Session = require('../../managers/session/session')


var excludedfragmentClasses =  ['widget', 'absolute-position', 'not-editable', 'editing', 'flex-expand', 'no-interaction']

class Fragment extends Container() {

    static description() {

        return 'Embedded session or fragment file with overridable properties.'

    }

    static defaults() {

        var defaults = super.defaults().extend({

            class_specific: {
                file: {type: 'string', value: '', help: 'Fragment file path (relative to the session or theme file location by default, falling back to absolute path)'},
                props: {type: 'object', value: {}, editor: 'javascript', syntaxChecker: false, help: 'Fragment widget\'s properties to override'},
            },
            value: null,
            osc: null,
            scripting: null
        })

        defaults.style = {css: defaults.style.css}

        return defaults

    }

    constructor(options) {

        options.props.address = 'auto'
        options.props.variables = '@{parent.variables}'

        super({...options, html: html`<div class="fragment"></div>`})

        this.noValueState = true

        this.modalBreakout = 0

        this.fragmentClass = []
        this.container.classList.add('empty')

        this.on('widget-created', (e)=>{

            if (e.widget !== this) {
                e.widget.container.classList.add('not-editable')
                e.widget._not_editable = true
            }

        })

        sessionManager = sessionManager || require('../../managers/session')

        sessionManager.on('fragment-updated', (e)=>{
            var {path} = e
            if (path === this.getProp('file')) {
                this.createFragment()
            }
        }, {context: this})

        if (this.getProp('file')) {
            if (sessionManager.getFragment(this.getProp('file'))) {
                this.createFragment(true)
            } else {
                sessionManager.loadFragment(this.getProp('file'))
            }
        }


    }

    createFragment(init) {

        var fragment = sessionManager.getFragment(this.getProp('file'))

        if (!fragment) return


        var data = {...deepCopy(fragment.getRoot()), ...this.getProp('props')}

        Session.converters['1.13.2'].widget(data)

        parser.parse({
            data: data,
            parentNode: this.widget,
            parent: this
        })

        this.updateContainer(!init)

    }


    updateContainer(checkResize) {


        if (this.children[0]) {

            var classes = [...this.children[0].container.classList].filter(i=>excludedfragmentClasses.indexOf(i) === -1)

            if (!deepEqual(classes, this.fragmentClass)) {
                this.container.classList.remove(...this.fragmentClass)
                this.fragmentClass = classes
                this.container.classList.add(...this.fragmentClass)
            }

            this.container.classList.remove('empty')

            for (var w of this.getAllChildren()) {
                w.container.classList.add('not-editable')
            }

            if (checkResize) resize.check(this.widget)

        } else if (this.fragmentClass.length) {

            this.container.classList.remove(...this.fragmentClass)
            this.container.classList.add('empty')
            this.fragmentClass = []
            this.widget.innerHTML = ''
            widgetManager.removeWidgets(this.getAllChildren())

        }

    }

    updateFragment() {


        var fragment = sessionManager.getFragment(this.getProp('file'))

        if (!fragment) return

        var data = {...deepCopy(fragment.getRoot()), ...this.getProp('props')},
            fragmentWidget = this.children[0]

        Session.converters['1.13.2'].widget(data)

        var delta = diff.diff(fragmentWidget.props, data) || {},
            [widget, patch] = diffToWidget(fragmentWidget, delta),
            changedProps = Object.keys(patch)

        if (changedProps.length) {

            diff.patch(widget.props, patch)


            if (changedProps.some(x => !widget.isDynamicProp(x))) {

                fragmentWidget.reCreateWidget({reuseChildren: false})
                this.updateContainer(false)

            } else {

                widget.updateProps(changedProps, this)
                this.updateContainer(true)

            }

        }

    }

    onPropChanged(propName, options, oldPropValue) {

        if (super.onPropChanged(...arguments)) return true

        switch (propName) {

            case 'props':
                if (this.children[0]) this.updateFragment()
                return

        }

    }

}

Fragment.dynamicProps = Fragment.prototype.constructor.dynamicProps.concat(
    'props'
)

module.exports = Fragment
