const expect = chai.expect;

describe('CCM', function () {

  describe('current version number', function (){

    it('is 16.3.3', function (){
      expect(ccm.version()).to.eql('16.3.3')
    })
  })

  describe('.orbit()', function() {

    describe('Creating an orbit docstore', function (){

      describe('.orbti(store: "< name >", callback)', function (){

        it('creates a docstore')
      })
    })
  })


  describe('.ipfs()', function () {

  })
})

describe('Stores', function () {

  describe('Object Store', function () {
    var store;

    before

    beforeEach( function () {
      store = new CCM.Stores.Object()
      data = {
        '001': {key: '001', name: 'max', age: 27},
        '003': {key: '003', name: 'felix', age: 15},
        '002': {key: '002', name: 'daniel', age: 24}
      }

      store.data = data

    }) 

    describe('get', function () {

      it('returns value for specified key', function () {

        expect(store.get('001')).to.eql({key: '001', name: 'max', age: 27})
        expect(store.get('003')).to.eql({key: '003', name: 'felix', age: 15})
      })
    })

    describe('set', function () {

      it('sets Object with specified key', function () {
        var new_doc = { key: 'new_key', name: 'Foo', age: null }

        store.set(new_doc)
        console.log(data)

        expect(store.get(new_doc.key)).to.eql(new_doc)
      })

      it('increases the length of the store by 1', function () {
        var new_doc = { key: 'new_key', name: 'Foo', age: null }

        store.set(new_doc)
        console.log(data)

        expect(store.length()).to.eql(4)
      })
    })

    describe('del', function () {

      it('deletes Object with specified key', function () {
        console.log(data)

        store.del('002')
        expect(store.get('002')).to.be.undefined
      })


      it('decreases the length of the store by 1', function () {
        console.log(data)

        store.del('002')
        expect(store.length()).to.eql(2)
      })
    })
  })

  describe.only('Orbit Store', function () {
    var store;

    before(function (done){

      CCM.Orbit.init(function (){

        done();
      })
    })

    beforeEach(function (done) {

      CCM.orbit.create({name: 'test_store'}, function (test_store) {
        store = test_store

        store.set({key: '001', name: 'max', age: 27}, function (){
          done();
        });
      })
    }) 

    describe('get', function (done) {

      it('returns value for specified key', function (done) {

        store.get('001', function (res) {

          expect(res).to.eql({ key: '001', name: 'max', age: 27 })
          done()
        })
      })
    })

    describe('set', function () {

      it('sets Object with specified key', function () {
        var new_doc = { key: 'new_key', name: 'Foo', age: null }

        store.set(new_doc)
        console.log(data)

        expect(store.get(new_doc.key)).to.eql(new_doc)
      })

      it('increases the length of the store by 1', function () {
        var new_doc = { key: 'new_key', name: 'Foo', age: null }

        store.set(new_doc)
        console.log(data)

        expect(store.length()).to.eql(4)
      })
    })

    describe('del', function () {

      it('deletes Object with specified key', function () {
        console.log(data)

        store.del('002')
        expect(store.get('002')).to.be.undefined
      })


      it('decreases the length of the store by 1', function () {
        console.log(data)

        store.del('002')
        expect(store.length()).to.eql(2)
      })
    })
  })
})
