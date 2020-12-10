var UiSidePanel = require('./ui-sidepanel'),
    html = require('nanohtml'),
    raw = require('nanohtml/raw'),
    locales = require('../locales'),
    {icon} = require('./utils'),
    Script = require('../widgets/scripts/script'),
    widgetManager = require('../managers/widgets')

class UiConsole extends UiSidePanel {

    constructor(options) {

        super(options)

        this.header = DOM.get(this.container, 'osc-panel-header')[0]

        this.header.appendChild(html`<label>${locales('console')}</label>`)
        this.messages = this.content.appendChild(html`<osc-console></osc-console>`)

        this.inputWrapper = this.content.appendChild(html`<osc-console-input></osc-console-inpu>`)
        this.input = this.inputWrapper.appendChild(html`<textarea rows="1"></textarea>`)

        this.actions = this.header.appendChild(html`<div class="actions"></div>`)
        this.clearBtn = this.actions.appendChild(html`<div class="clear" title="${locales('console_clear')}">${raw(icon('trash'))}</div>`)
        this.clearBtn.addEventListener('click', ()=>{
            this.clear()
        })

        this.length = 0
        this.maxLength = ENV.consoleLength || 300

        this.history = ['']
        this.cursor = 0


        var _this = this

        console._log = console.log
        console.log = function(message){
            _this.log('log', message)
            console._log(...arguments)
        }

        console._error = console.error
        console.error = function(message){
            _this.log('error', message)
            console._error(...arguments)
        }


        this.script = new Script({props:{
            id: 'CONSOLE',
            script: 'return eval(value)',
            event: 'value'
        }, parent: widgetManager})
        this.script._not_editable = true
        this.script.hash = 'CONSOLE'

        this.input.addEventListener('keydown', (event)=>{
            if (event.keyCode === 13 && !event.shiftKey) {
                event.preventDefault()
                this.inputValidate()
            } else if (event.keyCode === 38) {
                if (this.cursor < this.history.length - 1) {

                    if (this.input.value.substr(0, this.input.selectionStart).split('\n').length !== 1) return

                    this.cursor += 1
                    this.input.value = this.history[this.cursor]
                    event.preventDefault()
                }
            } else if (event.keyCode === 40) {
                if (this.cursor > 0) {
                    var nLines = this.input.value.split('\n').length
                    if (this.input.value.substr(0, this.input.selectionStart).split('\n').length !== nLines) return

                    this.cursor -= 1
                    this.input.value = this.history[this.cursor]
                    event.preventDefault()
                }
            } else if (event.keyCode === 9) {
                var cur = this.input.selectionStart,
                    val = this.input.value
                this.input.value = val.slice(0, cur) + '  ' + val.slice(cur)
                event.preventDefault()
            }

            this.inputSize()

        })

        this.input.addEventListener('input', (event)=>{
            this.inputSize()
        })

        this.enable()

    }

    inputSize() {
        this.input.setAttribute('rows',0)
        this.input.setAttribute('rows', this.input.value.split('\n').length)
    }

    inputValidate() {

        if (this.input.value == '') return

        this.log('input', `${this.input.value}`)
        var returnValue = this.script.setValue(this.input.value, {sync: true, send: true})
        if (returnValue === undefined) {
            this.log('output undefined', 'undefined')
        } else {
            this.log('output value', returnValue)
        }

        if (this.input.value !== this.history[this.cursor] && this.input.value !== this.history[1]) {
            this.history.splice(1, 0, this.input.value)
            if (this.history.length > 10) this.history.pop()
        }

        this.input.value = ''
        this.cursor = 0

    }

    log(type, message, html) {

        var node = this.messages.appendChild(html`
            <osc-console-message class="${type}">

            </osc-console-message>
        `)

        if (typeof message === 'object') {
            if (!(message instanceof Error)) {
                try {
                    message = JSON.stringify(message)
                } catch (_) {}
            } else {
                message = String(message) + message.stack
            }
        }

        if (html) {
            node.innerHTML = message
        } else {
            node.textContent = message
        }

        if (type !== 'error' && node.textContent.match(/error/i)) node.classList.add('error')

        node.scrollIntoView()

        if (++this.length > this.maxLength) this.purge()


    }

    purge() {

        var children = [...this.messages.children]
        for (var i = 0; i < this.maxLength / 2; i++) {
            this.messages.removeChild(children[i])
        }
        this.length = this.maxLength / 2 + 1

    }

    clear() {

        this.messages.innerHTML = ''
        this.length = 0
        this.script.onRemove()

    }

}

module.exports = new UiConsole({selector: '#osc-console', minSize: 40, size: 200, minimized: true})
