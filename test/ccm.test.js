const expect = chai.expect;

describe('CCM', function () {

  describe('current version number', function (){

    it('is 16.3.3', function (){
      expect(ccm.version()).to.eql('16.3.3')
    })
  })
})
