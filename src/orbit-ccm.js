// Name   : orbit-ccm.js
// Date   : 07-05-2018
// Author : Maximilian Kerp
// License: MIT
//
// This file creates a module in the ccm namespace which exposes an api
// to create and utilize distributed storage based on ipfs and orbit-db

(function (){
  var Utils,
      DStore;

  // Don't create module twice
  if (window.ccm.dstore) {
    return;
  }

  // Create aliases and overwrite logger if printing to web page is possible
  var put = console.log;
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('messages')) { 

      put  = Utils.alias('log');
    }
  });

  Utils = {
    isObject: function (obj) {
      return obj === Object(obj)
    },

    log: function () {
      var messages = document.getElementById('messages'),
          code     = document.createElement('pre'),
          log      = document.createElement('p');

      code.textContent = `[${new Date().toLocaleTimeString('de-DE')}]: `;

      for (arg of arguments) {

        if ( this.isObject(arg) ) {

          code.textContent +=  `\n\n${ JSON.stringify(arg, null, 2) }\n\n`
        } else {

          code.textContent += arg + " "
        }
      }

      messages.appendChild(log.appendChild(code))
      if (messages.scrollHeight) { messages.scrollTop = messages.scrollHeight }
    },

    alias: function(fun, module = Utils) {
      return module[fun].bind(module);
    }
  };

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

  class StoreWrapper {

    constructor(docs) {
      this.docs = docs
    }

    get(key, cb) {
      let value = this.docs.get(key).pop()

      return cb ? cb(value) : value;
    }

    set(doc, cb) {
      this.docs.put(doc).then((hash) => {

        put("Added document with hash", hash, ". Document was:", doc)
        return cb ? cb(this.get(doc.key)) : undefined
      })
    }

    del(key, cb) {
      let doc  = this.get(key),
          hash;

      this.docs.del(key).then(function (res){

        return hash = res
      }).then(function (hash) {

        return cb ? cb(hash) : undefined;
      })
    }

    length() {
      return this.docs.query((doc) => true).length
    }

    on(event, cb) {
      // These need to be mapped to easier names, like 'updated': 'replicated'
      const VALID_EVENTS = [
        'replicated',
        'replicate',
        'replicate.progress',
        'load',
        'load.progress',
        'ready',
        'write'
      ]

      if (!VALID_EVENTS.includes(event)) {
        throw new Error('Invalid event to listen on')
      }

      this.docs.events.on(event, cb)
    }

    clear(cb) {
      this.docs.drop().then(function () {

        return cb ? cb() : undefined
      })
    }
  }

  const GLOBAL_STORE_ADDRESS = "/orbitdb/QmWxgYcUfjAnuna26UXrCUqsBV37scb8tMsHP5dNWWKnCE/global-ccm-store"

  DStore = {
    _orbit:      null,
    _ipfs:       null,
    initialized: false,

    open: async function (address, options, cb) {
      const defaultOptions = {
        indexBy: 'key',
      }

      let permissions = {}
      if (options && options.writeAll) {
        permissions.admin = ['*']
        permissions.write = ['*']
      }


      // So far, only writeAll has an effect on the options
      let ops = Object.assign({}, permissions, defaultOptions)

      let docs = this._orbit.docs(address, options)

      await docs.load()
      put(`Store ${docs.address} loaded.`)

      let store = new StoreWrapper(docs)

      return store;
    },

    init: function (cb) {
      const self = this,
            config = {
              EXPERIMENTAL: {
                pubsub: true
              },
              config: {
                Addresses: {
                  Swarm: [
                    // Use IPFS dev signal server
                    // '/dns4/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star',
                    '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
                    // Use local signal server
                    // '/ip4/0.0.0.0/tcp/9090/wss/p2p-webrtc-star',
                  ]
                }
              }
            };

      const waitForOrbit = function (timeout, tries, finished) {
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
        put("dstore module is already getting initialized. Waiting for it to finish..")

        waitForOrbit(200, 10, function (retriesExceeded) {
          if ( retriesExceeded ) {
            put("Couldn't acquire handle to module, check for Errors")
            return;
          }

          put("dstore module initialized.")
          if (cb) { cb(this) }

        })
      } else {
        this.initialized = true

        this._ipfs = new Ipfs(config)

        this._ipfs.on('error', (err) => { throw err })

        this._ipfs.on('ready', () => {
          put("IPFS node ready ✔")

          this._orbit = new OrbitDB(this._ipfs)
          put("OrbitDB created ✔")

          this._orbit.open(GLOBAL_STORE_ADDRESS).then( (global_store) => { 
            put("Global Store loaded ✔")
            this.global = global_store
          })

          put("Initialization done ✔")
          if (cb) { cb(this) }
        })
      }
    }
  }

  // Promise-aware dstore function
  const p_dstore = async function() {
    var args     = arguments[0],//Array.prototype.slice.call(arguments),
        callback = args.pop(),
        options  = args[0],
        store;

    console.log("ARGS p_dstore: ", args)
    if ( !Utils.isObject(options)  || !(options instanceof Object)) {
      console.log(options)
      throw new Error('First argument to .dstore() can only be a real object')
    }

    var address,
        name,
        writeAll = false || options.writeAll,
        register = false || options.register;

    // Check if either passed in address or global address
    if ( options.store.startsWith('/orbit/') ) {
      // This tells us we don't wanna look in the global store
      address = options.store
    } else {

      // Look in global store if neccessary
      if ( DStore.global.get(options.store) ) { address = DStore.global.get(options.store) }
    }

    // If we have no address we want to create one
    // use permission options for that;
    if (!address) {

      name  = options.store
      store = await DStore.open(name, { writeAll })
    } else {

      store = await DStore.open(address, {})
    }

    address = store.address

    // Register new store if wanted, also overwriting existing values
    if (register) {
      await DStore.global.set(name, address)
    }


    return store;
  };

  // Callback-aware dstore function wrapper
  const cb_dstore = function() {
    const args     = arguments[0], //Array.prototype.slice.call(arguments),
          callback = args.pop()

    console.log("ARGS cb_dstore: ", args)
    const promise = p_dstore(args);

    promise.then( function (wrappedStore) {
      callback(wrappedStore)
    }) 

  }

  const MODULE_SCOPE = this;

  // One of initialization function
  window.ccm['dstore'] = function () {
    const args     = Array.prototype.slice.call(arguments);
    console.log("ARGS one-of: ", args)

    DStore.init(function () {

      window.ccm['dstore'] = cb_dstore.bind(MODULE_SCOPE)
      window.ccm.dstore(args);
    });
  }

  console.log("DStore", DStore);
}())



