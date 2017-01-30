/**
 * @overview not <i>ccm</i> framework relevant helper functions for <i>ccm</i> component developers
 * @author André Kless <andre.kless@web.de> 2016
 * @license The MIT License (MIT)
 */

ccm.helper.integrate( {

  /**
   * @summary removes all keys in an object that have falsy values
   * @param {object} obj - object
   * @returns {object} cleaned object (not cloned)
   * @example
   * // example with using return value
   * var obj = ccm.helper.cleanObject( { foo: '', bar: false, baz: null, test: undefined, i: 0, abc: 'xyz' } );
   * console.log( obj );  // => { abc: 'xyz' }
   * @example
   * // example without using return value
   * var obj = { foo: '', bar: false, baz: null, test: undefined, i: 0, abc: 'xyz' }
   * ccm.helper.cleanObject( obj );
   * console.log( obj );  // => { abc: 'xyz' }
   */
  cleanObject: function ( obj ) {

    for ( var key in obj )
      if ( !obj[ key ] )
        delete obj[ key ];
    return obj;

  },

  /**
   * @summary converts dot notations in object keys to deeper properties
   * @param {object} obj - contains object keys in dot notation
   * @returns {object} object with converted object keys
   * @example
   * var obj = { test: 123, 'foo.bar': 'abc', 'foo.baz': 'xyz' };
   * var result = ccm.helper.convertObjectKeys( obj );
   * console.log( result );  // => { test: 123, foo: { bar: 'abc', baz: 'xyz' } }
   */
  convertObjectKeys: function ( obj ) {

    var keys = Object.keys( obj );
    keys.map( function ( key ) {
      if ( key.indexOf( '.' ) !== -1 ) {
        ccm.helper.deepValue( obj, key, obj[ key ] );
        delete obj[ key ];
      }
    } );
    return obj;

  },

  /**
   * @summary gets the input data of a HTML form
   * @param {ccm.types.element} form - HTML element of the HTML form
   * @returns {object} input data
   * @example
   * var result = ccm.helper.formData( document.getElementsById( 'form_id' ) );
   * console.log( result );  // { username: 'JohnDoe', password: '1aA' }
   */
  formData: function ( form ) {

    var data = {};
    var iterator = new FormData( form ).entries();
    var pair;
    while ( pair = iterator.next().value )
      data[ pair[ 0 ] ] = pair[ 1 ];
    return data;

  },

  /**
   * @summary returns a <i>ccm</i> loading icon as HTML node element
   * @types {ccm.types.node}
   * @example document.body.appendChild( ccm.helper.loading() );
   */
  loading: function () {
    return ccm.helper.html( { class: 'ccm_loading', inner: { style: 'display: inline-block; width: 0.5em; height: 0.5em; border: 0.15em solid #009ee0; border-right-color: transparent; border-radius: 50%; animation: ccm_loading 1s linear infinite;' } } );
  },

  /**
   * @summary set the content of an HTML element
   * @param {ccm.types.element} element - HTML element
   * @param {string|ccm.types.element|ccm.types.element[]} content - HTML element or HTML string for content
   */
  setContent: function ( element, content ) {

    if ( typeof content === 'object' ) {
      element.innerHTML = '';
      if ( Array.isArray( content ) )
        content.map( function ( node ) { element.appendChild( node ); } );
      else
        element.appendChild( content );
    }
    else element.innerHTML = content;

  },

  /**
   * @summary performs a function after a waiting time
   * @param {number} time - waiting time in milliseconds
   * @param {function} callback - performed function after waiting time
   * @example ccm.helper.wait( 1000, function () { console.log( 'I was called after 1 second' ) } );
   */
  wait: function ( time, callback ) {
    window.setTimeout( callback, time );
  }

}, ccm.helper );