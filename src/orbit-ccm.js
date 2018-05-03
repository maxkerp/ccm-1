
// Create Module
var  CCM = CCM || {};


// Utils
(function () {

  Utils = {

    isObject: function (obj) {
      return obj === Object(obj)
    },

    log: function () {
      var messages = document.querySelector('#messages'),
          code     = document.createElement('pre'),
          log      = document.createElement('p');

      code.textContent = `[${new Date().toLocaleTimeString('de-DE')}]: `;

      for (arg of arguments) {

        if ( this.isObject(arg) ) {

          code.textContent += JSON.stringify(arg) + " "
        } else {

          code.textContent += arg + " "
        }
      }

      messages.appendChild(log.appendChild(code))
      if (messages.scrollHeight) { messages.scrollTop = messages.scrollHeight }
    },

    wait: function () {

      return new Promise((resolve, _)  => {

        setTimeout(function () {
          resolve()
        }, 5000, 'foo');
      });
    }
  };

  CCM.Utils = Utils
})();

var alias = function(fun, module = CCM.Utils) {
  return module[fun].bind(module);
};

// Create aliases
var put = console.log;


// Overwrite logger if printing to web page is possible
document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('messages')) { 

    put  = alias('log');
  }
});


// Store Class
(function () {

  // Object Store
  class Store {

    constructor() {
      this.data = {}
    }

    get(key, cb) {
      let value = this.data[key]

      return cb ? cb(value) : value;
    }

    set(doc, cb) {
      this.data[doc.key] = doc

      return cb ? cb(doc) : doc;
    }

    del(key, cb) {
      let doc = this.data[key]
      delete this.data[key]

      return cb ? cb(doc) : doc;
    }

    length() {
      return Object.keys(this.data).length
    }
  }

  // Orbit Store
  class OrbitStore {

    constructor(docs) {
      this.docs = docs
    }

    get(key, cb) {
      let value = this.docs.get(key).pop()

      return cb ? cb(value) : value;
    }

    set(doc, cb) {
      this.docs.put(doc).then((hash) => {

        put("Hash for", doc, "is", hash)
        cb(this.get(doc.key));
      })
    }

    del(key, cb) {
      let doc  = this.get(key),
          hash;

      this.docs.del(key).then(function (res){

        return hash = res
      }).then(function (hash) {

        cb(hash)
      })
    }

    length() {
      return this.docs.query((doc) => true).length
    }

    clear(cb) {
      this.docs.drop().then(function () {

        cb();
      })
    }
  }


  CCM.Stores = {
    Object: Store,
    Orbit: OrbitStore
  };
})();

// Wrapper
(function (){

  var OrbitWrapper = {

    // May make these private
    _orbit:      null,
    _node:       null,
    initialized: false,

    create: function (options, cb) {
      let docs = this._orbit.docs(options.name, { indexBy: 'key' })

      docs.then(async function (docs) {
        // Wait for store to load
        await docs.load()

        let store = new CCM.Stores.Orbit(docs)

        return cb(store)
      })
    },

    init: function (cb) {
      var self = this;

      var waitForOrbit = function (timeout, tries, finished) {
        var retries = 0;

        (function wait() {
          retries++

          if (self._orbit) {

            finished(false)
          } else if ( retries === tries + 1 ) {

            finished(true);
          } else {
            put(`still waiting for initialization to finish.. (${(retries * timeout)}ms)`)

            setTimeout(wait, timeout)
          }
        }());
      }

      if (this.initialized) {
        put("Module.init() has already been called. Waiting for it to finish..")

        waitForOrbit(200, 10, function (retriesExceeded) {
          if ( retriesExceeded ) {
            put("Couldn't acquire handle, check for Errors")
            return;
          }

          put("Handle acquired")
          if (cb) { cb(this) }

        })
      } else {
        this.initialized = true

        const config = {
          EXPERIMENTAL: {
            pubsub: true
          }
        }
        this._node = new Ipfs(config)

        this._node.on('ready', () => {
          put("IPFS node ready ✔")

          const ORBIT = new OrbitDB(this._node)
          this._orbit = ORBIT
          put("OrbitDB created ✔")
          put("Initialization done ✔")

          if (cb) { cb(this) }
        })
      }
    }
  }

  CCM.Orbit = OrbitWrapper;

})();

// Main
// (function () {

//   CCM.Orbit.init(function (handle) {

//      handle.create("quizes", function (quizes){
//       quizes.get('se2.lect3.patterns', function (patternQuiz) {

//         ccm.start('quiz', { data: patternQuiz })
//       })
//      })
//   });

// })();





