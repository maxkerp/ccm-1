
function persistStore() {

  ccm.dstore('scenario_1', function(store){
    window.store = store

    store.set({key: '001', entry: 1})
    store.set({key: '002', entry: 2})
  })
}

function persistStore2() {

  ccm.dstore('scenario_1', function(store){
    window.store = store

    store.set({key: '001', entry: 1}, function() {

      store.set({key: '002', entry: 2})
    })
  })
}

function loadStore() {

  ccm.dstore('scenario_1', function(store){
    window.store = store

    let document1 = store.get('001')
    let document2 = store.get('002')

    console.log(document1)
    console.log(document2)
  })
}
