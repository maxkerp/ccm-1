
function peerA() {

  ccm.dstore('scenario_2', function(store){
    window.store = store

    store.set({key: '001', entry: 1}, function() {

      store.set({key: '002', entry: 2})
    })
  })
}

function peerB() {

  ccm.dstore('scenario_2', function(store){
    window.store = store

    let document1 = store.get('001')
    let document2 = store.get('002')

    setTimeout(function() {

      console.log(document1)
      console.log(document2)
    }, 3000)
  })
}
