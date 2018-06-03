// Create private scope
(function(){

  const ipfsConfig = {
    repo: './ipfs',
    config: {
      Addresses: {
        Swarm: [
          // "/ip4/127.0.0.1/tcp/4001",
          // "/ip4/127.0.0.1/tcp/4002/ws",
          // Use IPFS dev signal server
          // Prefer websocket over webrtc
          //
          // Websocket:
          // '/dns4/ws-star-signal-2.servep2p.com/tcp/443//wss/p2p-websocket-star',
          // '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
          // local signal server
          '/ip4/127.0.0.1/tcp/4711/ws/p2p-websocket-star'
          //
          // WebRTC:
          // '/dns4/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star',
          // local signal server
          // '/ip4/127.0.0.1/tcp/1337/ws/p2p-webrtc-star'
        ]
      }
    },
    EXPERIMENTAL: {
      pubsub: true
    }
  };

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

  // Singelton
  const AddressStore = {
    // public store using this name
    name: "CCM.AddressStore",
    address: "/orbitdb/QmXbUsQ15E6jzizgbTArnfov44b9gam5zu9kXrfR8e4Kgq/CCM.AddressStore",

    init: async function (orbit) {
      const defaultOptions = {
        type: 'keyvalue',
        maxHistory: -1,
        sync: true,
        write: ["*"],
        create: true
      }

      this._orbit = orbit
      this.store = await this._orbit.open(this.address, defaultOptions)
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
        console.debug(`[AddressStore#write] Write  occured! ${dbname}! Entry was:${ JSON.stringify(entry, null, 2) }`)
      })

      this.store.events.on('replicated', function (dbname, length) {
        console.debug(`[AddressStore#replicated] Synced with peer! ${dbname}! Length was:${ length }`)
      })

    }
  };

  const arrayDifference = (first, second) => {
    return first.filter((elem) => second.indexOf(elem) < 0 );
  };

  const onReplicated = (storeAddress) => {
    Utils.log(`Update in ${storeAddress}`)
  }

  const openReplicas = async (addresses, options) => {
    const uniqueAddresses = new Set(addresses)
    console.debug(uniqueAddresses)

    for (address of uniqueAddresses) {
      const store = await orbitdb.open(address, options)
      currentReplicatedAddresses.add(address)

      await store.load()
      store.events.on("replicated", onReplicated)
      Utils.log(`Replica opned: ${address}`)
      
      currentReplicatedStores.push(store)
    }
  }

  const currentReplicatedAddresses = new Set()
  const currentReplicatedStores = []

  let orbitdb = null

  // Create IPFS instance
  const ipfs = new Ipfs(ipfsConfig)

  ipfs.on('error', (e) => console.error(e))

  ipfs.on('ready', async () => {
    const id = await ipfs.id()
    Utils.log(id);
    orbitdb = new OrbitDB(ipfs)

    await AddressStore.init(orbitdb)
    Utils.log("AddressStore ready")

    AddressStore._debug()

    Utils.log("Starting to open replicas")
    openReplicas(AddressStore.addresses(), { create: false })

    AddressStore.on("replicated", async () => {
      
      // find newly registered store
      let newStores = arrayDifference(AddressStore.addresses(), [...currentReplicatedAddresses])
      Utils.log(`New stores registered: ${newStores}`)
      console.log(newStores)

      // start replicating stores
      openReplicas(newStores, { create: true })
    })

    window.A = AddressStore
    window.ipfs = ipfs
    window.orbit = orbitdb
    window.Stores = currentReplicatedStores
  })
}())
