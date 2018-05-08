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
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('messages')) {

      window.console.debug = Utils.alias('log');
    }
  });

  Utils = {
    isObject: function (obj) {
      return obj === Object(obj)
    },

    isString: function (string) {
      return (typeof string === 'string' || string instanceof String)
    },

    isOrbitAddress: function (string) {
      return this.isString(string) && (string.startsWith('/orbit/') )
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

        console.debug("Added document with hash", hash, ". Document was:", doc)
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

    address() {
      return this.docs.address.toString()
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

    drop(cb) {
      this.docs.drop().then(function () {

        return cb ? cb() : true
      })
    }
  }

  const GLOBAL_ADRESS_STORE = "/orbitdb/QmWxgYcUfjAnuna26UXrCUqsBV37scb8tMsHP5dNWWKnCE/global-ccm-store"


  DStore = {
    initialized: false,
    global: null,
    open: async function (address, options, cb) {
      await this.initialized;

      const defaultOptions = {
        indexBy: 'key',
        maxHistory: 10
      }

      let permissions = {}
      if (options && options.writeAll) {
        permissions.admin = ['*']
        permissions.write = ['*']
      }

      // So far, only writeAll has an effect on the options
      let ops = Object.assign({}, permissions, defaultOptions)

      let docs = await this._orbit.docs(address, ops)
      await docs.load()
      console.debug(`Store ${docs.address} created/loaded.`)

      let store = new StoreWrapper(docs)

      return store;
    },

    init: function (cb) {
      if (!this.initialized) { this.initialized = this._boot() }

      return this.initialized;
    },

    _orbit : null,

    _ipfs  : null,

    _boot: async function () {

      if (!this.initialized) {
        this._ipfs = await this._startIPFS()

        this._orbit = new OrbitDB(this._ipfs)
        console.debug("OrbitDB created ✔")

        this.global = await this._orbit.open(GLOBAL_ADRESS_STORE)
        await this.global.load()
        console.debug("Global Store loaded ✔")
      }
    },

    _startIPFS:  function () {  
      const config = {
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

      return new Promise((resolve, reject) => {
        const ipfs = new Ipfs(config)

        ipfs.on('error', reject)
        ipfs.on('ready', () => {
          console.debug("IPFS node ready ✔")

          resolve(ipfs);
        })
      });
    }
  }

  // Promise-aware dstore function
  const p_dstore = async function(options) {
    var store;

    if ( !Utils.isObject(options) || !(options instanceof Object)) {
      console.log(options)
      throw new Error('First argument to .dstore() can only be a real object')
    } else if ( options.store === 'global' ) {
      return DStore.global;
    }

    var address,
        name,
        writeAll = false || options.writeAll,
        register = false || options.register;

    // Check if either passed in address or global address
    if ( Utils.isOrbitAddress(options.store) ) {
      // This tells us we don't wanna look in the global store
      address = options.store
    } else {

      // Look in global store if neccessary
      if ( DStore.global.get(options.store) ) {
        address = DStore.global.get(options.store)
        console.debug(`After looking in global, found address ${address}`)
      }
    }

    // If we have no address we want to create one
    // use permission options for that
    if (!address) {

      name  = options.store
      store = await DStore.open(name, { writeAll })
      address = store.address()
    } else {

      store = await DStore.open(address, {})
    }

    // Register new store if wanted, also overwriting existing values
    if (register) {
      console.log('Trying to register key', register)
      console.log('Address ',address)
      
      if ( Utils.isOrbitAddress(address) ) {

        await DStore.global.set(register, address)
      } else {

        throw new Error(`Can't register anything but a valid orbit address. Address was ${register}`)
      }
    }

    return store;
  };

  // Callback-aware dstore function wrapper
  const cb_dstore = function() {
    const args     = Array.prototype.slice.call(arguments),
          callback = args.pop(),
          options  = args[0];

    const promise = p_dstore(options);

    promise.then( function (wrappedStore) {
      callback(wrappedStore)
    })

  }

  const MODULE_SCOPE = this;

  // Self destruct function
  window.ccm['dstore'] = function () {
    const args = arguments;

    DStore.init().then(function () {

      console.debug("Initialization done.")
      window.ccm['dstore'] = cb_dstore.bind(MODULE_SCOPE)

      if (args.length !== 0) { window.ccm.dstore(...args); }
    });
  }

  window.DStore = DStore;
}())



