// Name   : orbit-ccm.js
// Date   : 07-05-2018
// Author : Maximilian Kerp
// License: MIT
//
// This file creates a module in the ccm namespace which exposes an api
// to create and utilize distributed storage based on ipfs and orbit-db

(function (){

  // Don't create module twice
  if (window.ccm.dstore) {
    return;
  }

  const MODULE_SCOPE = this;

  const ipfsConfig = {
          EXPERIMENTAL: {
            pubsub: true
          },
          config: {
            Addresses: {
              Swarm: [
                // Use IPFS dev signal server
                // Prefer websocket over webrtc
                //
                // Websocket:
                // '/dns4/ws-star-signal-2.servep2p.com/tcp/443//wss/p2p-websocket-star',
                '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
                // Local signal server
                // '/ip4/127.0.0.1/tcp/4711/ws/p2p-websocket-star'
                //
                // WebRTC:
                // '/dns4/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star',
                // Local signal server
                // '/ip4/127.0.0.1/tcp/1337/ws/p2p-webrtc-star'
              ]
            }
          }
        };

  // Mandatory settings to follow convention:
  // Always index by 'key', only allow docstores
  const SHARED_STORE_SETTINGS = {
    indexBy: 'key',
    maxHistory: -1,
    sync: true,
    type: 'docstore'
  }

  // Prefix used to denote a registered address is used
  const REGISTER_PREFIX = '$'

  // Prefix used to lessen probability of name collisions
  const SAFE_NAME_PREFIX = "CCM."

  // Create aliases and overwrite logger if printing to web page is possible
  // and log level is set to debug.
  if (window.LOG === 'debug') {
    document.addEventListener('DOMContentLoaded', function () {
      if (document.getElementById('messages')) {

        window.console.debug = Utils.alias('log');
      }
    });
  }

  // Singelton
  const Utils = {
    isObject: function (obj) {
      return obj === Object(obj)
    },

    isString: function (string) {
      return (typeof string === 'string' || string instanceof String)
    },

    isOrbitAddress: function (string) {
      return this.isString(string) && (string.startsWith('/orbitdb/') )
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

    constructor(store) {
      this._store = store
    }

    get(key, cb) {
      let value = this._store.get(key).pop()

      return cb ? cb(value) : value;
    }

    set(doc, cb) {
      this._store.put(doc).then((hash) => {
        console.debug(`[StoreWrapper#set] Set ${doc.key}. Operation hash: ${hash}`)
        cb && cb(doc)
      })
    }

    del(key, cb) {
      const doc  = this.get(key)

      this._store.del(key).then((hash) => {
        console.debug(`[StoreWrapper#del] Deleted ${key}. Operation hash: ${hash}`)
        cb && cb(doc)
      })
    }

    all() {
      return this._store.all
    }

    length() {
      return this.keys().length
    }

    keys() {
      return Object.keys(this._store._index._index)
    }

    values() {
      return this.all()
    }

    first() {
      return this.all()[0]
    }

    last() {
      return this.all()[this.length() - 1]
    }

    address() {
      return this._store.address.toString()
    }

    source() {
      return this.address()
    }

    drop(cb) {
      this._store.drop().then(() => {
        return cb ? cb() : true
      })
    }

    clear(cb) {
      this.drop(cb)
    }

    on(event, cb) {
      // These could be mapped to easier names, like 'update': 'replicated'
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

      this._store.events.on(event, cb)
    }

    _debug() {

      this._store.events.on('write', function (dbname, hash, entry) {
        console.debug(`[StoreWrapper] Write  occured! ${dbname}! Entry was:${ JSON.stringify(entry, null, 2) }`)
      })

      this._store.events.on('replicated', function (dbname, length) {
        console.debug(`[StoreWrapper] Synced with peer! ${dbname}! Length was:${ length }`)
      })

    }
  }

  // Singelton
  const AddressStore = {
    // public store using this name
    name: SAFE_NAME_PREFIX + "AddressStore",

    init: async function (orbitdb) {
      const ADDRESS_STORE_SETTINGS = {
        type: 'keyvalue',
        maxHistory: -1,
        sync: true,
        write: ["*"],
        create: true
      }

      this._orbitdb = orbitdb
      this._store = await this._orbitdb.open(this.name, ADDRESS_STORE_SETTINGS)
      await this._store.load()

      this.initialized = true

      return this;
    },

    register: async function (key, address) {
      if (!Utils.isString(key))           { throw new Error(`Key must be a string! Was: ${key}`) }
      if (!Utils.isOrbitAddress(address)) { throw new Error(`Address must be a valid orbitdb address! Was: ${address}`) }

      await this._store.set(key, address)
      console.debug(`[AddressStore#register] successfully registered ${key} for ${address} `)

      return key
    },

    find: function (key) {
      if (!this.initialized)    { throw new Error("Can't query AddressStore before initialization!") }
      if (!Utils.isString(key)) { throw new Error(`Key must be a string! Was: ${key}`) }

      return this._store.get(key)
    },

    all: function () {
      return this._store._index._index
    },

    keys: function() {
      return Object.keys(this._store._index._index)
    },

    has: function(key) {
      return this.keys().includes(key)
    },

    values: function () {
      return this._store.all
    },

    addresses: function () {
      return this.values()
    },

    address: function () {
      this._store.address.toString()
    },

    drop: function (cb) {
      this._store.drop().then(() => {
        return cb ? cb() : true
      })
    },

    on: function(event, cb) {
      this._store.events.on(event, cb)
    },

    _debug: function () {

      this._store.events.on('write', function (dbname, hash, entry) {
        console.debug(`[AddressStore] Write  occured! ${dbname}! Entry was:${ JSON.stringify(entry, null, 2) }`)
      })

      this._store.events.on('replicated', function (dbname, length) {
        console.debug(`[AddressStore] Synced with peer! ${dbname}! Length was:${ length }`)
      })

    }
  };

  // Singelton
  const Controller = {
    initialized  : false,
    booted       : false,
    _orbitdb       : null,
    _ipfs        : null,

    create: async function (name, public) {
      if (!this.initialized) {
        throw new Error(`Can't create a store without prior initialization!`)

      } else if (Utils.isOrbitAddress(name)) {
        throw new Error(`Can't create a new store from a valid address! Address: ${name}`)

      } else if (!Utils.isString(name)) {
        throw new Error(`Can't create a new store without a proper name! Name: ${name}`)
      }

      let docs,
          store,
          settings;

      const saferName = SAFE_NAME_PREFIX + name

      // Allow everybody to write to store?
      if (public === true) {
        settings = Object.assign({ write: ["*"] }, SHARED_STORE_SETTINGS)

      } else {

        // Clone settings
        settings = Object.assign({ }, SHARED_STORE_SETTINGS)
      }

      // docs() implicitly creates a store if only name given
      // else it opens a store
      docs = await this._orbitdb.docs(saferName, settings)
      await docs.load()

      store = new StoreWrapper(docs)
      console.debug(`Created ${store.address()}`)

      return store;
    },

    open: async function (address) {
      if (!this.initialized) {
        throw new Error(`Can't open a store without prior initialization!`)
      } else if (!Utils.isOrbitAddress(address)) {
        throw new Error(`Trying to open a store without a valid address: ${address}.`)
      }

      let docs,
          store;

      docs = await this._orbitdb.open(address, SHARED_STORE_SETTINGS)
      await docs.load()

      store = new StoreWrapper(docs)
      console.debug(`Opened ${store.address()}`)

      return store;
    },

    dispatch: async function(options) {
      if (!Utils.isString(options) && !Utils.isObject(options)) {
        throw new Error('Wrong type of Arguments used!')
      } else if (!this.initialized) {
        throw new Error("Can't use module before initialization")
      }

      let store,
          address;

      const createStore = async (name, public) => {
        let access = true

        // Unless explicitly private all stores are public
        if (public === false) { access = false }

        const store = await this.create(name, access)
        return store;
      }

      const maybeRegisterStore = async (store) => {
        if (!options.register) { return }

        let   key;
        const address = store.address()

        // Register name if type is a boolean
        if (Utils.isString(options.register)) {
          key = options.register
        } else {
          key = options.name
        }

        await AddressStore.register(key, address)
      }

      const openRegisteredStore = async (key) => {
        if (!AddressStore.has(key)) {
          throw new Error(`Can't open store. Address not registered or no peer with matching replica connected! Key: ${key}`)
        }

        const address = AddressStore.find(key)
        const store   = await this.open(address)

        return store
      }

      // String argument means registered or public
      if (Utils.isString(options)) {

        if (options.startsWith(REGISTER_PREFIX)) {
          store = await openRegisteredStore(options.slice(1))

        } else {
          store = await createStore(options)
        }

      // Object argument could mean public or private
      } else if (Utils.isObject(options)) {

        store = await createStore(options.name, options.public)
      }

      maybeRegisterStore(store)

      return store;
    },

    init: function (cb) {
      if (!this.booted) { this.booted = this._boot() }

      this.booted.then(() => {
        cb && cb(this)
      })
    },

    _boot: async function () {

      if (!this.booted) {
        this._ipfs = await this._startIPFS()

        this._orbitdb = new OrbitDB(this._ipfs)
        console.debug("OrbitDB created ✔")

        await AddressStore.init(this._orbitdb)
        console.debug("AddressStore loaded ✔")

        this.initialized = true
        console.debug("Initialization done ✔")
      }
    },

    _startIPFS:  function () {

      return new Promise((resolve, reject) => {
        const ipfs = new Ipfs(ipfsConfig)

        ipfs.on('error', reject)
        ipfs.on('ready', () => {
          console.debug("IPFS node ready ✔")
          resolve(ipfs);
        })
      });
    }
  }

  // Wrap dispatch for callback style usage
  const dstore = function() {
    const args     = Array.prototype.slice.call(arguments)

    if (args.length < 2) { throw new Error('Arguments missing! Usage: dstore(object, callback)') }

    const callback = args.pop();

    Controller.dispatch(...args).then((store) => {
      callback(store)
    })
  }

  // One time, self destruct function
  window.ccm['dstore'] = function () {
    const args = arguments;

    Controller.init(function () {
      window.ccm['dstore'] = dstore.bind(MODULE_SCOPE)

      if (args.length > 1) {
        window.ccm.dstore(...args);
      }
    });
  }

  if (window.LOG === 'debug') {
    window.CCM_ORBTI_CONTROLLER = Controller;
    window.CCM_ADDRESS_STORE = AddressStore;
  }
}())


