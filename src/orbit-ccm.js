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


  // Dependencies

  // From: https://stackoverflow.com/questions/21485545/is-there-a-way-to-tell-if-an-es6-promise-is-fulfilled-rejected-resolved
  function StatefulPromise(promise) {
      // Don't create a wrapper for promises that can already be queried.
      if (promise.isResolved) return promise;

      var isResolved = false;
      var isRejected = false;

      // Observe the promise, saving the fulfillment in a closure scope.
      var result = promise.then(
         function(v) { isResolved = true; return v; },
         function(e) { isRejected = true; throw e; });
      result.isFulfilled = function() { return isResolved || isRejected; };
      result.isResolved = function() { return isResolved; }
      result.isRejected = function() { return isRejected; }
      return result;
  }

  // End of Dependencies

  const MODULE_SCOPE        = this;

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
        return cb ? cb(this.get(doc.key)) : undefined
      })
    }

    del(key, cb) {
      let doc  = this.get(key),
          hash;

      this._store.del(key).then(function (res){

        return hash = res
      }).then(function (hash) {

        console.debug(`[StoreWrapper#del] Key: ${doc.key}, hash: ${hash}`)
        return cb ? cb(hash) : undefined;
      })
    }

    address() {
      return this._store.address.toString()
    }

    all() {
      return this._store.all
    }

    first() {
      return this._store.all[0]
    }

    last() {
      return this._store.all[this.length() - 1]
    }

    length() {
      return this.keys().length
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

    keys() {
      let keys = Object.keys(this._store._index._index)
      console.debug('[StoreWrapper#keys] found these keys: ', keys)

      return keys
    }

    drop(cb) {
      this._store.drop().then(function () {

        console.debug(`[StoreWrapper#drop] store dropped`)
        return cb ? cb() : true
      })
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
    // public writeAll stores always have the same full address,
    // since address creation is deterministic
    name: "CCM.AdressStore",

    init: async function (orbit) {
      const defaultOptions = {
        type: 'docstore',
        indexBy: 'key',
        maxHistory: -1,
        sync: true,
        write: ["*"],
        create: true
      }

      this._orbit = orbit
      this.store = await this._orbit.open(this.name, defaultOptions)

      await this.store.load()

      const done = new Promise( function (resolve) { resolve(true) })
      this.initialized = StatefulPromise(done)

      console.debug(`[AddressStore::init] finished with address ${this.store.address}`)
      return this;
    },

    register: async function (key, address) {
      if ( Utils.isString(key) && Utils.isOrbitAddress(address) ) {
        console.debug('[AddressStore#register] Trying to register key', key)
        console.debug('[AddressStore#register] Address ', address)

        await this.store.set(key, address)
      } else {

        throw new Error(`Couldn't register new store! Key: ${key} Address: ${address}`)
      }
    },

    find: function (key) {
      if (!this.initialized.isResolved()) {
        throw new Error("Can't query AddressStore before initialization!")
      }
      console.debug(`[AddressStore#find] called with key ${key}`)
      console.log("A Index", JSON.stringify(this.store._index._index, null, 2))

      if (Utils.isString(key)) {

        let address = this.store.get(key)
        console.log("Found address ", address, "for key ", key)
        console.log(this)
        console.log("Found address ", this.store.get(key), "for key ", key)
        console.log("Found in index ", this.store._index._index[key], "for key ", key)

        console.log("B Index", JSON.stringify(this.store._index._index, null, 2))
        return address ? address : false
      } else {

        throw new Error(`Key must be a string! Was ${key}`, key)
      }
    },

    all: function () {
      let addresses = this.store.all
      console.debug('[AddressStore#all] found these addresses: ', addresses)

      return addresses
    },

    keys: function() {
      let keys = Object.keys(this.store._index._index)
      console.debug('[AddressStore#keys] found these keys: ', keys)

      return keys
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

  const ipfsConfig = {
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
                '/ip4/127.0.0.1/tcp/1337/ws/p2p-webrtc-star'
                // '/ip4/0.0.0.0/tcp/9090/wss/p2p-webrtc-star',
              ]
            }
          }
        };

  // Singelton
  const Controller = {
    initialized  : false,
    booted       : false,
    addressStore : null,
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

      let ops = {},
          docs,
          store;

      const defaultOptions = {
        indexBy: 'key',
        // Still deciding if this is neccessary
        maxHistory: -1,
        sync: true
      }

      // Allow everybody to write to store?
      if (options && options.writeAll) {
        ops.admin = ['*']
        ops.write = ['*']
      }

      ops  = Object.assign(defaultOptions, ops)
      docs = await this._orbit.docs(name, ops)

      await docs.load()

      store = new StoreWrapper(docs)
      console.debug(`Store ${store.address()} created/loaded.`)

      return store;
    },

    // FIXME: Sync is still not functional, a store gets only synced
    // when a peer updates it.
    // Check maxHistory, sync, replicate options and their effect!!!
    // This
    open: async function (address, options) {
      if (!this.initialized) {
        throw new Error(`Can't open a store without prior initialization!`)
      } else if (!options.write && !Utils.isOrbitAddress(address)) {
        throw new Error(`Trying to open a private store without a valid address: ${address}.`)
      }

      const defaultOptions = {
        indexBy: 'key',
        maxHistory: -1,
        sync: true
      }

      const ops = Object.assign(options, defaultOptions)

      let docs,
          store;

      docs = await this._orbit.open(address, ops)
      await docs.load()

      store = new StoreWrapper(docs)
      console.debug(`Store ${store.address()} opened`)

      return store;
    },

    dispatch: async function(arg) {
      if (!this.initialized) {
        throw new Error("Can't use module before initialization")
      }

      let store,
          address;

      const openPublicStore = async (name) => {
        const publicStoreOptions = {
          type: 'docstore',
          create: true,
          write: ["*"]
        }

        let store = await this.open(name, publicStoreOptions )
        return store;
      }

      const openRegisteredStore = async (string) => {
        console.debug(`openRegisteredStore ${string}`)
        let address,
            key;

        if ( Utils.isOrbitAddress(string) ) {

          address = string

        } else if (this.addressStore.find(string)) {
          key = string

          address = this.addressStore.find(string)
          console.debug(`Found store registered as ${key}. Address is ${address}`)
        } else {

          throw new Error(`Can't open store. Address neither valid, nor registered! Adress: ${address}`)
        }

        store = await this.open(address)

        return store
      }

      const tryCreateAndRegister = async (obj) => {
        const name     = obj.name,
              writeAll = false || obj.writeAll,
              key      = false || obj.register;

        let store;

        store = await this.create(name, { writeAll })

        if (key) {

          this.addressStore.register(key, store.address())
        }

        return store;
      }

      // Only using a string argument means we're using a public
      // store.
      if (Utils.isString(arg)) {
        console.debug(`Opening public store: ${arg}`)
        store = await openPublicStore(arg)

      } else if (Utils.isObject(arg) || (arg instanceof Object))   {
        store = await tryCreateAndRegister(arg)

      } else {
        throw new Error('Wrong type of Arguments used!')
      }

      return store;
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
        console.debug("OrbitDB created ✔")

        // this.addressStore = await AddressStore.init(this._orbit)
        // await this.addressStore.initialized
        // console.debug("AddressStore loaded ✔")
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

  window.C = Controller;
}())


