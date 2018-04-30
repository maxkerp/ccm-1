
// Create Module
var  CCM = CCM || {};

// Utils
(function () {

  Utils = {

    log: function (string) {
      var messages = document.querySelector('#messages'),
          code     = document.createElement('pre'),
          log      = document.createElement('p')

      code.textContent = string
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

// Create aliases
const put  = CCM.Utils.log;
const wait = CCM.Utils.wait;

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
      console.log(value)

      return cb ? cb(value) : value;
    }

    set(doc, cb) {
      this.docs.put(doc)

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


  CCM.Stores = {
    Object: Store,
    Orbit: OrbitStore
  };
})();

// Wrapper
(function (){

  class OrbitWrapper {

    constructor(orbitInstance) {
      this._orbit = orbitInstance
    }

    create(options, cb) {
      let docs = this._orbit.docs(options.name, { indexBy: 'key' })

      docs.then(async function (docs) {

        await docs.load()

        return docs;
      }).then(function (docs) {
        let store = new CCM.Stores.Orbit(docs)

        return cb(store)
      })
    }

    static init(cb) {
      if (CCM.orbit) {

        console.log("Orbit module has already been initialized.")
        return;
      }

      const config = {
        EXPERIMENTAL: {
          pubsub: true
        }
      }
      const node = new Ipfs(config)

      node.on('ready', () => {
        put("IPFS node ready..")

        const ORBIT = new OrbitDB(node)
        put("Orbit successfully created..")

        CCM.orbit = new OrbitWrapper(ORBIT)
        put("Orbit module initialized")

        if (cb) { cb() }
      })
    }
  }

  CCM.Orbit = OrbitWrapper
})();

// Main
(function () {

  CCM.Orbit.init(function () {

    put('Ready to use Orbit module.')
  });

})();

