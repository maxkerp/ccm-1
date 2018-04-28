
// Create private namespace
(async function () {
  // Create alias
  const put = DEBUG.log
  const wait = DEBUG.wait

  const config = {
    EXPERIMENTAL: {
      pubsub: true
    },
  }

  window.ipfs  = new Ipfs(config)

  ipfs.on('ready', () => {
    put("IPFS node ready.")

    window.orbit = new OrbitDB(ipfs)
    put("Orbit successfully created.")

    put('Initialising..')
    // init()
  })

  function init() {
    // Create aliases
    const IPFS  = window.ipfs
    const ORBIT = window.orbit
    const CCM   = window.ccm

    class OrbitWrapper {

      store(name, cb) {
        this._store(name).then( (store) => cb(store) )
      }

      async _store(name) {

        let store = await ORBIT.docs(name)
        await store.load();

        put(`Store ${name} created and loaded.`)
        return store
      }
    }

    window.wrapper = new OrbitWrapper();
  }

})()



