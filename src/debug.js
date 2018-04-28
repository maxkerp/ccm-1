
window.DEBUG = {

  log: function (string) {
    var messages = document.querySelector('#messages'),
        code     = document.createElement('pre'),
        log      = document.createElement('p')

    code.textContent = string
    messages.appendChild(log.appendChild(code))
  },

  wait: function () {

    return new Promise(function (resolve, _) {
      this.log('Lets wait 5 seconds for everything')
      setTimeout(function () {
        resolve()
      }, 5000, 'foo')
    })
  },
}
