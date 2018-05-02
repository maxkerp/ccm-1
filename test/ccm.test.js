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

  // TODO: Update examples according to Orbit Store
  // After that use a ccm.store (local store).
  describe('Object Store', function () {
    var store;

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

        expect(store.get(new_doc.key)).to.eql(new_doc)
      })

      it('increases the length of the store by 1', function () {
        var new_doc = { key: 'new_key', name: 'Foo', age: null }

        store.set(new_doc)

        expect(store.length()).to.eql(4)
      })
    })

    describe('del', function () {

      it('deletes Object with specified key', function () {

        store.del('002')
        expect(store.get('002')).to.be.undefined
      })

      it('decreases the length of the store by 1', function () {

        store.del('002')
        expect(store.length()).to.eql(2)
      })
    })
  })

  describe('Orbit Store', function () {
    var store;
    window.testStores = [];

    before(function (done){

      // Wait for the orbit module to be initialized
      CCM.Orbit.init(function (handle){

        done();
      })
    })

    beforeEach(function (done) {

      CCM.Orbit.create({name: `test_store_${Date.now()}`}, function (test_store) {
        put("Before each operation", test_store.docs.dbname)
        window.testStores.push(test_store);
        store = test_store

        done();
      })
    }) 

    describe('get', function (done) {
      // Use a new key every time, otherwise we're not adding a
      // new document
      var doc = { key: Date.now(), name: 'max', age: 27, operation: 'get' };

      beforeEach(function (done) {

        store.set(doc, function (doc) {
          done();
        });
      })

      it('returns value for specified key', function (done) {

        store.get(doc.key, function (val) {

          try {

            expect(val).to.eql(doc);
            done()
          } catch (err) {

            done(err)
          }
        })
      })
    })

    describe('set', function (done) {
      // Use a new key every time, otherwise we're not adding a
      // new document
      var new_doc = { key: Date.now(), name: 'max', age: 27, operation: 'set' };

      it('sets Object with specified key', function (done) {

        store.set(new_doc, function (set_result) {

          try {

            expect(set_result).to.equal(new_doc)
          } catch (err) {
            done(err)
          }

          store.get(set_result.key, function(get_result) {

            try {

              expect(get_result).to.equal(set_result)
              done()
            } catch (err) {
              done(err)
            }

          })
        })
      })

      it('increases the length of the store by 1', function (done) {
        var length_before = store.length();

        store.set(new_doc, function (set_result) {
          length_after = store.length()

          try {

            expect(length_after).to.equal(length_before + 1)
            done()
          } catch (err) {
            done(err)
          }
        })
      })

      it('returns error if something went wrong')
    })

    describe('del', function () {
      // Use a new key every time, otherwise we're not adding a
      // new document
      var doc = { key: Date.now(), name: 'max', age: 27, operation: 'del' };

      beforeEach(function (done) {

        store.set(doc, function (doc) {
          done();
        });
      })

      it('deletes Object with specified key', function (done) {

        store.del(doc.key, function () {

          try {

            expect(store.get(doc.key)).to.be.undefined
            done();
          } catch (err) {

            done(err)
          }
        })
      })

      it('decreases the length of the store by 1', function (done) {
        var length_before = store.length(),
            length_after;

        store.del(doc.key, function (deleted_doc) {
          length_after = store.length()

          try {

            expect(length_after).to.equal(length_before - 1)
            done()
          } catch (err) {
            done(err)
          }

        })
      })
    })
  })
})
