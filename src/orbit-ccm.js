
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
var put;


// Log to web page if possible
if (document.querySelector('#messages')) {

  put  = alias('log');
} else {

  put  = console.log;
}

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
    _orbit: null,
    _node: null,
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

      var waitForOrbit = function () {

        if (self._orbit) {

          cb(self)
        } else {
          put("still waiting for initialization to finish..")

          setTimeout(waitForOrbit, 200)
        }
      }

      if (this.initialized) {
        put("Module.init() has already been called. Waiting for it to finish..")

        waitForOrbit()
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
(function () {

  CCM.Orbit.init(function (handle) {

  });

})();

