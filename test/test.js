
const expect = chai.expect;

describe('First Spec', function () {

  it('fails instantly', function (){

    expect(2).to.equal(1)
  })

  it('is successful', function (){

    expect(2).to.eql(2)
  })
})
