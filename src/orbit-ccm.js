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
                // '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
                // Local signal server
                '/ip4/127.0.0.1/tcp/4711/ws/p2p-websocket-star'
                //
                // WebRTC:
                // '/dns4/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star',
                // Local signal server
                // '/ip4/127.0.0.1/tcp/1337/ws/p2p-webrtc-star'
              ]
            }
          }
        };

  const localRendezvousServer = '/ip4/127.0.0.1/tcp/4711/ws/p2p-websocket-star';

  // Mandatory settings to follow convention:
  // Always index by 'key', only allow docstores
  const sharedStoreSettings = {
    indexBy: 'key',
    maxHistory: -1,
    sync: true,
    type: 'docstore'
  }

  // Prefix used to denote a registered address is used
  const REGISTER_PREFIX = '$'

  // Prefix used to lessen probability of name collisions
  const SAVE_NAME_PREFIX = "CCM."

  // Create aliases and overwrite logger if printing to web page is possible
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('messages')) {

      window.console.debug = Utils.alias('log');
    }
  });

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

      console.debug(`[StoreWrapper#get] Key: ${key}, value: ${value}`)
      return cb ? cb(value) : value;
    }

    set(doc, cb) {
      this._store.put(doc).then((hash) => {

        console.debug(`[StoreWrapper#get] Key: ${doc.key}, value: ${doc}`)
        cb && cb(doc)
      })
    }

    del(key, cb) {
      let doc  = this.get(key),
          hash;

      this._store.del(key).then(function (res){

        return hash = res
      }).then(function (hash) {

        console.debug(`[StoreWrapper#del] Key: ${doc.key}, hash: ${hash}`)
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
      let keys = Object.keys(this._store._index._index)
      console.debug('[StoreWrapper#keys] found these keys: ', keys)

      return keys
    }

    values() {
      throw new Error('Not implemented')
    }

    first() {
      return this._store.all[0]
    }

    last() {
      return this._store.all[this.length() - 1]
    }

    address() {
      return this._store.address.toString()
    }

    drop(cb) {
      this._store.drop().then(function () {

        console.debug(`[StoreWrapper#drop] store dropped`)
        return cb ? cb() : true
      })
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
    name: "CCM.AddressStore",

    init: async function (ipfs) {
      const defaultOptions = {
        // directory: './addresses',
        // path: './addresses',
        type: 'keyvalue',
        maxHistory: -1,
        sync: true,
        write: ["*"],
        create: true
      }

      this._ipfs = ipfs
      this._orbit = new OrbitDB(this._ipfs, './adresses')
      console.debug("AddressStore OrbitDB created ✔")

      this.store = await this._orbit.open(this.name, defaultOptions)
      await this.store.load()

      this.initialized = true

      console.debug(`[AddressStore::init] finished with address ${this.store.address}`)
      return this;
    },

    register: async function (key, address) {
      if (!Utils.isString(key))           { throw new Error(`Key must be a string! Was: ${key}`) }
      if (!Utils.isOrbitAddress(address)) { throw new Error(`Address must be a valid orbit address! Was: ${address}`) }

      await this.store.set(key, address)
      console.debug(`[AddressStore#register] successfully registered ${key} with ${address} `)

      return key
    },

    find: function (key) {
      if (!this.initialized) {
        throw new Error("Can't query AddressStore before initialization!")
      }
      console.debug(`[AddressStore#find] called with key ${key}`)
      console.log("A Index", JSON.stringify(this.store._index._index, null, 2))

      if (Utils.isString(key)) {

        let address = this.store.get(key)
        return address
      } else {

        throw new Error(`Key must be a string! Was ${key}`, key)
      }
    },

    all: function () {
      return this.store._index._index
    },

    keys: function() {
      let keys = Object.keys(this.store._index._index)
      console.debug('[AddressStore#keys] found these keys: ', keys)

      return keys
    },

    addresses: function () {
      return this.store.all
    },

    has: function(key) {
      return this.keys().includes(key)
    },

    on: function(event, cb) {
      this.store.events.on(event, cb)
    },

    _debug: function () {

      this.store.events.on('write', function (dbname, hash, entry) {
        console.debug(`[AddressStore] Write  occured! ${dbname}! Entry was:${ JSON.stringify(entry, null, 2) }`)
      })

      this.store.events.on('replicated', function (dbname, length) {
        console.debug(`[AddressStore] Synced with peer! ${dbname}! Length was:${ length }`)
      })

    }
  };

  // Singelton
  const Controller = {
    initialized  : false,
    booted       : false,
    _orbit       : null,
    _ipfs        : null,

    create: async function (name, options) {
      console.debug(`Controller#create called with name ${name}`)
      if (!this.initialized) {
        throw new Error(`Can't create a store without prior initialization!`)

      } else if (Utils.isOrbitAddress(name)) {
        throw new Error(`Can't create a new store from a valid address! Address: ${name}`)

      } else if (!Utils.isString(name)) {
        throw new Error(`Can't create a new store without a proper name! Name: ${name}`)
      }

      let ops,
          docs,
          store;

      const saveName = SAVE_NAME_PREFIX + name

      // Allow everybody to write to store?
      if (options && options.public === true) {
        ops = Object.assign({ write: ["*"] }, sharedStoreSettings)

      } else {

        ops = Object.assign({ }, sharedStoreSettings)
      }

      // docs() implicitly creates a store if only name given
      // else it opens a store
      docs = await this._orbit.docs(saveName, ops)
      // await docs.load()

      store = new StoreWrapper(docs)
      console.debug(`Store ${store.address()} created/loaded.`)

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

      docs = await this._orbit.open(address, sharedStoreSettings)
      await docs.load()

      store = new StoreWrapper(docs)
      console.debug(`Store ${store.address()} opened`)

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
        const ops = { public: true }

        // Unless explicitly private all stores are public
        if (public === false) { ops.public = false }

        const store = await this.create(name, ops)
        return store;
      }

      const maybeRegisterStore = async (store) => {
        if (!options.register) { return }

        let   key;
        const address = store.address()

        if (Utils.isString(options.register)) {
          key = options.register
        } else {
          key = options.name
        }

        console.log('[dispatch] trying register')
        await AddressStore.register(key, address)
      }

      const openRegisteredStore = async (key) => {
        if (!AddressStore.has(key)) {
          throw new Error(`Can't open store. Address not registered or no peer with matching replica found! Key: ${key}`)
        }

        const address = AddressStore.find(key)
        console.debug(`[openRegisteredStore] Found store registered as ${key}. Address is ${address}`)

        const store = await this.open(address)

        return store
      }

      // String argument means registered or public
      if (Utils.isString(options)) {

        if (options.startsWith(REGISTER_PREFIX)) {
          console.debug('Opening registered store')
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

    connect: function() {
      this._ipfs.swarm.connect(localRendezvousServer, function (err){
        if (err) {
          console.debug(err)
        }
      })
    },

    init: function (cb) {
      if (!this.booted) { this.booted = this._boot() }

      this.booted.then(() => {
        this.initialized = true
        console.debug("Initialization done ✔")

        return cb ? cb(this) : true
      })
    },

    _boot: async function () {

      if (!this.booted) {
        this._ipfs = await this._startIPFS()

        this._orbit = new OrbitDB(this._ipfs)
        console.debug("Controller OrbitDB created ✔")

      }
    },

    _startIPFS:  function () {

      return new Promise((resolve, reject) => {
        const ipfs = new Ipfs(ipfsConfig)

        ipfs.on('error', reject)
        ipfs.on('ready', () => {
          console.debug("IPFS node ready ✔")

          AddressStore.init(ipfs)

          resolve(ipfs);
        })
      });
    }
  }

  // Wrap dispatch for callback style usage
  const dstore = function() {
    const args     = Array.prototype.slice.call(arguments),
          callback = args.pop();

    Controller.dispatch(...args).then(function (store) {
      callback(store)
    })
  }

  // One time, self destruct function
  window.ccm['dstore'] = function () {
    const args = arguments;

    Controller.init(function () {
      window.ccm['dstore'] = dstore.bind(MODULE_SCOPE)

      // FIXME: Use at least a timeout
      // Better would be to get notified when the AddressStore
      // is fully synced
      // if (args.length !== 0) {
      //   setTimeout(function (){

      //     window.ccm.dstore(...args);
      //   }, 1000)
      // }
      if (args.length !== 0) {
        window.ccm.dstore(...args);
      }
    });
  }

  if (window.LOG === 'debug') {
    window.C = Controller;
    window.A = AddressStore;
  }
}())


